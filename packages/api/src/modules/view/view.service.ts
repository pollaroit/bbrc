import type { Database } from "@bbrc/db";
import {
	isBotUserAgent,
	milestonesCrossed,
	parseUserAgent,
	resolveClubTimeZone,
	richContentPreview,
	VIEW_BATCH_MAX,
	VIEW_DEDUPE_MS,
	VIEW_HOURLY_LIMIT,
	type ViewKindName,
	type ViewResourceKind,
} from "@bbrc/shared";
import { evaluateAchievementsForUser } from "../achievement/achievement.service";
import { dispatchNotification } from "../notification/notification.service";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import type { RecordViewItem } from "./view.schema";

export type ViewActor = {
	userId: string | null;
	/** Cookie id, or a hash of IP and user agent when cookies are off. */
	visitorId: string;
	ip: string | null;
	userAgent: string | null;
	country: string | null;
	/** Host of the page that linked here, when it was another website. */
	referrerHost: string | null;
};

type Target = {
	resource: ViewResourceKind;
	id: string;
	ref: string;
	/** The member who made it; looking at your own thing does not count. */
	ownerId: string | null;
};

export type RecordViewsResult = {
	recorded: number;
	skipped: "bot" | "limit" | null;
};

/** What the item is called in a notification, and where its insights live. */
export type ViewTargetInfo = {
	createdAt: Date | null;
	title: string;
	href: string;
	insightsHref: string;
	ownerId: string | null;
	collaboratorIds: string[];
};

const keyOf = (resource: string, id: string, kind: string) =>
	`${resource}|${id}|${kind}`;

