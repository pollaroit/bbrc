import type { Database } from "@bbrc/db";
import {
	ACHIEVEMENT_CATEGORY_LABELS,
	ACHIEVEMENTS,
	getAchievement,
	memberLevelsForPoints,
	rankOf,
	type StatsRank,
	topPercent,
	type Viewer,
} from "@bbrc/shared";
import { listGoalsByUsername } from "../goal/goal.service";
import type {
	MemberStatsClubLifeOutput,
	MemberStatsInput,
} from "./member-stats.schema";
import { loadMemberStatsContext } from "./member-stats-context";
import { createdAtRangeOfBounds } from "./member-stats-helpers";

const withPercent = (rank: StatsRank | null) =>
	rank ? { ...rank, topPercent: topPercent(rank) } : null;

export async function getMemberStatsClubLife(
	db: Database,
	viewer: Viewer,
	input: MemberStatsInput,
): Promise<MemberStatsClubLifeOutput> {
	const ctx = await loadMemberStatsContext(db, input, viewer);
	const { access, period, bounds, hasTimeAxis } = ctx;
	const userId = ctx.member.id;
	const isOwner = ctx.viewer.kind === "member" && ctx.viewer.userId === userId;

	const range =
		hasTimeAxis && period.type !== "life"
			? { createdAt: createdAtRangeOfBounds(bounds) }
			: {};

	const [
		participations,
		completedByMember,
		votes,
		booksAdded,
		booksRequested,
		goals,
		awards,
		allAwards,
		memberCount,
		points,
	] = await Promise.all([
		db.participation.findMany({
			where: {
				userId,
				OR: [{ removedAt: null }, { progress: "dnf" }],
				...range,
			},
			select: { progress: true },
		}),
		db.participation.groupBy({
			by: ["userId"],
			where: { progress: "completed", ...range },
			_count: { _all: true },
		}),
		db.pollVote.findMany({
			where: { userId, ...range },
			select: {
				option: {
					select: {
						bookId: true,
						poll: { select: { sitting: { select: { selectedBookId: true } } } },
					},
				},
			},
		}),
		db.book.count({ where: { approvedById: userId, ...range } }),
		db.book.count({ where: { requestedById: userId, ...range } }),
		access.goals
			? listGoalsByUsername(ctx.member.username, viewer, db)
			: Promise.resolve(null),
		db.userAchievement.findMany({
			where: { userId, revokedAt: null },
			orderBy: { earnedAt: "desc" },
			select: { achievementKey: true, tier: true, earnedAt: true },
		}),
		// Distinct holders of each achievement: how rare one is, and how many each member has.
		db.userAchievement.findMany({
			where: { revokedAt: null },
			distinct: ["userId", "achievementKey"],
			select: { userId: true, achievementKey: true },
		}),
		db.user.count(),
		db.user.findMany({ select: { id: true, xp: true, rp: true } }),
	]);

	const count = (progress: string) =>
		participations.filter((row) => row.progress === progress).length;
	const completed = count("completed");
	const didNotFinish = count("dnf");
	const finished = completed + didNotFinish;

	// A vote "won" when the sitting it was cast in went on to pick that book.
	const votesThatWon = votes.filter(
		(vote) =>
			vote.option.poll.sitting?.selectedBookId != null &&
			vote.option.poll.sitting.selectedBookId === vote.option.bookId,
	).length;

	// Hidden achievements are not listed until the member earns them, and a viewer who is not
	// the member does not learn of them either.
	const earnedKeys = new Set<string>();
	const known = awards.filter((award) => {
		const definition = getAchievement(award.achievementKey);
		if (!definition) return false;
		if (definition.isHidden && !isOwner) return false;
		earnedKeys.add(award.achievementKey);
		return true;
	});

	const holders = new Map<string, number>();
	const perMember = new Map<string, number>();
	for (const row of allAwards) {
		holders.set(row.achievementKey, (holders.get(row.achievementKey) ?? 0) + 1);
		perMember.set(row.userId, (perMember.get(row.userId) ?? 0) + 1);
	}

	const categories = new Map<string, number>();
	for (const key of earnedKeys) {
		const category = getAchievement(key)!.category;
		categories.set(category, (categories.get(category) ?? 0) + 1);
	}

	const levels = memberLevelsForPoints(
		points.find((row) => row.id === userId)?.xp ?? 0,
		points.find((row) => row.id === userId)?.rp ?? 0,
	);
	const me = points.find((row) => row.id === userId);

	return {
		access,
		sittings: {
			joined: participations.length,
			completed,
			didNotFinish,
			inProgress: count("in_progress"),
			completionRate:
				finished > 0 ? Math.round((completed / finished) * 100) : null,
			votesCast: votes.length,
			votesThatWon,
			booksAdded,
			booksRequested,
			progress: [
				{ label: "Finished", count: completed },
				{ label: "Reading", count: count("in_progress") },
				{ label: "Did not finish", count: didNotFinish },
				{ label: "Not started", count: count("not_started") },
			],
			rank: withPercent(
				rankOf(
					completed,
					completedByMember.map((group) => group._count._all),
				),
			),
		},
		goals:
			goals && !("hidden" in goals && goals.hidden)
				? {
						total: goals.items.length,
						completed: goals.items.filter((item) => item.isComplete).length,
						active: goals.active.slice(0, 5).map((item) => ({
							slug: item.slug,
							title: item.title,
							year: item.year,
							current: item.current,
							target: item.target,
							percent: Math.min(
								100,
								Math.round((item.current / item.target) * 100),
							),
						})),
					}
				: null,
		achievements: {
			earned: earnedKeys.size,
			total: ACHIEVEMENTS.filter((definition) => !definition.isHidden).length,
			recent: known.slice(0, 5).map((award) => {
				const definition = getAchievement(award.achievementKey)!;
				return {
					key: definition.key,
					slug: definition.slug,
					name: definition.name,
					tier: award.tier,
					earnedAt: award.earnedAt,
				};
			}),
			rarest: [...earnedKeys]
				.map((key) => ({
					definition: getAchievement(key)!,
					earnedBy: holders.get(key) ?? 1,
				}))
				.sort(
					(a, b) =>
						a.earnedBy - b.earnedBy ||
						a.definition.name.localeCompare(b.definition.name),
				)
				.slice(0, 3)
				.map((row) => ({
					slug: row.definition.slug,
					name: row.definition.name,
					earnedBy: row.earnedBy,
					members: memberCount,
				})),
			byCategory: [...categories.entries()].map(([category, value]) => ({
				label:
					ACHIEVEMENT_CATEGORY_LABELS[
						category as keyof typeof ACHIEVEMENT_CATEGORY_LABELS
					] ?? category,
				count: value,
			})),
			rank: withPercent(rankOf(earnedKeys.size, [...perMember.values()])),
		},
		standing: {
			xp: me?.xp ?? 0,
			rp: me?.rp ?? 0,
			xpLevel: levels.xpLevel.label,
			rpLevel: levels.rpLevel.label,
			xpRank: withPercent(
				rankOf(
					me?.xp ?? 0,
					points.map((row) => row.xp),
				),
			),
			rpRank: withPercent(
				rankOf(
					me?.rp ?? 0,
					points.map((row) => row.rp),
				),
			),
		},
	};
}
