import { type Database, Prisma } from "@bbrc/db";
import {
	clubDayKey,
	dayKeysBetween,
	insightRangeDays,
	resolveClubTimeZone,
	richContentPreview,
	VIEW_RETENTION_DAYS,
	VIEW_SOURCE_LABELS,
	type ViewResourceKind,
} from "@bbrc/shared";
import { appError } from "../../lib/app-error";
import type {
	AdminViewList,
	AdminViewsOverview,
	Trending,
	ViewCounts,
	ViewInsights,
} from "./view.schema";
import { describeViewTarget } from "./view.service";

type InsightRange = ViewInsights["range"];
type Actor = { id: string; isAdmin: boolean };
type Totals = ViewInsights["totals"];
type Breakdown = ViewInsights["sources"];

const DAY_MS = 24 * 60 * 60 * 1000;
const EPOCH = new Date(0);

const sqlResource = (resource: ViewResourceKind) =>
	Prisma.sql`${resource}::"view_resource"`;

function addDays(key: string, delta: number) {
	const date = new Date(`${key}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + delta);
	return date.toISOString().slice(0, 10);
}

const dayOf = (value: Date | string) =>
	(value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);

async function clubDayStart(db: Database, key: string): Promise<Date> {
	const tz = resolveClubTimeZone();
	const rows = await db.$queryRaw<{ ts: Date }[]>`
		SELECT ((${key}::date)::timestamp AT TIME ZONE ${tz}) AS ts`;
	return rows[0]?.ts ?? EPOCH;
}

function titleCase(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function countryName(code: string) {
	if (code === "unknown" || code.length !== 2) return "Unknown";
	try {
		return (
			new Intl.DisplayNames(["en"], { type: "region" }).of(
				code.toUpperCase(),
			) ?? code
		);
	} catch {
		return code;
	}
}

function labelFor(
	dimension: "source" | "device" | "browser" | "os" | "country",
	key: string,
) {
	if (dimension === "source") {
		return (
			VIEW_SOURCE_LABELS[key as keyof typeof VIEW_SOURCE_LABELS] ??
			titleCase(key)
		);
	}
	if (dimension === "country") return countryName(key);
	if (key === "unknown") return "Unknown";
	return dimension === "device" ? titleCase(key) : key;
}

/** Row filter shared by item insights and the admin overview. */
function filterSql(scope: Prisma.Sql, from: Date, to: Date) {
	return Prisma.sql`${scope} AND is_owner = false AND created_at >= ${from} AND created_at < ${to}`;
}

async function totalsBetween(
	db: Database,
	scope: Prisma.Sql,
	from: Date,
	to: Date,
): Promise<Totals & { detailViewers: number }> {
	const rows = await db.$queryRaw<
		{
			opens: number;
			imps: number;
			uniq: number;
			members: number;
			guests: number;
			detail_viewers: number;
		}[]
	>`
		SELECT
			count(*) FILTER (WHERE kind = 'detail')::int AS opens,
			count(*) FILTER (WHERE kind = 'list')::int AS imps,
			count(DISTINCT coalesce(viewer_user_id, visitor_id))::int AS uniq,
			count(DISTINCT viewer_user_id)::int AS members,
			count(DISTINCT visitor_id) FILTER (WHERE viewer_user_id IS NULL)::int AS guests,
			count(DISTINCT coalesce(viewer_user_id, visitor_id)) FILTER (WHERE kind = 'detail')::int AS detail_viewers
		FROM view WHERE ${filterSql(scope, from, to)}`;
	const row = rows[0];
	const opens = row?.opens ?? 0;
	const impressions = row?.imps ?? 0;
	return {
		opens,
		impressions,
		openRate:
			impressions > 0 ? Math.round((opens / impressions) * 1000) / 10 : null,
		uniqueViewers: row?.uniq ?? 0,
		memberViewers: row?.members ?? 0,
		guestViewers: row?.guests ?? 0,
		detailViewers: row?.detail_viewers ?? 0,
	};
}

async function seriesBetween(
	db: Database,
	scope: Prisma.Sql,
	from: Date,
	to: Date,
) {
	const tz = resolveClubTimeZone();
	const rows = await db.$queryRaw<
		{ day: Date; opens: number; imps: number; uniq: number }[]
	>`
		SELECT (created_at AT TIME ZONE ${tz})::date AS day,
			count(*) FILTER (WHERE kind = 'detail')::int AS opens,
			count(*) FILTER (WHERE kind = 'list')::int AS imps,
			count(DISTINCT coalesce(viewer_user_id, visitor_id))::int AS uniq
		FROM view WHERE ${filterSql(scope, from, to)}
		GROUP BY 1 ORDER BY 1`;
	return rows.map((row) => ({
		day: dayOf(row.day),
		opens: row.opens,
		impressions: row.imps,
		uniqueViewers: row.uniq,
	}));
}

async function heatmapBetween(
	db: Database,
	scope: Prisma.Sql,
	from: Date,
	to: Date,
) {
	const tz = resolveClubTimeZone();
	const rows = await db.$queryRaw<{ wd: number; hr: number; views: number }[]>`
		SELECT (EXTRACT(ISODOW FROM created_at AT TIME ZONE ${tz})::int - 1) AS wd,
			EXTRACT(HOUR FROM created_at AT TIME ZONE ${tz})::int AS hr,
			count(*)::int AS views
		FROM view WHERE ${filterSql(scope, from, to)}
		GROUP BY 1, 2`;
	const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
	for (const row of rows) {
		const line = grid[row.wd];
		if (line && row.hr >= 0 && row.hr < 24) line[row.hr] = row.views;
	}
	return grid;
}

type Dimension = "source" | "device" | "browser" | "os" | "country";
const DIMENSION_COLUMN: Record<Dimension, Prisma.Sql> = {
	source: Prisma.sql`source::text`,
	device: Prisma.sql`coalesce(device, 'unknown')`,
	browser: Prisma.sql`coalesce(browser, 'unknown')`,
	os: Prisma.sql`coalesce(os, 'unknown')`,
	country: Prisma.sql`coalesce(country, 'unknown')`,
};

async function breakdownBetween(
	db: Database,
	scope: Prisma.Sql,
	from: Date,
	to: Date,
	dimension: Dimension,
): Promise<Map<string, number>> {
	const rows = await db.$queryRaw<{ key: string; views: number }[]>`
		SELECT ${DIMENSION_COLUMN[dimension]} AS key, count(*)::int AS views
		FROM view WHERE ${filterSql(scope, from, to)}
		GROUP BY 1`;
	return new Map(rows.map((row) => [row.key, row.views]));
}

function toBreakdown(
	dimension: Dimension,
	map: Map<string, number>,
): Breakdown {
	return [...map.entries()]
		.filter(([, views]) => views > 0)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 12)
		.map(([key, views]) => ({ key, label: labelFor(dimension, key), views }));
}

function mergeInto(target: Map<string, number>, extra: Map<string, number>) {
	for (const [key, value] of extra) {
		target.set(key, (target.get(key) ?? 0) + value);
	}
}

function bestSlots(grid: number[][]) {
	const cells: { weekday: number; hour: number; views: number }[] = [];
	grid.forEach((line, weekday) => {
		line.forEach((views, hour) => {
			if (views > 0) cells.push({ weekday, hour, views });
		});
	});
	return cells.sort((a, b) => b.views - a.views).slice(0, 3);
}

function windowFor(range: InsightRange) {
	const days = insightRangeDays(range);
	const todayKey = clubDayKey(new Date());
	return {
		days,
		todayKey,
		startKey: days == null ? null : addDays(todayKey, -(days - 1)),
	};
}

// ── Rollups (days older than the 90 days kept as raw rows) ─────────────────

async function rollupTotals(
	db: Database,
	resource: ViewResourceKind,
	resourceId: string,
) {
	const rows = await db.viewDailyUnique.findMany({
		where: { resource, resourceId },
		orderBy: { day: "asc" },
	});
	const byDay = new Map<
		string,
		{
			opens: number;
			impressions: number;
			uniq: number;
			members: number;
			guests: number;
		}
	>();
	let opens = 0;
	let impressions = 0;
	let guests = 0;
	for (const row of rows) {
		const key = dayOf(row.day);
		const entry = byDay.get(key) ?? {
			opens: 0,
			impressions: 0,
			uniq: 0,
			members: 0,
			guests: 0,
		};
		if (row.kind === "detail") {
			entry.opens += row.views;
			opens += row.views;
		} else {
			entry.impressions += row.views;
			impressions += row.views;
		}
		entry.members = Math.max(entry.members, row.memberViewers);
		entry.guests = Math.max(entry.guests, row.guestViewers);
		entry.uniq = Math.max(entry.uniq, row.memberViewers + row.guestViewers);
		byDay.set(key, entry);
	}
	for (const entry of byDay.values()) guests += entry.guests;
	return { byDay, opens, impressions, guests, hasData: rows.length > 0 };
}

async function rollupBreakdown(
	db: Database,
	resource: ViewResourceKind,
	resourceId: string,
	dimension: "source" | "device" | "country",
) {
	const groups = await db.viewDaily.groupBy({
		by: [dimension],
		where: { resource, resourceId },
		_sum: { views: true },
	});
	return new Map(
		groups.map((row) => [row[dimension] as string, row._sum.views ?? 0]),
	);
}

// ── Item insights ──────────────────────────────────────────────────────────

async function memberViewerList(
	db: Database,
	resource: ViewResourceKind,
	resourceId: string,
	order: "views" | "recent",
) {
	const rows = await db.viewerSeen.findMany({
		where: { resource, resourceId, user: { isHidden: false } },
		orderBy: order === "views" ? { views: "desc" } : { lastSeenAt: "desc" },
		take: 10,
		select: {
			views: true,
			firstSeenAt: true,
			lastSeenAt: true,
			user: { select: { username: true, name: true, image: true } },
		},
	});
	return rows.map((row) => ({
		username: row.user.username,
		name: row.user.name,
		image: row.user.image ?? null,
		views: row.views,
		firstSeenAt: row.firstSeenAt,
		lastSeenAt: row.lastSeenAt,
	}));
}

async function audienceFor(
	db: Database,
	resource: ViewResourceKind,
	resourceId: string,
	from: Date,
) {
	const scope = Prisma.sql`resource = ${sqlResource(resource)} AND resource_id = ${resourceId}`;
	const [members, guests] = await Promise.all([
		db.$queryRaw<{ fresh: number; back: number }[]>`
			SELECT
				count(*) FILTER (WHERE vs.first_seen_at >= ${from})::int AS fresh,
				count(*) FILTER (WHERE vs.first_seen_at < ${from})::int AS back
			FROM (
				SELECT DISTINCT viewer_user_id FROM view
				WHERE ${scope} AND is_owner = false AND kind = 'detail'
					AND viewer_user_id IS NOT NULL AND created_at >= ${from}
			) v
			JOIN viewer_seen vs ON vs.resource = ${sqlResource(resource)}
				AND vs.resource_id = ${resourceId} AND vs.user_id = v.viewer_user_id`,
		db.$queryRaw<{ fresh: number; back: number }[]>`
			SELECT
				count(*) FILTER (WHERE NOT EXISTS (
					SELECT 1 FROM view p WHERE p.resource = ${sqlResource(resource)}
						AND p.resource_id = ${resourceId} AND p.visitor_id = v.visitor_id
						AND p.viewer_user_id IS NULL AND p.is_owner = false AND p.created_at < ${from}
				))::int AS fresh,
				count(*) FILTER (WHERE EXISTS (
					SELECT 1 FROM view p WHERE p.resource = ${sqlResource(resource)}
						AND p.resource_id = ${resourceId} AND p.visitor_id = v.visitor_id
						AND p.viewer_user_id IS NULL AND p.is_owner = false AND p.created_at < ${from}
				))::int AS back
			FROM (
				SELECT DISTINCT visitor_id FROM view
				WHERE ${scope} AND is_owner = false AND kind = 'detail'
					AND viewer_user_id IS NULL AND created_at >= ${from}
			) v`,
	]);
	return {
		newMembers: members[0]?.fresh ?? 0,
		returningMembers: members[0]?.back ?? 0,
		newGuests: guests[0]?.fresh ?? 0,
		returningGuests: guests[0]?.back ?? 0,
	};
}

async function comparisonFor(
	db: Database,
	resource: ViewResourceKind,
	resourceId: string,
	days: number,
) {
	const from = new Date(Date.now() - days * DAY_MS);
	const rows = await db.$queryRaw<{ resource_id: string; opens: number }[]>`
		SELECT resource_id, count(*)::int AS opens FROM view
		WHERE resource = ${sqlResource(resource)} AND kind = 'detail'
			AND is_owner = false AND created_at >= ${from}
		GROUP BY resource_id`;
	const mine = rows.find((row) => row.resource_id === resourceId)?.opens ?? 0;
	if (rows.length === 0 || mine === 0) return null;
	const average = rows.reduce((sum, row) => sum + row.opens, 0) / rows.length;
	const rank = rows.filter((row) => row.opens > mine).length + 1;
	return {
		averageOpens: Math.round(average * 10) / 10,
		ratio: average > 0 ? Math.round((mine / average) * 10) / 10 : null,
		rank,
		outOf: rows.length,
		days,
	};
}

async function engagementFor(
	db: Database,
	resource: ViewResourceKind,
	resourceId: string,
	from: Date,
	opens: number,
): Promise<ViewInsights["engagement"]> {
	if (resource !== "post" && resource !== "review") return null;
	const since = { gte: from };
	const [likes, comments, shares] =
		resource === "post"
			? await Promise.all([
					db.like.count({ where: { postId: resourceId, createdAt: since } }),
					db.comment.count({ where: { postId: resourceId, createdAt: since } }),
					db.postAttachment.count({
						where: { attachedPostId: resourceId, createdAt: since },
					}),
				])
			: await Promise.all([
					db.like.count({
						where: { feedbackId: resourceId, createdAt: since },
					}),
					db.comment.count({
						where: { feedbackId: resourceId, createdAt: since },
					}),
					db.postAttachment.count({
						where: { feedbackId: resourceId, createdAt: since },
					}),
				]);
	return {
		likes,
		comments,
		shares,
		rate:
			opens > 0
				? Math.round(((likes + comments + shares) / opens) * 1000) / 10
				: null,
	};
}

async function funnelFor(
	db: Database,
	resourceId: string,
	from: Date,
	viewers: number,
): Promise<NonNullable<ViewInsights["funnel"]>> {
	const since = { gte: from };
	const [onShelves, reads, favourites, reviews] = await Promise.all([
		db.shelfBook.count({ where: { bookId: resourceId, createdAt: since } }),
		db.read.count({ where: { bookId: resourceId, createdAt: since } }),
		db.favorite.count({ where: { bookId: resourceId, createdAt: since } }),
		db.feedback.count({ where: { bookId: resourceId, createdAt: since } }),
	]);
	return { viewers, onShelves, reads, favourites, reviews };
}

// ── More insights ──────────────────────────────────────────────────────────

async function referrersBetween(
	db: Database,
	scope: Prisma.Sql,
	from: Date,
	to: Date,
): Promise<Breakdown> {
	const rows = await db.$queryRaw<{ key: string; views: number }[]>`
		SELECT referrer_host AS key, count(*)::int AS views FROM view
		WHERE ${filterSql(scope, from, to)} AND referrer_host IS NOT NULL
		GROUP BY 1 ORDER BY 2 DESC LIMIT 8`;
	return rows.map((row) => ({
		key: row.key,
		label: row.key,
		views: row.views,
	}));
}

async function sourceFunnelBetween(
	db: Database,
	scope: Prisma.Sql,
	from: Date,
	to: Date,
): Promise<ViewInsights["sourceFunnel"]> {
	const rows = await db.$queryRaw<
		{ key: string; imps: number; opens: number }[]
	>`
		SELECT source::text AS key,
			count(*) FILTER (WHERE kind = 'list')::int AS imps,
			count(*) FILTER (WHERE kind = 'detail')::int AS opens
		FROM view WHERE ${filterSql(scope, from, to)}
		GROUP BY 1`;
	return rows
		.filter((row) => row.imps + row.opens > 0)
		.sort((a, b) => b.imps + b.opens - (a.imps + a.opens))
		.map((row) => ({
			key: row.key,
			label: labelFor("source", row.key),
			impressions: row.imps,
			opens: row.opens,
		}));
}

async function loyaltyBetween(
	db: Database,
	scope: Prisma.Sql,
	from: Date,
	to: Date,
): Promise<ViewInsights["loyalty"]> {
	const rows = await db.$queryRaw<
		{ once: number; twice: number; few: number; many: number }[]
	>`
		SELECT
			count(*) FILTER (WHERE n = 1)::int AS once,
			count(*) FILTER (WHERE n = 2)::int AS twice,
			count(*) FILTER (WHERE n BETWEEN 3 AND 5)::int AS few,
			count(*) FILTER (WHERE n >= 6)::int AS many
		FROM (
			SELECT count(*) AS n FROM view
			WHERE ${filterSql(scope, from, to)} AND kind = 'detail'
			GROUP BY coalesce(viewer_user_id, visitor_id)
		) t`;
	const row = rows[0];
	return {
		once: row?.once ?? 0,
		twice: row?.twice ?? 0,
		threeToFive: row?.few ?? 0,
		sixOrMore: row?.many ?? 0,
	};
}

async function lifecycleFor(
	db: Database,
	scope: Prisma.Sql,
	publishedAt: Date | null,
): Promise<ViewInsights["lifecycle"]> {
	// Older items have lost their first days to the 90-day window.
	if (
		!publishedAt ||
		publishedAt.getTime() < Date.now() - VIEW_RETENTION_DAYS * DAY_MS
	) {
		return null;
	}
	const day1 = new Date(publishedAt.getTime() + DAY_MS);
	const day3 = new Date(publishedAt.getTime() + 3 * DAY_MS);
	const day7 = new Date(publishedAt.getTime() + 7 * DAY_MS);
	const rows = await db.$queryRaw<
		{ d1: number; d3: number; d7: number; total: number }[]
	>`
		SELECT
			count(*) FILTER (WHERE created_at < ${day1})::int AS d1,
			count(*) FILTER (WHERE created_at < ${day3})::int AS d3,
			count(*) FILTER (WHERE created_at < ${day7})::int AS d7,
			count(*)::int AS total
		FROM view WHERE ${scope} AND is_owner = false AND kind = 'detail'
			AND created_at >= ${publishedAt}`;
	const row = rows[0];
	return {
		publishedAt,
		firstDay: row?.d1 ?? 0,
		firstThreeDays: row?.d3 ?? 0,
		firstWeek: row?.d7 ?? 0,
		total: row?.total ?? 0,
	};
}

async function mentionsFor(
	db: Database,
	resource: ViewResourceKind,
	id: string,
): Promise<ViewInsights["mentions"]> {
	const where =
		resource === "post"
			? { attachedPostId: id }
			: resource === "review"
				? { feedbackId: id }
				: resource === "shelf"
					? { shelfId: id }
					: resource === "book"
						? { bookId: id }
						: { memberId: id };
	const visible = { post: { author: { isHidden: false } } };
	const [total, recent] = await Promise.all([
		db.postAttachment.count({ where: { ...where, ...visible } }),
		db.postAttachment.findMany({
			where: { ...where, ...visible },
			orderBy: { createdAt: "desc" },
			take: 5,
			select: {
				createdAt: true,
				post: {
					select: {
						slug: true,
						author: { select: { username: true, name: true } },
					},
				},
			},
		}),
	]);
	return {
		total,
		recent: recent.map((row) => ({
			href: `/posts/${row.post.slug}`,
			username: row.post.author.username,
			name: row.post.author.name,
			at: row.createdAt,
		})),
	};
}

async function ownComparisonFor(
	db: Database,
	resource: ViewResourceKind,
	resourceId: string,
	ownerId: string | null,
): Promise<ViewInsights["ownComparison"]> {
	if (!ownerId) return null;
	let rows: { id: string; opens: number }[];
	if (resource === "post") {
		rows = await db.$queryRaw`
			SELECT p.id, coalesce(t.opens, 0)::int AS opens FROM post p
			LEFT JOIN view_total t ON t.resource = 'post' AND t.resource_id = p.id
			WHERE p.author_id = ${ownerId}`;
	} else if (resource === "review") {
		rows = await db.$queryRaw`
			SELECT f.id, coalesce(t.opens, 0)::int AS opens FROM feedback f
			LEFT JOIN view_total t ON t.resource = 'review' AND t.resource_id = f.id
			WHERE f.author_id = ${ownerId}`;
	} else if (resource === "shelf") {
		rows = await db.$queryRaw`
			SELECT s.id, coalesce(t.opens, 0)::int AS opens FROM shelf s
			LEFT JOIN view_total t ON t.resource = 'shelf' AND t.resource_id = s.id
			WHERE s.user_id = ${ownerId} AND s.status = 'active' AND NOT s.is_wishlist`;
	} else {
		return null;
	}
	if (rows.length < 2) return null;
	const mine = rows.find((row) => row.id === resourceId)?.opens ?? 0;
	const average = rows.reduce((sum, row) => sum + row.opens, 0) / rows.length;
	return {
		averageOpens: Math.round(average * 10) / 10,
		rank: rows.filter((row) => row.opens > mine).length + 1,
		outOf: rows.length,
	};
}

function canOpenInsights(
	resource: ViewResourceKind,
	actor: Actor,
	info: { ownerId: string | null; collaboratorIds: string[] },
) {
	if (actor.isAdmin) return true;
	if (resource === "book") return true;
	if (info.ownerId === actor.id) return true;
	return info.collaboratorIds.includes(actor.id);
}

export async function getViewInsights(
	db: Database,
	actor: Actor,
	input: { resource: ViewResourceKind; ref: string; range: InsightRange },
): Promise<ViewInsights> {
	const { resource, ref, range } = input;
	const info = await describeViewTarget(db, resource, ref);
	if (!info) {
		throw appError("NOT_FOUND", "view.itemNotFound");
	}
	if (!canOpenInsights(resource, actor, info)) {
		throw appError("FORBIDDEN", "view.insightsAuthorOnly");
	}
	// Members see who looked at their own things, but never at their own profile.
	const canSeeViewers =
		resource === "book" ? false : resource === "user" ? actor.isAdmin : true;

	const id = info.id;
	const scope = Prisma.sql`resource = ${sqlResource(resource)} AND resource_id = ${id}`;
	const { days, todayKey, startKey } = windowFor(range);
	const tomorrow = new Date(Date.now() + DAY_MS);
	const retentionStartKey = addDays(todayKey, -(VIEW_RETENTION_DAYS - 1));

	const from = startKey ? await clubDayStart(db, startKey) : EPOCH;
	const prevFrom =
		days != null && days <= 30
			? await clubDayStart(db, addDays(startKey ?? todayKey, -days))
			: null;
	const heatFrom = await clubDayStart(
		db,
		days != null && days < VIEW_RETENTION_DAYS
			? (startKey ?? retentionStartKey)
			: retentionStartKey,
	);

	const [
		raw,
		previous,
		series,
		heatmap,
		sources,
		devices,
		browsers,
		systems,
		countries,
		audience,
		totalRow,
		rollup,
		topViewers,
		recentViewers,
		comparison,
	] = await Promise.all([
		totalsBetween(db, scope, from, tomorrow),
		prevFrom ? totalsBetween(db, scope, prevFrom, from) : Promise.resolve(null),
		seriesBetween(db, scope, from, tomorrow),
		heatmapBetween(db, scope, heatFrom, tomorrow),
		breakdownBetween(db, scope, from, tomorrow, "source"),
		breakdownBetween(db, scope, from, tomorrow, "device"),
		breakdownBetween(db, scope, from, tomorrow, "browser"),
		breakdownBetween(db, scope, from, tomorrow, "os"),
		breakdownBetween(db, scope, from, tomorrow, "country"),
		audienceFor(db, resource, id, from),
		db.viewTotal.findUnique({
			where: { resource_resourceId: { resource, resourceId: id } },
			select: { opens: true },
		}),
		range === "all" ? rollupTotals(db, resource, id) : Promise.resolve(null),
		canSeeViewers
			? memberViewerList(db, resource, id, "views")
			: Promise.resolve(null),
		canSeeViewers
			? memberViewerList(db, resource, id, "recent")
			: Promise.resolve(null),
		comparisonFor(
			db,
			resource,
			id,
			Math.min(days ?? VIEW_RETENTION_DAYS, VIEW_RETENTION_DAYS),
		),
	]);

	let totals: Totals = {
		opens: raw.opens,
		impressions: raw.impressions,
		openRate: raw.openRate,
		uniqueViewers: raw.uniqueViewers,
		memberViewers: raw.memberViewers,
		guestViewers: raw.guestViewers,
	};
	const byDay = new Map(series.map((point) => [point.day, point]));
	let approximate = false;

	if (rollup?.hasData) {
		approximate = true;
		const [rollSources, rollDevices, rollCountries, seenMembers] =
			await Promise.all([
				rollupBreakdown(db, resource, id, "source"),
				rollupBreakdown(db, resource, id, "device"),
				rollupBreakdown(db, resource, id, "country"),
				db.viewerSeen.count({ where: { resource, resourceId: id } }),
			]);
		mergeInto(sources, rollSources);
		mergeInto(devices, rollDevices);
		mergeInto(countries, rollCountries);
		const opens = raw.opens + rollup.opens;
		const impressions = raw.impressions + rollup.impressions;
		const guests = raw.guestViewers + rollup.guests;
		totals = {
			opens,
			impressions,
			openRate:
				impressions > 0 ? Math.round((opens / impressions) * 1000) / 10 : null,
			uniqueViewers: seenMembers + guests,
			memberViewers: seenMembers,
			guestViewers: guests,
		};
		for (const [key, entry] of rollup.byDay) {
			if (!byDay.has(key)) {
				byDay.set(key, {
					day: key,
					opens: entry.opens,
					impressions: entry.impressions,
					uniqueViewers: entry.uniq,
				});
			}
		}
	}

	const dayKeys = [...byDay.keys()].sort();
	const firstKey = startKey ?? dayKeys[0] ?? todayKey;
	const filled = dayKeysBetween(firstKey, todayKey).map(
		(day) =>
			byDay.get(day) ?? { day, opens: 0, impressions: 0, uniqueViewers: 0 },
	);

	const rawFrom = days == null || days >= VIEW_RETENTION_DAYS ? heatFrom : from;
	const [
		engagement,
		funnel,
		referrers,
		sourceFunnel,
		loyalty,
		lifecycle,
		mentions,
		memberCount,
		ownComparison,
	] = await Promise.all([
		engagementFor(db, resource, id, from, totals.opens),
		resource === "book"
			? funnelFor(db, id, from, raw.detailViewers)
			: Promise.resolve(null),
		referrersBetween(db, scope, rawFrom, tomorrow),
		sourceFunnelBetween(db, scope, rawFrom, tomorrow),
		loyaltyBetween(db, scope, rawFrom, tomorrow),
		lifecycleFor(db, scope, info.createdAt),
		mentionsFor(db, resource, id),
		db.user.count({ where: { status: { not: "banned" }, isHidden: false } }),
		ownComparisonFor(db, resource, id, info.ownerId),
	]);

	return {
		resource,
		ref,
		title: info.title,
		href: info.href,
		range,
		since: new Date(`${firstKey}T00:00:00Z`),
		canSeeViewers,
		totals,
		previous: previous
			? {
					opens: previous.opens,
					impressions: previous.impressions,
					openRate: previous.openRate,
					uniqueViewers: previous.uniqueViewers,
					memberViewers: previous.memberViewers,
					guestViewers: previous.guestViewers,
				}
			: null,
		series: filled,
		heatmap,
		bestSlots: bestSlots(heatmap),
		sources: toBreakdown("source", sources),
		devices: toBreakdown("device", devices),
		browsers: toBreakdown("browser", browsers),
		systems: toBreakdown("os", systems),
		countries: toBreakdown("country", countries),
		audience,
		topViewers,
		recentViewers,
		comparison,
		engagement,
		funnel,
		referrers,
		sourceFunnel,
		loyalty,
		lifecycle,
		mentions,
		reach: { viewers: totals.memberViewers, members: memberCount },
		ownComparison,
		approximate,
		allTimeOpens: totalRow?.opens ?? 0,
	};
}

// ── Public counts and trending ─────────────────────────────────────────────

export async function getViewCounts(
	db: Database,
	input: { resource: "post" | "book"; refs: string[] },
): Promise<ViewCounts> {
	const refs = [...new Set(input.refs)];
	const rows =
		input.resource === "post"
			? await db.$queryRaw<{ ref: string; opens: number }[]>`
					SELECT p.slug AS ref, t.opens FROM view_total t
					JOIN post p ON p.id = t.resource_id
					WHERE t.resource = 'post' AND p.slug = ANY(${refs}::text[])`
			: await db.$queryRaw<{ ref: string; opens: number }[]>`
					SELECT b.slug AS ref, t.opens FROM view_total t
					JOIN book b ON b.id = t.resource_id
					WHERE t.resource = 'book' AND b.slug = ANY(${refs}::text[])`;
	const counts: Record<string, number> = {};
	for (const ref of refs) counts[ref] = 0;
	for (const row of rows) counts[row.ref] = row.opens;
	return { counts };
}

export async function getTrending(
	db: Database,
	input: { resource: "post" | "book"; days: number; limit: number },
): Promise<Trending> {
	const since = new Date(Date.now() - input.days * DAY_MS);
	const rows = await db.$queryRaw<{ resource_id: string; views: number }[]>`
		SELECT resource_id, count(*)::int AS views FROM view
		WHERE resource = ${sqlResource(input.resource)} AND kind = 'detail'
			AND is_owner = false AND created_at >= ${since}
		GROUP BY resource_id ORDER BY 2 DESC LIMIT ${input.limit}`;
	if (rows.length === 0) return { items: [] };
	const ids = rows.map((row) => row.resource_id);
	const views = new Map(rows.map((row) => [row.resource_id, row.views]));

	if (input.resource === "book") {
		const books = await db.book.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				slug: true,
				title: true,
				authors: true,
				coverId: true,
			},
		});
		return {
			items: books
				.map((book) => ({
					ref: book.slug,
					href: `/books/${book.slug}`,
					title: book.title,
					subtitle: book.authors.join(", ") || null,
					coverId: book.coverId,
					views: views.get(book.id) ?? 0,
				}))
				.sort((a, b) => b.views - a.views),
		};
	}
	const posts = await db.post.findMany({
		where: { id: { in: ids }, author: { isHidden: false } },
		select: {
			id: true,
			slug: true,
			content: true,
			author: { select: { name: true } },
		},
	});
	return {
		items: posts
			.map((post) => {
				const text = richContentPreview(post.content, 90);
				return {
					ref: post.slug,
					href: `/posts/${post.slug}`,
					title: text || "A post",
					subtitle: post.author.name,
					coverId: null,
					views: views.get(post.id) ?? 0,
				};
			})
			.sort((a, b) => b.views - a.views),
	};
}

// ── Admin overview ─────────────────────────────────────────────────────────

async function titlesFor(
	db: Database,
	resource: ViewResourceKind,
	ids: string[],
): Promise<Map<string, { ref: string; href: string; title: string }>> {
	const map = new Map<string, { ref: string; href: string; title: string }>();
	if (resource === "book") {
		for (const row of await db.book.findMany({
			where: { id: { in: ids } },
			select: { id: true, slug: true, title: true },
		})) {
			map.set(row.id, {
				ref: row.slug,
				href: `/books/${row.slug}`,
				title: row.title,
			});
		}
	} else if (resource === "post") {
		for (const row of await db.post.findMany({
			where: { id: { in: ids } },
			select: { id: true, slug: true, content: true },
		})) {
			const text = richContentPreview(row.content, 70);
			map.set(row.id, {
				ref: row.slug,
				href: `/posts/${row.slug}`,
				title: text || "A post",
			});
		}
	} else if (resource === "review") {
		for (const row of await db.feedback.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				slug: true,
				book: { select: { slug: true, title: true } },
			},
		})) {
			map.set(row.id, {
				ref: row.slug,
				href: `/books/${row.book.slug}/feedbacks/${row.slug}`,
				title: `Review of ${row.book.title}`,
			});
		}
	} else if (resource === "user") {
		for (const row of await db.user.findMany({
			where: { id: { in: ids } },
			select: { id: true, username: true, name: true },
		})) {
			map.set(row.id, {
				ref: row.username,
				href: `/users/${row.username}`,
				title: row.name,
			});
		}
	} else {
		for (const row of await db.shelf.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				slug: true,
				title: true,
				user: { select: { username: true } },
			},
		})) {
			map.set(row.id, {
				ref: `${row.user.username}/${row.slug}`,
				href: `/users/${row.user.username}/shelves/${row.slug}`,
				title: row.title,
			});
		}
	}
	return map;
}

const ALL_RESOURCES: ViewResourceKind[] = [
	"book",
	"post",
	"shelf",
	"review",
	"user",
];

export async function getAdminViewsOverview(
	db: Database,
	range: "7d" | "30d" | "90d",
): Promise<AdminViewsOverview> {
	const scope = Prisma.sql`TRUE`;
	const days = Number.parseInt(range, 10);
	const todayKey = clubDayKey(new Date());
	const startKey = addDays(todayKey, -(days - 1));
	const from = await clubDayStart(db, startKey);
	const tomorrow = new Date(Date.now() + DAY_MS);

	const [
		totals,
		series,
		heatmap,
		sources,
		devices,
		browsers,
		countries,
		perResource,
		bots,
		members,
	] = await Promise.all([
		totalsBetween(db, scope, from, tomorrow),
		seriesBetween(db, scope, from, tomorrow),
		heatmapBetween(db, scope, from, tomorrow),
		breakdownBetween(db, scope, from, tomorrow, "source"),
		breakdownBetween(db, scope, from, tomorrow, "device"),
		breakdownBetween(db, scope, from, tomorrow, "browser"),
		breakdownBetween(db, scope, from, tomorrow, "country"),
		db.$queryRaw<{ resource: string; opens: number; imps: number }[]>`
			SELECT resource::text AS resource,
				count(*) FILTER (WHERE kind = 'detail')::int AS opens,
				count(*) FILTER (WHERE kind = 'list')::int AS imps
			FROM view WHERE ${filterSql(scope, from, tomorrow)} GROUP BY 1`,
		db.viewBotDay.aggregate({
			where: { day: { gte: new Date(`${startKey}T00:00:00Z`) } },
			_sum: { count: true },
		}),
		db.$queryRaw<{ user_id: string; views: number }[]>`
			SELECT viewer_user_id AS user_id, count(*)::int AS views FROM view
			WHERE ${filterSql(Prisma.sql`viewer_user_id IS NOT NULL`, from, tomorrow)}
			GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
	]);

	const top = await Promise.all(
		ALL_RESOURCES.map(async (resource) => {
			const rows = await db.$queryRaw<{ resource_id: string; views: number }[]>`
				SELECT resource_id, count(*)::int AS views FROM view
				WHERE ${filterSql(
					Prisma.sql`resource = ${sqlResource(resource)} AND kind = 'detail'`,
					from,
					tomorrow,
				)}
				GROUP BY 1 ORDER BY 2 DESC LIMIT 5`;
			const titles = await titlesFor(
				db,
				resource,
				rows.map((row) => row.resource_id),
			);
			return {
				resource,
				items: rows.flatMap((row) => {
					const found = titles.get(row.resource_id);
					return found ? [{ ...found, views: row.views }] : [];
				}),
			};
		}),
	);

	const users = members.length
		? await db.user.findMany({
				where: { id: { in: members.map((row) => row.user_id) } },
				select: { id: true, username: true, name: true, image: true },
			})
		: [];
	const userById = new Map(users.map((user) => [user.id, user]));
	const tally = new Map(perResource.map((row) => [row.resource, row]));

	const filled = dayKeysBetween(startKey, todayKey).map((day) => {
		const point = series.find((entry) => entry.day === day);
		return point ?? { day, opens: 0, impressions: 0, uniqueViewers: 0 };
	});

	const { detailViewers: _detail, ...totalsOnly } = totals;
	return {
		range,
		totals: totalsOnly,
		series: filled,
		botsDropped: bots._sum.count ?? 0,
		byResource: ALL_RESOURCES.map((resource) => ({
			resource,
			opens: tally.get(resource)?.opens ?? 0,
			impressions: tally.get(resource)?.imps ?? 0,
		})),
		top,
		sources: toBreakdown("source", sources),
		devices: toBreakdown("device", devices),
		browsers: toBreakdown("browser", browsers),
		countries: toBreakdown("country", countries),
		heatmap,
		mostActiveMembers: members.flatMap((row) => {
			const user = userById.get(row.user_id);
			return user
				? [
						{
							username: user.username,
							name: user.name,
							image: user.image ?? null,
							views: row.views,
						},
					]
				: [];
		}),
	};
}

