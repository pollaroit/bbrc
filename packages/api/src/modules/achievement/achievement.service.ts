import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";
import {
	ACHIEVEMENTS,
	type AchievementDefinition,
	achievementProgress,
	describeTier,
	evaluateAchievements,
	FACT_SECTIONS,
	type FactSection,
	getAchievement,
	tierName,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { dispatchNotification } from "../notification/notification.service";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import type {
	AchievementSummary,
	GetAchievementOutput,
	GetUserAchievementsOutput,
	ListAchievementsOutput,
} from "./achievement.schema";
import { loadAchievementFacts } from "./achievement-facts.service";

/** Awards reached longer ago than this are saved quietly (backfill), without a bell notification. */
const NOTIFY_WITHIN_MS = 3 * 24 * 60 * 60 * 1000;
const SHOWCASE_SLOTS = 4;
const RECENT_EARNERS = 12;

const ALL_SECTIONS = new Set<FactSection>(FACT_SECTIONS);

function tiersOf(definition: AchievementDefinition) {
	return definition.thresholds.map((threshold, index) => ({
		tier: index + 1,
		name: tierName(definition, index + 1),
		threshold,
		description: describeTier(definition, index + 1),
	}));
}

/**
 * Re-checks a member's achievements and saves any newly reached tiers.
 * Awards are sticky and revoked ones are never re-awarded. Pass `sections`
 * after an action to look only at what it could have changed.
 */
export async function evaluateAchievementsForUser(
	db: Database,
	userId: string,
	options: { sections?: readonly FactSection[]; now?: Date } = {},
): Promise<{ key: string; tier: number }[]> {
	const now = options.now ?? new Date();
	const sections = options.sections?.length
		? new Set(options.sections)
		: ALL_SECTIONS;

	const facts = await loadAchievementFacts(db, userId, sections, now);
	if (!facts) {
		return [];
	}

	const earned = evaluateAchievements(facts, {
		sections: options.sections?.length ? options.sections : undefined,
	});
	if (earned.length === 0) {
		return [];
	}

	const existing = await db.userAchievement.findMany({
		where: { userId },
		select: { achievementKey: true, tier: true, periodKey: true },
	});
	const have = new Set(
		existing.map((row) => `${row.achievementKey}|${row.tier}|${row.periodKey}`),
	);
	const fresh = earned.filter(
		(item) => !have.has(`${item.key}|${item.tier}|${item.periodKey}`),
	);
	if (fresh.length === 0) {
		return [];
	}

	await db.userAchievement.createMany({
		data: fresh.map((item) => ({
			userId,
			achievementKey: item.key,
			tier: item.tier,
			periodKey: item.periodKey,
			earnedAt: item.earnedAt,
		})),
		skipDuplicates: true,
	});

	const recent = fresh.filter(
		(item) => now.getTime() - item.earnedAt.getTime() <= NOTIFY_WITHIN_MS,
	);
	if (recent.length > 0) {
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { username: true },
		});
		for (const item of recent) {
			const definition = getAchievement(item.key);
			if (!definition || !user) {
				continue;
			}
			const label = tierName(definition, item.tier);
			const year = item.periodKey ? ` ${item.periodKey}` : "";
			await dispatchNotification(db, {
				kind: "achievement_earned",
				recipientUserIds: [userId],
				title: "Achievement unlocked",
				body: `${definition.name}${label ? ` · ${label}` : ""}${year}`,
				href: `/users/${user.username}/achievements`,
			});
		}
	}

	return fresh.map((item) => ({ key: item.key, tier: item.tier }));
}

/** Daily sweep for achievements that depend on time or on other members (anniversaries, likes, year ends, approvals). */
export async function sweepAchievements(
	db: Database,
): Promise<{ members: number; awarded: number }> {
	const users = await db.user.findMany({
		where: { status: { not: "banned" } },
		select: { id: true },
		orderBy: { createdAt: "asc" },
	});

	let awarded = 0;
	for (const user of users) {
		try {
			awarded += (await evaluateAchievementsForUser(db, user.id)).length;
		} catch (error) {
			console.error("Achievement sweep failed for a member", error);
		}
	}
	return { members: users.length, awarded };
}

async function earnedCountsByTier(db: Database) {
	// A member who earned a yearly achievement in several years counts once per tier.
	const distinct = await db.userAchievement.findMany({
		where: { revokedAt: null, user: visibleOnSiteUserWhere },
		select: { userId: true, achievementKey: true, tier: true },
		distinct: ["userId", "achievementKey", "tier"],
	});
	const counts = new Map<string, number>();
	for (const row of distinct) {
		const id = `${row.achievementKey}|${row.tier}`;
		counts.set(id, (counts.get(id) ?? 0) + 1);
	}
	return counts;
}