function clubDay(date = new Date()) {
	// `YYYY-MM-DD` in the club's time zone (en-CA prints year-month-day).
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: resolveClubTimeZone(),
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

export async function countBotRequest(db: Database) {
	try {
		await db.$executeRaw`
			INSERT INTO view_bot_day (day, count)
			VALUES (${clubDay()}::date, 1)
			ON CONFLICT (day) DO UPDATE SET count = view_bot_day.count + 1`;
	} catch (error) {
		console.error("bot count failed", error);
	}
}

/** Turns public names into real items, dropping anything that cannot be viewed. */
async function resolveTargets(
	db: Database,
	items: RecordViewItem[],
): Promise<Map<string, Target>> {
	const byResource = new Map<ViewResourceKind, Set<string>>();
	for (const item of items) {
		const refs = byResource.get(item.resource) ?? new Set<string>();
		refs.add(item.ref);
		byResource.set(item.resource, refs);
	}
	const found = new Map<string, Target>();
	const add = (target: Target) =>
		found.set(`${target.resource}|${target.ref}`, target);

	await Promise.all(
		[...byResource.entries()].map(async ([resource, refSet]) => {
			const refs = [...refSet];
			if (resource === "book") {
				const rows = await db_book(db, refs);
				for (const row of rows) {
					add({ resource, id: row.id, ref: row.slug, ownerId: null });
				}
			} else if (resource === "post") {
				const rows = await db.post.findMany({
					where: { slug: { in: refs } },
					select: { id: true, slug: true, authorId: true },
				});
				for (const row of rows) {
					add({ resource, id: row.id, ref: row.slug, ownerId: row.authorId });
				}
			} else if (resource === "review") {
				const rows = await db.feedback.findMany({
					where: { slug: { in: refs } },
					select: { id: true, slug: true, authorId: true },
				});
				for (const row of rows) {
					add({ resource, id: row.id, ref: row.slug, ownerId: row.authorId });
				}
			} else if (resource === "user") {
				const rows = await db.user.findMany({
					where: {
						username: { in: refs },
						...visibleOnSiteUserWhere,
						status: { not: "banned" },
					},
					select: { id: true, username: true },
				});
				for (const row of rows) {
					add({ resource, id: row.id, ref: row.username, ownerId: row.id });
				}
			} else {
				const pairs = refs
					.map((ref) => ref.split("/"))
					.filter((parts): parts is [string, string] => parts.length === 2)
					.map(([username, slug]) => ({ username, slug }));
				if (pairs.length === 0) return;
				const rows = await db.shelf.findMany({
					where: {
						status: "active",
						// Private shelves are never tracked.
						visibility: "public",
						OR: pairs.map(({ username, slug }) => ({
							slug,
							user: { username },
						})),
					},
					select: {
						id: true,
						slug: true,
						userId: true,
						user: { select: { username: true } },
					},
				});
				for (const row of rows) {
					add({
						resource,
						id: row.id,
						ref: `${row.user.username}/${row.slug}`,
						ownerId: row.userId,
					});
				}
			}
		}),
	);
	return found;
}

function db_book(db: Database, slugs: string[]) {
	return db.book.findMany({
		where: { slug: { in: slugs } },
		select: { id: true, slug: true },
	});
}

/**
 * Records a batch of views from one browser. Bots are dropped, the same viewer
 * counts once per item and kind per 30 minutes, and the owner's own views are
 * stored but flagged so they never reach the numbers.
 */
export async function recordViews(
	db: Database,
	actor: ViewActor,
	rawItems: RecordViewItem[],
): Promise<RecordViewsResult> {
	if (isBotUserAgent(actor.userAgent)) {
		await countBotRequest(db);
		return { recorded: 0, skipped: "bot" };
	}

	// Same item twice in one batch is one view.
	const seenInBatch = new Set<string>();
	const items = rawItems.slice(0, VIEW_BATCH_MAX).filter((item) => {
		const key = `${item.resource}|${item.ref}|${item.kind}`;
		if (seenInBatch.has(key)) return false;
		seenInBatch.add(key);
		return true;
	});
	if (items.length === 0) return { recorded: 0, skipped: null };

	const now = new Date();
	const viewerMatch = [
		...(actor.userId ? [{ viewerUserId: actor.userId }] : []),
		{ visitorId: actor.visitorId },
	];

	const [sentLastHour, recent, targets] = await Promise.all([
		db.view.count({
			where: {
				OR: viewerMatch,
				createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) },
			},
		}),
		db.view.findMany({
			where: {
				OR: viewerMatch,
				createdAt: { gt: new Date(now.getTime() - VIEW_DEDUPE_MS) },
			},
			select: { resource: true, resourceId: true, kind: true },
		}),
		resolveTargets(db, items),
	]);
	if (sentLastHour >= VIEW_HOURLY_LIMIT) {
		return { recorded: 0, skipped: "limit" };
	}

	const already = new Set(
		recent.map((row) => keyOf(row.resource, row.resourceId, row.kind)),
	);
	const device = parseUserAgent(actor.userAgent);
	const userAgent = actor.userAgent?.slice(0, 400) ?? null;

	const fresh: { target: Target; item: RecordViewItem }[] = [];
	for (const item of items) {
		const target = targets.get(`${item.resource}|${item.ref}`);
		if (!target) continue;
		if (already.has(keyOf(target.resource, target.id, item.kind))) continue;
		fresh.push({ target, item });
	}
	if (fresh.length === 0) return { recorded: 0, skipped: null };

	await db.view.createMany({
		data: fresh.map(({ target, item }) => ({
			createdAt: now,
			resource: target.resource,
			resourceId: target.id,
			kind: item.kind,
			source: item.source,
			viewerUserId: actor.userId,
			visitorId: actor.visitorId,
			isOwner: actor.userId != null && target.ownerId === actor.userId,
			ip: actor.ip,
			userAgent,
			country: actor.country,
			device: device.device,
			browser: device.browser,
			os: device.os,
			referrerHost: actor.referrerHost,
		})),
	});

	const counted = fresh.filter(
		({ target }) => !(actor.userId != null && target.ownerId === actor.userId),
	);
	await Promise.all(
		counted.map(async ({ target, item }) => {
			try {
				const opened = item.kind === "detail" ? 1 : 0;
				const listed = item.kind === "list" ? 1 : 0;
				const rows = await db.$queryRaw<{ opens: number }[]>`
					INSERT INTO view_total (resource, resource_id, opens, impressions, updated_at)
					VALUES (${target.resource}::"view_resource", ${target.id}, ${opened}, ${listed}, now())
					ON CONFLICT (resource, resource_id) DO UPDATE
					SET opens = view_total.opens + ${opened},
						impressions = view_total.impressions + ${listed},
						updated_at = now()
					RETURNING opens`;
				let newViewer = false;
				if (item.kind === "detail") {
					if (actor.userId) {
						const seen = await db.$queryRaw<{ inserted: boolean }[]>`
							INSERT INTO viewer_seen (resource, resource_id, user_id, first_seen_at, last_seen_at, views)
							VALUES (${target.resource}::"view_resource", ${target.id}, ${actor.userId}, ${now}, ${now}, 1)
							ON CONFLICT (resource, resource_id, user_id) DO UPDATE
							SET last_seen_at = ${now}, views = viewer_seen.views + 1
							RETURNING (xmax = 0) AS inserted`;
						newViewer = seen[0]?.inserted === true;
					} else {
						// The row just written is the only one when this guest is new.
						const earlier = await db.view.count({
							where: {
								resource: target.resource,
								resourceId: target.id,
								kind: "detail",
								visitorId: actor.visitorId,
								viewerUserId: null,
								isOwner: false,
							},
						});
						newViewer = earlier <= 1;
					}
				}
				const viewers = newViewer ? 1 : 0;
				if (viewers > 0) {
					await db.$executeRaw`
						UPDATE view_total SET viewers = viewers + 1
						WHERE resource = ${target.resource}::"view_resource" AND resource_id = ${target.id}`;
				}
				// Books and shelves keep a copy so their lists can sort by it.
				if (opened > 0 || viewers > 0) {
					if (target.resource === "book") {
						await db.$executeRaw`
							UPDATE book SET view_count = view_count + ${opened}, viewer_count = viewer_count + ${viewers}
							WHERE id = ${target.id}`;
					} else if (target.resource === "shelf") {
						await db.$executeRaw`
							UPDATE shelf SET view_count = view_count + ${opened}, viewer_count = viewer_count + ${viewers}
							WHERE id = ${target.id}`;
					}
				}
				const after = rows[0]?.opens ?? 0;
				if (opened > 0 && target.ownerId) {
					for (const mark of milestonesCrossed(after - opened, after)) {
						await notifyMilestone(db, target, mark);
					}
				}
			} catch (error) {
				console.error("view totals failed", error);
			}
		}),
	);

	return { recorded: fresh.length, skipped: null };
}