// ── Admin list of raw views ────────────────────────────────────────────────

export async function listAdminViews(
	db: Database,
	input: {
		page: number;
		pageSize: number;
		resource?: ViewResourceKind;
		kind?: "detail" | "list";
		viewer: "all" | "member" | "guest";
		source?: ViewInsights["sourceFunnel"][number]["key"];
		includeOwn: boolean;
	},
): Promise<AdminViewList> {
	const where = {
		...(input.resource ? { resource: input.resource } : {}),
		...(input.kind ? { kind: input.kind } : {}),
		...(input.source ? { source: input.source as never } : {}),
		...(input.viewer === "member"
			? { viewerUserId: { not: null } }
			: input.viewer === "guest"
				? { viewerUserId: null }
				: {}),
		...(input.includeOwn ? {} : { isOwner: false }),
	};
	const [total, rows] = await Promise.all([
		db.view.count({ where }),
		db.view.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
			select: {
				id: true,
				createdAt: true,
				resource: true,
				resourceId: true,
				kind: true,
				source: true,
				isOwner: true,
				visitorId: true,
				device: true,
				browser: true,
				os: true,
				country: true,
				referrerHost: true,
				viewer: { select: { username: true, name: true, image: true } },
			},
		}),
	]);

	const idsByResource = new Map<ViewResourceKind, Set<string>>();
	for (const row of rows) {
		const set = idsByResource.get(row.resource) ?? new Set<string>();
		set.add(row.resourceId);
		idsByResource.set(row.resource, set);
	}
	const titles = new Map<string, { title: string; href: string }>();
	await Promise.all(
		[...idsByResource.entries()].map(async ([resource, ids]) => {
			const found = await titlesFor(db, resource, [...ids]);
			for (const [id, value] of found) {
				titles.set(`${resource}|${id}`, {
					title: value.title,
					href: value.href,
				});
			}
		}),
	);

	return {
		total,
		page: input.page,
		pageSize: input.pageSize,
		items: rows.map((row) => ({
			id: row.id,
			at: row.createdAt,
			resource: row.resource,
			kind: row.kind,
			source: row.source,
			isOwner: row.isOwner,
			viewer: row.viewer
				? {
						username: row.viewer.username,
						name: row.viewer.name,
						image: row.viewer.image ?? null,
					}
				: null,
			guestTag: row.visitorId.replace(/^h:/, "").slice(0, 6),
			item: titles.get(`${row.resource}|${row.resourceId}`) ?? null,
			device: row.device,
			browser: row.browser,
			os: row.os,
			country: row.country,
			referrerHost: row.referrerHost,
		})),
	};
}
