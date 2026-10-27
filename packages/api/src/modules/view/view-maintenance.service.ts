import { type Database, LONG_INTERACTIVE_TRANSACTION, Prisma } from "@bbrc/db";
import {
	clubDayKey,
	clubWeekdayHour,
	resolveClubTimeZone,
	richContentPreview,
	VIEW_RETENTION_DAYS,
} from "@bbrc/shared";
import { dispatchNotification } from "../notification/notification.service";
import { reconcileBookReadingCounters } from "../reading/book-reading-counters";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(key: string, delta: number) {
	const date = new Date(`${key}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + delta);
	return date.toISOString().slice(0, 10);
}

/**
 * Sums raw views older than the retention window into daily rows, then deletes
 * them. Both steps happen in one transaction, so a day is never counted twice.
 * Returns how many raw rows were removed.
 */
export async function rollupOldViews(db: Database): Promise<number> {
	const tz = resolveClubTimeZone();
	const cutoffKey = addDays(
		clubDayKey(new Date(), tz),
		-(VIEW_RETENTION_DAYS - 1),
	);
	const cutoffRows = await db.$queryRaw<{ ts: Date }[]>`
		SELECT ((${cutoffKey}::date)::timestamp AT TIME ZONE ${tz}) AS ts`;
	const cutoff = cutoffRows[0]?.ts;
	if (!cutoff) return 0;

	return db.$transaction(async (tx) => {
		await tx.$executeRaw`
			INSERT INTO view_daily (day, resource, resource_id, kind, source, is_member, device, country, views)
			SELECT (created_at AT TIME ZONE ${tz})::date, resource, resource_id, kind, source,
				(viewer_user_id IS NOT NULL), coalesce(device, 'unknown'), coalesce(country, 'unknown'), count(*)::int
			FROM view WHERE created_at < ${cutoff} AND is_owner = false
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
			ON CONFLICT (day, resource, resource_id, kind, source, is_member, device, country)
			DO UPDATE SET views = view_daily.views + excluded.views`;
		await tx.$executeRaw`
			INSERT INTO view_daily_unique (day, resource, resource_id, kind, member_viewers, guest_viewers, views)
			SELECT (created_at AT TIME ZONE ${tz})::date, resource, resource_id, kind,
				count(DISTINCT viewer_user_id)::int,
				count(DISTINCT visitor_id) FILTER (WHERE viewer_user_id IS NULL)::int,
				count(*)::int
			FROM view WHERE created_at < ${cutoff} AND is_owner = false
			GROUP BY 1, 2, 3, 4
			ON CONFLICT (day, resource, resource_id, kind)
			DO UPDATE SET member_viewers = greatest(view_daily_unique.member_viewers, excluded.member_viewers),
				guest_viewers = greatest(view_daily_unique.guest_viewers, excluded.guest_viewers),
				views = view_daily_unique.views + excluded.views`;
		return tx.$executeRaw`DELETE FROM view WHERE created_at < ${cutoff}`;
	}, LONG_INTERACTIVE_TRANSACTION);
}

const ITEM_TABLE = {
	book: Prisma.sql`book`,
	post: Prisma.sql`post`,
	shelf: Prisma.sql`shelf`,
	review: Prisma.sql`feedback`,
	user: Prisma.sql`"user"`,
} as const;

const VIEW_TABLES = [
	Prisma.sql`view`,
	Prisma.sql`view_total`,
	Prisma.sql`viewer_seen`,
	Prisma.sql`view_daily`,
	Prisma.sql`view_daily_unique`,
] as const;

/** Removes view rows whose book, post, shelf, review or member was deleted. */
export async function removeOrphanedViews(db: Database): Promise<number> {
	let removed = 0;
	for (const [resource, table] of Object.entries(ITEM_TABLE)) {
		for (const viewTable of VIEW_TABLES) {
			removed += await db.$executeRaw`
				DELETE FROM ${viewTable} v
				WHERE v.resource = ${resource}::"view_resource"
					AND NOT EXISTS (SELECT 1 FROM ${table} t WHERE t.id = v.resource_id)`;
		}
	}
	await db.$executeRaw`
		DELETE FROM view_bot_day WHERE day < (now() - interval '400 days')::date`;
	return removed;
}

/** Heals the copies on books and shelves from the totals (they only drift after a failure). */
export async function reconcileViewCounters(db: Database): Promise<number> {
	const books = await db.$executeRaw`
		UPDATE book b SET view_count = t.opens, viewer_count = t.viewers
		FROM view_total t
		WHERE t.resource = 'book' AND t.resource_id = b.id
			AND (b.view_count <> t.opens OR b.viewer_count <> t.viewers)`;
	const shelves = await db.$executeRaw`
		UPDATE shelf s SET view_count = t.opens, viewer_count = t.viewers
		FROM view_total t
		WHERE t.resource = 'shelf' AND t.resource_id = s.id
			AND (s.view_count <> t.opens OR s.viewer_count <> t.viewers)`;
	return books + shelves;
}

type DigestRow = {
	owner_id: string;
	title: string;
	kind: string;
	href: string;
	views: number;
};

/**
 * On Mondays (club time), tells members how many times their posts, reviews,
 * shelves and profile were opened in the last week. Once per member per week.
 */
export async function sendWeeklyViewsDigest(
	db: Database,
	options: { force?: boolean } = {},
): Promise<number> {
	if (!options.force && clubWeekdayHour(new Date()).weekday !== 0) return 0;

	const since = new Date(Date.now() - 7 * DAY_MS);
	const alreadySent = await db.notification.findMany({
		where: {
			kind: "views_digest",
			createdAt: { gte: new Date(Date.now() - 6 * DAY_MS) },
		},
		select: { userId: true },
	});
	const skip = new Set(alreadySent.map((row) => row.userId));

	const rows = await db.$queryRaw<DigestRow[]>`
		WITH recent AS (
			SELECT resource, resource_id, count(*)::int AS views FROM view
			WHERE kind = 'detail' AND is_owner = false AND created_at >= ${since}
			GROUP BY 1, 2
		), items AS (
			SELECT r.views, p.author_id AS owner_id,
				p.content AS title, 'post' AS kind,
				'/posts/' || p.slug || '/insights' AS href
			FROM recent r JOIN post p ON r.resource = 'post' AND p.id = r.resource_id
			UNION ALL
			SELECT r.views, f.author_id, 'Review of ' || b.title, 'other',
				'/books/' || b.slug || '/feedbacks/' || f.slug || '/insights'
			FROM recent r JOIN feedback f ON r.resource = 'review' AND f.id = r.resource_id
			JOIN book b ON b.id = f.book_id
			UNION ALL
			SELECT r.views, s.user_id, s.title, 'other',
				'/users/' || u.username || '/shelves/' || s.slug || '/insights'
			FROM recent r JOIN shelf s ON r.resource = 'shelf' AND s.id = r.resource_id
			JOIN "user" u ON u.id = s.user_id
			UNION ALL
			SELECT r.views, u.id, 'Your profile', 'other', '/users/' || u.username || '/insights'
			FROM recent r JOIN "user" u ON r.resource = 'user' AND u.id = r.resource_id
		)
		SELECT i.owner_id, i.title, i.kind, i.href, i.views
		FROM items i JOIN "user" u ON u.id = i.owner_id AND u.status <> 'banned'`;

	const byOwner = new Map<
		string,
		{ total: number; top: DigestRow; items: number }
	>();
	for (const raw of rows) {
		const row =
			raw.kind === "post"
				? { ...raw, title: richContentPreview(raw.title, 60) || "A post" }
				: raw;
		if (skip.has(row.owner_id)) continue;
		const entry = byOwner.get(row.owner_id);
		if (!entry) {
			byOwner.set(row.owner_id, { total: row.views, top: row, items: 1 });
			continue;
		}
		entry.total += row.views;
		entry.items += 1;
		if (row.views > entry.top.views) entry.top = row;
	}

	let sent = 0;
	for (const [userId, entry] of byOwner) {
		try {
			await dispatchNotification(db, {
				kind: "views_digest",
				recipientUserIds: [userId],
				message: {
					id: "viewsDigest",
					values: {
						total: entry.total,
						top: entry.top.title,
						views: entry.top.views,
					},
				},
				href: entry.top.href,
			});
			sent += 1;
		} catch (error) {
			console.error("views digest failed for a member", error);
		}
	}
	return sent;
}

/** The daily views chores, each one isolated so one failure does not stop the rest. */
export async function sweepViews(db: Database) {
	const result = { rolledUp: 0, orphansRemoved: 0, digests: 0, reconciled: 0 };
	try {
		result.rolledUp = await rollupOldViews(db);
	} catch (error) {
		console.error("view rollup failed", error);
	}
	try {
		result.orphansRemoved = await removeOrphanedViews(db);
	} catch (error) {
		console.error("view cleanup failed", error);
	}
	try {
		result.reconciled =
			(await reconcileViewCounters(db)) +
			(await reconcileBookReadingCounters(db));
	} catch (error) {
		console.error("view counter reconcile failed", error);
	}
	try {
		result.digests = await sendWeeklyViewsDigest(db);
	} catch (error) {
		console.error("views digest failed", error);
	}
	return result;
}