/** Who made the item, what it is called, and where its insights page is. */
export async function describeViewTarget(
	db: Database,
	resource: ViewResourceKind,
	ref: string,
): Promise<(ViewTargetInfo & { id: string }) | null> {
	if (resource === "book") {
		const row = await db.book.findUnique({
			where: { slug: ref },
			select: { id: true, slug: true, title: true },
		});
		return row
			? {
					createdAt: null,
					id: row.id,
					title: row.title,
					href: `/books/${row.slug}`,
					insightsHref: `/books/${row.slug}/insights`,
					ownerId: null,
					collaboratorIds: [],
				}
			: null;
	}
	if (resource === "post") {
		const row = await db.post.findUnique({
			where: { slug: ref },
			select: {
				id: true,
				slug: true,
				authorId: true,
				content: true,
				createdAt: true,
			},
		});
		return row
			? {
					createdAt: row.createdAt,
					id: row.id,
					title: excerpt(row.content),
					href: `/posts/${row.slug}`,
					insightsHref: `/posts/${row.slug}/insights`,
					ownerId: row.authorId,
					collaboratorIds: [],
				}
			: null;
	}
	if (resource === "review") {
		const row = await db.feedback.findUnique({
			where: { slug: ref },
			select: {
				id: true,
				slug: true,
				authorId: true,
				createdAt: true,
				book: { select: { slug: true, title: true } },
			},
		});
		return row
			? {
					createdAt: row.createdAt,
					id: row.id,
					title: `Review of ${row.book.title}`,
					href: `/books/${row.book.slug}/feedbacks/${row.slug}`,
					insightsHref: `/books/${row.book.slug}/feedbacks/${row.slug}/insights`,
					ownerId: row.authorId,
					collaboratorIds: [],
				}
			: null;
	}
	if (resource === "user") {
		const row = await db.user.findUnique({
			where: { username: ref },
			select: { id: true, username: true, name: true },
		});
		return row
			? {
					createdAt: null,
					id: row.id,
					title: row.name,
					href: `/users/${row.username}`,
					insightsHref: `/users/${row.username}/insights`,
					ownerId: row.id,
					collaboratorIds: [],
				}
			: null;
	}
	const [username, slug] = ref.split("/");
	if (!username || !slug) return null;
	const row = await db.shelf.findFirst({
		where: { slug, user: { username } },
		select: {
			id: true,
			slug: true,
			title: true,
			userId: true,
			createdAt: true,
			collaborators: { select: { userId: true } },
		},
	});
	return row
		? {
				createdAt: row.createdAt,
				id: row.id,
				title: row.title,
				href: `/users/${username}/shelves/${row.slug}`,
				insightsHref: `/users/${username}/shelves/${row.slug}/insights`,
				ownerId: row.userId,
				collaboratorIds: row.collaborators.map((c) => c.userId),
			}
		: null;
}

function excerpt(content: string) {
	return richContentPreview(content, 70) || "Your post";
}

async function notifyMilestone(db: Database, target: Target, mark: number) {
	if (!target.ownerId) return;
	try {
		// A milestone is when view-based achievements can newly be earned; the
		// daily sweep covers everything in between.
		await evaluateAchievementsForUser(db, target.ownerId, {
			sections: ["views"],
		});
	} catch (error) {
		console.error("view achievements failed", error);
	}
	try {
		const info = await describeViewTargetById(db, target);
		if (!info) return;
		const noun =
			target.resource === "user"
				? "Your profile"
				: target.resource === "post"
					? "Your post"
					: target.resource === "shelf"
						? "Your shelf"
						: "Your review";
		await dispatchNotification(db, {
			kind: "view_milestone",
			recipientUserIds: [target.ownerId],
			title: `${noun} reached ${mark.toLocaleString("en-US")} views`,
			body:
				target.resource === "user"
					? "See who is looking in your insights."
					: `${info.title} · open its insights to see where views come from.`,
			href: info.insightsHref,
		});
	} catch (error) {
		console.error("view milestone notification failed", error);
	}
}

async function describeViewTargetById(db: Database, target: Target) {
	const ref = target.ref;
	return describeViewTarget(db, target.resource, ref);
}

export type { ViewKindName };