async function viewerState(
	db: Database,
	userId: string,
): Promise<Map<string, NonNullable<AchievementSummary["viewer"]>>> {
	const [facts, awards] = await Promise.all([
		loadAchievementFacts(db, userId, ALL_SECTIONS),
		db.userAchievement.findMany({
			where: { userId, revokedAt: null },
			select: { achievementKey: true, tier: true, earnedAt: true },
			orderBy: { earnedAt: "asc" },
		}),
	]);

	const progress = facts ? achievementProgress(facts) : [];
	const state = new Map<string, NonNullable<AchievementSummary["viewer"]>>();

	for (const item of progress) {
		state.set(item.key, {
			tier: 0,
			value: item.value,
			next: item.next,
			earnedAtByTier: {},
		});
	}
	for (const award of awards) {
		const current = state.get(award.achievementKey) ?? {
			tier: 0,
			value: 0,
			next: null,
			earnedAtByTier: {},
		};
		current.tier = Math.max(current.tier, award.tier);
		const existing = current.earnedAtByTier[String(award.tier)];
		if (!existing || existing > award.earnedAt.toISOString()) {
			current.earnedAtByTier[String(award.tier)] = award.earnedAt.toISOString();
		}
		state.set(award.achievementKey, current);
	}
	return state;
}

function summarize(
	definition: AchievementDefinition,
	counts: Map<string, number>,
	viewer: AchievementSummary["viewer"],
): AchievementSummary {
	return {
		key: definition.key,
		slug: definition.slug,
		name: definition.name,
		category: definition.category,
		icon: definition.icon,
		isHidden: Boolean(definition.isHidden),
		isYearly: definition.period === "year",
		tiers: tiersOf(definition).map((tier) => ({
			...tier,
			earnedBy: counts.get(`${definition.key}|${tier.tier}`) ?? 0,
		})),
		viewer,
	};
}

export async function listAchievements(
	db: Database,
	session: Session | null,
): Promise<ListAchievementsOutput> {
	const viewerId = session?.user.id;
	const [counts, memberCount, viewer] = await Promise.all([
		earnedCountsByTier(db),
		db.user.count({ where: visibleOnSiteUserWhere }),
		viewerId ? viewerState(db, viewerId) : Promise.resolve(null),
	]);

	let hiddenRemaining = 0;
	const items: AchievementSummary[] = [];
	for (const definition of ACHIEVEMENTS) {
		const mine = viewer?.get(definition.key) ?? null;
		if (definition.isHidden && (mine?.tier ?? 0) === 0) {
			hiddenRemaining += 1;
			continue;
		}
		items.push(summarize(definition, counts, mine));
	}

	return { memberCount, hiddenRemaining, items };
}

export async function getAchievementBySlug(
	db: Database,
	slug: string,
	session: Session | null,
): Promise<GetAchievementOutput> {
	const definition = ACHIEVEMENTS.find((item) => item.slug === slug);
	if (!definition) {
		throw new ORPCError("NOT_FOUND", { message: "Achievement not found" });
	}

	const viewerId = session?.user.id;
	const [counts, memberCount, viewer, earners] = await Promise.all([
		earnedCountsByTier(db),
		db.user.count({ where: visibleOnSiteUserWhere }),
		viewerId ? viewerState(db, viewerId) : Promise.resolve(null),
		db.userAchievement.findMany({
			where: {
				achievementKey: definition.key,
				revokedAt: null,
				user: visibleOnSiteUserWhere,
			},
			orderBy: { earnedAt: "desc" },
			take: RECENT_EARNERS * 4,
			select: {
				tier: true,
				periodKey: true,
				earnedAt: true,
				user: { select: { username: true, name: true, image: true } },
			},
		}),
	]);

	const mine = viewer?.get(definition.key) ?? null;
	if (
		definition.isHidden &&
		(mine?.tier ?? 0) === 0 &&
		!session?.user.isAdmin
	) {
		throw new ORPCError("NOT_FOUND", { message: "Achievement not found" });
	}

	// One row per member: their highest tier, newest first.
	const seen = new Set<string>();
	const recentEarners = earners
		.sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime())
		.filter((row) => {
			if (seen.has(row.user.username)) return false;
			seen.add(row.user.username);
			return true;
		})
		.slice(0, RECENT_EARNERS)
		.map((row) => ({
			username: row.user.username,
			name: row.user.name,
			image: row.user.image,
			tier: Math.max(
				...earners
					.filter((other) => other.user.username === row.user.username)
					.map((other) => other.tier),
			),
			periodKey: row.periodKey,
			earnedAt: row.earnedAt.toISOString(),
		}));

	return {
		...summarize(definition, counts, mine),
		memberCount,
		description: describeTier(definition, 1),
		recentEarners,
	};
}

