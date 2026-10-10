import {
	DEFAULT_LEADERBOARD_PERIOD,
	LEADERBOARD_PERIOD_META,
	type LeaderboardKind,
	LeaderboardKindSchema,
	type LeaderboardPeriod,
	type LeaderboardPeriodSlug,
	leaderboardKinds,
	leaderboardPeriodSlugs,
	leaderboardPeriods,
	periodFromSlug,
	slugFromPeriod,
} from "@bbrc/api/modules/leaderboard/leaderboard.schema";

export { periodFromSlug, slugFromPeriod };

import type { Route } from "next";

export const LEADERBOARD_OVERVIEW_SEGMENT = "overview" as const;

export type LeaderboardRouteSegment =
	| typeof LEADERBOARD_OVERVIEW_SEGMENT
	| LeaderboardKind;

export const LEADERBOARD_TABS = [
	{
		id: "hub" as const,
		label: "Overview",
		segment: LEADERBOARD_OVERVIEW_SEGMENT,
	},
	{ id: "xp" as const, label: "XP", segment: "xp" as const },
	{ id: "rp" as const, label: "RP", segment: "rp" as const },
	{ id: "reads" as const, label: "Reads", segment: "reads" as const },
	{ id: "posts" as const, label: "Posts", segment: "posts" as const },
	{
		id: "participations" as const,
		label: "Participations",
		segment: "participations" as const,
	},
] as const;

export const LEADERBOARD_PERIOD_OPTIONS = (
	[
		"month",
		"year",
		"week",
		"all",
	] as const satisfies readonly LeaderboardPeriod[]
).map((period) => ({
	period,
	...LEADERBOARD_PERIOD_META[period],
}));

export type LeaderboardRouteContext = {
	kind: LeaderboardKind | null;
	period: LeaderboardPeriod;
	segment: LeaderboardRouteSegment;
};

export function isLeaderboardPeriodSlug(
	value: string,
): value is LeaderboardPeriodSlug {
	return (leaderboardPeriodSlugs as readonly string[]).includes(value);
}

export function isLeaderboardOverviewSegment(
	value: string,
): value is typeof LEADERBOARD_OVERVIEW_SEGMENT {
	return value === LEADERBOARD_OVERVIEW_SEGMENT;
}

export function parseLeaderboardKindParam(
	value: string,
): LeaderboardKind | null {
	const parsed = LeaderboardKindSchema.safeParse(value);
	return parsed.success ? parsed.data : null;
}

export function parseLeaderboardRouteSegment(
	value: string,
): LeaderboardRouteSegment | null {
	if (isLeaderboardOverviewSegment(value)) {
		return LEADERBOARD_OVERVIEW_SEGMENT;
	}
	return parseLeaderboardKindParam(value);
}

/** Parse `/leaderboard/overview`, `/leaderboard/xp/year`, etc. */
export function parseLeaderboardPathname(
	pathname: string,
): LeaderboardRouteContext {
	const normalized = pathname.replace(/\/+$/, "") || "/leaderboard";
	const segments = normalized.split("/").filter(Boolean);

	if (segments[0] !== "leaderboard") {
		return {
			kind: null,
			period: DEFAULT_LEADERBOARD_PERIOD,
			segment: LEADERBOARD_OVERVIEW_SEGMENT,
		};
	}

	const segmentParam = segments[1];
	const periodParam = segments[2];

	if (segmentParam == null) {
		return {
			kind: null,
			period: DEFAULT_LEADERBOARD_PERIOD,
			segment: LEADERBOARD_OVERVIEW_SEGMENT,
		};
	}

	const segment = parseLeaderboardRouteSegment(segmentParam);
	if (segment == null) {
		return {
			kind: null,
			period: DEFAULT_LEADERBOARD_PERIOD,
			segment: LEADERBOARD_OVERVIEW_SEGMENT,
		};
	}

	const period =
		periodParam != null && isLeaderboardPeriodSlug(periodParam)
			? periodFromSlug(periodParam)
			: DEFAULT_LEADERBOARD_PERIOD;

	if (segment === LEADERBOARD_OVERVIEW_SEGMENT) {
		return { kind: null, period, segment };
	}

	return { kind: segment, period, segment };
}

export function leaderboardHubPath(
	period: LeaderboardPeriod = DEFAULT_LEADERBOARD_PERIOD,
): Route {
	const slug = slugFromPeriod(period);
	if (slug == null) {
		return `/leaderboard/${LEADERBOARD_OVERVIEW_SEGMENT}` as Route;
	}
	return `/leaderboard/${LEADERBOARD_OVERVIEW_SEGMENT}/${slug}` as Route;
}

export function leaderboardKindPath(
	kind: LeaderboardKind,
	period: LeaderboardPeriod = DEFAULT_LEADERBOARD_PERIOD,
): Route {
	const slug = slugFromPeriod(period);
	if (slug == null) {
		return `/leaderboard/${kind}` as Route;
	}
	return `/leaderboard/${kind}/${slug}` as Route;
}

export function leaderboardSegmentPath(
	segment: LeaderboardRouteSegment,
	period: LeaderboardPeriod = DEFAULT_LEADERBOARD_PERIOD,
): Route {
	return segment === LEADERBOARD_OVERVIEW_SEGMENT
		? leaderboardHubPath(period)
		: leaderboardKindPath(segment, period);
}

export function leaderboardTabHref(
	kind: LeaderboardKind | null,
	period: LeaderboardPeriod,
): Route {
	const segment = kind == null ? LEADERBOARD_OVERVIEW_SEGMENT : kind;
	return leaderboardSegmentPath(segment, period);
}

export function activeLeaderboardTabId(
	pathname: string,
): (typeof LEADERBOARD_TABS)[number]["id"] {
	const { segment } = parseLeaderboardPathname(pathname);
	const tab = LEADERBOARD_TABS.find((entry) => entry.segment === segment);
	return tab?.id ?? "hub";
}

/** Sitemap / static discovery paths for all leaderboard period variants. */
export function leaderboardSitemapPaths(): string[] {
	const paths = new Set<string>();

	for (const period of leaderboardPeriods) {
		paths.add(leaderboardHubPath(period) as string);
	}

	for (const kind of leaderboardKinds) {
		for (const period of leaderboardPeriods) {
			paths.add(leaderboardKindPath(kind, period) as string);
		}
	}

	return [...paths].sort();
}