export async function getUserAchievements(
	db: Database,
	username: string,
	session: Session | null,
): Promise<GetUserAchievementsOutput> {
	const user = await db.user.findUnique({
		where: { username },
		select: { id: true, isHidden: true },
	});
	const viewerId = session?.user.id;
	const isOwner = Boolean(user && viewerId === user.id);
	if (!user || (user.isHidden && !isOwner && !session?.user.isAdmin)) {
		throw new ORPCError("NOT_FOUND", { message: "Member not found" });
	}

	const awards = await db.userAchievement.findMany({
		where: { userId: user.id, revokedAt: null },
		orderBy: { earnedAt: "desc" },
		select: {
			id: true,
			achievementKey: true,
			tier: true,
			periodKey: true,
			earnedAt: true,
			pinOrder: true,
		},
	});
	const known = awards.filter((award) => getAchievement(award.achievementKey));
	const earnedKeys = new Set(known.map((award) => award.achievementKey));

	let progress: GetUserAchievementsOutput["progress"] = [];
	if (isOwner) {
		const facts = await loadAchievementFacts(db, user.id, ALL_SECTIONS);
		progress = facts
			? achievementProgress(facts).filter((item) => {
					const definition = getAchievement(item.key);
					return (
						definition != null &&
						item.value > 0 &&
						item.next != null &&
						!(definition.isHidden && !earnedKeys.has(item.key))
					);
				})
			: [];
	}

	const hiddenRemaining = ACHIEVEMENTS.filter(
		(definition) => definition.isHidden && !earnedKeys.has(definition.key),
	).length;

	return {
		username,
		isOwner,
		// Hidden ones only count once found, so "earned of total" never exceeds 100%.
		totalAchievements:
			ACHIEVEMENTS.filter((item) => !item.isHidden).length +
			ACHIEVEMENTS.filter((item) => item.isHidden && earnedKeys.has(item.key))
				.length,
		earnedCount: earnedKeys.size,
		hiddenRemaining,
		awards: known.map((award) => ({
			id: award.id,
			key: award.achievementKey,
			tier: award.tier,
			periodKey: award.periodKey,
			earnedAt: award.earnedAt.toISOString(),
			pinOrder: award.pinOrder,
		})),
		progress,
	};
}

export async function setShowcase(
	db: Database,
	userId: string,
	awardIds: string[],
): Promise<void> {
	const unique = [...new Set(awardIds)].slice(0, SHOWCASE_SLOTS);
	const owned = await db.userAchievement.findMany({
		where: { userId, id: { in: unique }, revokedAt: null },
		select: { id: true },
	});
	if (owned.length !== unique.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You can only pin achievements you have earned.",
		});
	}

	await db.$transaction([
		db.userAchievement.updateMany({
			where: { userId, pinOrder: { not: null } },
			data: { pinOrder: null },
		}),
		...unique.map((id, index) =>
			db.userAchievement.update({
				where: { id },
				data: { pinOrder: index },
				select: { id: true },
			}),
		),
	]);
}

export async function revokeAchievement(
	db: Database,
	awardId: string,
	reason: string | undefined,
): Promise<void> {
	const award = await db.userAchievement.findUnique({
		where: { id: awardId },
		select: { id: true },
	});
	if (!award) {
		throw new ORPCError("NOT_FOUND", { message: "Award not found" });
	}
	await db.userAchievement.update({
		where: { id: awardId },
		data: {
			revokedAt: new Date(),
			revokedReason: reason ?? null,
			pinOrder: null,
		},
		select: { id: true },
	});
}

/** Achievements earned per member (distinct achievements), for sorting the People page. */
export async function loadAchievementCounts(
	db: Database,
	userIds: string[],
): Promise<Map<string, number>> {
	const rows = await db.userAchievement.findMany({
		where: { userId: { in: userIds }, revokedAt: null },
		select: { userId: true, achievementKey: true },
		distinct: ["userId", "achievementKey"],
	});
	const counts = new Map<string, number>();
	for (const row of rows) {
		counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
	}
	return counts;
}

/** After a sitting changes phase, re-check everyone who took part in it or voted in its poll. */
export async function evaluateSittingMembersAchievements(
	db: Database,
	sittingSlug: string,
): Promise<void> {
	const sitting = await db.sitting.findUnique({
		where: { slug: sittingSlug },
		select: {
			participants: { where: { removedAt: null }, select: { userId: true } },
			poll: {
				select: {
					options: {
						select: { votes: { select: { userId: true } } },
					},
				},
			},
		},
	});
	if (!sitting) {
		return;
	}

	const userIds = new Set<string>(
		sitting.participants.map((participant) => participant.userId),
	);
	for (const option of sitting.poll?.options ?? []) {
		for (const vote of option.votes) {
			userIds.add(vote.userId);
		}
	}

	for (const userId of userIds) {
		try {
			await evaluateAchievementsForUser(db, userId, {
				sections: ["sittings", "votes"],
			});
		} catch (error) {
			console.error("Achievement check failed for a sitting member", error);
		}
	}
}
