import type { Database, Prisma } from "@bbrc/db";
import type {
	GetLeaderboardHubInput,
	GetLeaderboardHubOutput,
	GetLeaderboardInput,
	GetLeaderboardOutput,
	LeaderboardEntry,
	LeaderboardKind,
} from "./leaderboard.schema";
import { LEADERBOARD_KIND_META, leaderboardKinds } from "./leaderboard.schema";
import {
	getLeaderboardPeriodRange,
	LEADERBOARD_PERIOD_META,
	type LeaderboardPeriod,
} from "./leaderboard-period";

const HUB_WINDOW = 5;

const memberWhere = {
	status: { in: ["active", "warned", "banned"] as const },
} satisfies Prisma.UserWhereInput;

const memberProfileSelect = {
	id: true,
	username: true,
	name: true,
	image: true,
	isAdmin: true,
} as const;

type MemberProfile = Prisma.UserGetPayload<{
	select: typeof memberProfileSelect;
}>;

type MetricRow = MemberProfile & { metric: number };

function periodDescriptionSuffix(period: LeaderboardPeriod): string {
	switch (period) {
		case "all":
			return "All-time totals.";
		case "year":
			return "Scores since the start of this calendar year (club time).";
		case "month":
			return "Scores since the start of this calendar month (club time).";
		case "week":
			return "Scores since the start of this calendar week, Monday through Sunday (club time).";
		default: {
			const _exhaustive: never = period;
			return _exhaustive;
		}
	}
}

function assignCompetitionRanks(
	rows: Array<{ metric: number; username: string }>,
): number[] {
	const ranks: number[] = [];

	for (let index = 0; index < rows.length; index++) {
		if (index === 0) {
			ranks.push(1);
			continue;
		}

		const previous = rows[index - 1];
		const current = rows[index];
		if (previous == null || current == null) {
			ranks.push(index + 1);
			continue;
		}
		if (current.metric === previous.metric) {
			ranks.push(ranks[index - 1] ?? index + 1);
		} else {
			ranks.push(index + 1);
		}
	}

	return ranks;
}

function toRankedEntries(rows: MetricRow[]): LeaderboardEntry[] {
	const sorted = [...rows].sort((left, right) => {
		const metricDelta = right.metric - left.metric;
		if (metricDelta !== 0) {
			return metricDelta;
		}
		return left.username.localeCompare(right.username);
	});

	const ranks = assignCompetitionRanks(
		sorted.map((row) => ({
			metric: row.metric,
			username: row.username,
		})),
	);

	return sorted.map((row, index) => ({
		rank: ranks[index] ?? index + 1,
		username: row.username,
		name: row.name,
		image: row.image,
		isAdmin: row.isAdmin,
		metric: row.metric,
	}));
}

function sliceWindowAroundUsername(
	entries: LeaderboardEntry[],
	username: string,
	windowSize: number,
): LeaderboardEntry[] {
	if (entries.length === 0) {
		return [];
	}

	const index = entries.findIndex((entry) => entry.username === username);
	if (index === -1) {
		return entries.slice(0, windowSize);
	}

	const maxStart = Math.max(0, entries.length - windowSize);
	const idealStart = index - Math.floor(windowSize / 2);
	const start = Math.min(Math.max(0, idealStart), maxStart);

	return entries.slice(start, start + windowSize);
}

function viewerFromEntries(
	entries: LeaderboardEntry[],
	username: string | undefined,
): GetLeaderboardOutput["viewer"] {
	if (!username) {
		return null;
	}

	const entry = entries.find((row) => row.username === username);
	if (!entry) {
		return null;
	}

	return {
		rank: entry.rank,
		metric: entry.metric,
	};
}

async function loadMemberProfiles(db: Database): Promise<MemberProfile[]> {
	return db.user.findMany({
		where: memberWhere,
		select: memberProfileSelect,
		orderBy: { username: "asc" },
	});
}

function mergeProfilesWithMetrics(
	profiles: MemberProfile[],
	metricsByUserId: Map<string, number>,
): MetricRow[] {
	return profiles.map((profile) => ({
		...profile,
		metric: metricsByUserId.get(profile.id) ?? 0,
	}));
}

async function loadAllTimeXpMetrics(
	db: Database,
): Promise<Map<string, number>> {
	const users = await db.user.findMany({
		where: memberWhere,
		select: { id: true, xp: true },
	});
	return new Map(users.map((user) => [user.id, user.xp]));
}

async function loadAllTimeRpMetrics(
	db: Database,
): Promise<Map<string, number>> {
	const users = await db.user.findMany({
		where: memberWhere,
		select: { id: true, rp: true },
	});
	return new Map(users.map((user) => [user.id, user.rp]));
}

async function loadXpMetricsForRange(
	db: Database,
	range: { gte: Date; lt: Date },
): Promise<Map<string, number>> {
	const groups = await db.xPEvent.groupBy({
		by: ["userId"],
		where: {
			createdAt: { gte: range.gte, lt: range.lt },
			user: memberWhere,
		},
		_sum: { points: true },
	});

	return new Map(groups.map((group) => [group.userId, group._sum.points ?? 0]));
}

async function loadRpMetricsForRange(
	db: Database,
	range: { gte: Date; lt: Date },
): Promise<Map<string, number>> {
	const groups = await db.rPEvent.groupBy({
		by: ["userId"],
		where: {
			createdAt: { gte: range.gte, lt: range.lt },
			user: memberWhere,
		},
		_sum: { points: true },
	});

	return new Map(groups.map((group) => [group.userId, group._sum.points ?? 0]));
}

async function loadReadMetricsForRange(
	db: Database,
	range: { gte: Date; lt: Date } | null,
): Promise<Map<string, number>> {
	const createdAt =
		range != null ? { gte: range.gte, lt: range.lt } : undefined;

	const groups = await db.read.groupBy({
		by: ["userId"],
		where: {
			...(createdAt ? { createdAt } : {}),
			user: memberWhere,
		},
		_count: { _all: true },
	});

	return new Map(groups.map((group) => [group.userId, group._count._all]));
}

async function loadPostMetricsForRange(
	db: Database,
	range: { gte: Date; lt: Date } | null,
): Promise<Map<string, number>> {
	const createdAt =
		range != null ? { gte: range.gte, lt: range.lt } : undefined;

	const groups = await db.post.groupBy({
		by: ["authorId"],
		where: {
			...(createdAt ? { createdAt } : {}),
			author: memberWhere,
		},
		_count: { _all: true },
	});

	return new Map(groups.map((group) => [group.authorId, group._count._all]));
}

async function loadParticipationMetricsForRange(
	db: Database,
	range: { gte: Date; lt: Date } | null,
): Promise<Map<string, number>> {
	const createdAt =
		range != null ? { gte: range.gte, lt: range.lt } : undefined;

	const groups = await db.participation.groupBy({
		by: ["userId"],
		where: {
			...(createdAt ? { createdAt } : {}),
			user: memberWhere,
		},
		_count: { _all: true },
	});

	return new Map(groups.map((group) => [group.userId, group._count._all]));
}

async function loadMetricsByKind(
	db: Database,
	kind: LeaderboardKind,
	period: LeaderboardPeriod,
): Promise<Map<string, number>> {
	const range = getLeaderboardPeriodRange(period);

	switch (kind) {
		case "xp":
			return range == null
				? loadAllTimeXpMetrics(db)
				: loadXpMetricsForRange(db, range);
		case "rp":
			return range == null
				? loadAllTimeRpMetrics(db)
				: loadRpMetricsForRange(db, range);
		case "reads":
			return loadReadMetricsForRange(db, range);
		case "posts":
			return loadPostMetricsForRange(db, range);
		case "participations":
			return loadParticipationMetricsForRange(db, range);
		default: {
			const _exhaustive: never = kind;
			return _exhaustive;
		}
	}
}

async function loadRankedEntriesForKind(
	db: Database,
	kind: LeaderboardKind,
	period: LeaderboardPeriod,
): Promise<LeaderboardEntry[]> {
	const [profiles, metricsByUserId] = await Promise.all([
		loadMemberProfiles(db),
		loadMetricsByKind(db, kind, period),
	]);

	return toRankedEntries(mergeProfilesWithMetrics(profiles, metricsByUserId));
}

function buildLeaderboardOutput(
	kind: LeaderboardKind,
	period: LeaderboardPeriod,
	entries: LeaderboardEntry[],
	viewerUsername: string | undefined,
	itemsOverride?: LeaderboardEntry[],
): GetLeaderboardOutput {
	const meta = LEADERBOARD_KIND_META[kind];
	const periodLabel = LEADERBOARD_PERIOD_META[period].label;

	const items = itemsOverride != null ? [...itemsOverride] : [...entries];

	return {
		kind,
		period,
		periodLabel,
		title: meta.title,
		description: `${meta.description} ${periodDescriptionSuffix(period)}`,
		metricLabel: meta.metricLabel,
		totalMembers: entries.length,
		items,
		viewer: viewerFromEntries(entries, viewerUsername),
	};
}

export async function getLeaderboard(
	input: GetLeaderboardInput,
	db: Database,
	viewerUsername?: string,
): Promise<GetLeaderboardOutput> {
	const entries = await loadRankedEntriesForKind(db, input.kind, input.period);

	return buildLeaderboardOutput(
		input.kind,
		input.period,
		entries,
		viewerUsername,
	);
}

export async function getLeaderboardHub(
	input: GetLeaderboardHubInput,
	db: Database,
	viewerUsername?: string,
): Promise<GetLeaderboardHubOutput> {
	const periodLabel = LEADERBOARD_PERIOD_META[input.period].label;

	const categories = await Promise.all(
		leaderboardKinds.map(async (kind) => {
			const entries = await loadRankedEntriesForKind(db, kind, input.period);
			const meta = LEADERBOARD_KIND_META[kind];
			const items = viewerUsername
				? sliceWindowAroundUsername(entries, viewerUsername, HUB_WINDOW)
				: [];

			return {
				kind,
				title: meta.title,
				description: `${meta.description} ${periodDescriptionSuffix(input.period)}`,
				metricLabel: meta.metricLabel,
				totalMembers: entries.length,
				items,
				viewer: viewerFromEntries(entries, viewerUsername),
			};
		}),
	);

	return {
		period: input.period,
		periodLabel,
		categories,
	};
}

/** Top member metric for OG cards (ties share rank #1). */
export async function getLeaderboardOgSnapshot(
	kind: LeaderboardKind,
	db: Database,
	period: LeaderboardPeriod = "month",
): Promise<{ leaderName: string; leaderMetric: number; memberCount: number }> {
	const entries = await loadRankedEntriesForKind(db, kind, period);
	const leader = entries[0];

	return {
		leaderName: leader?.name ?? "No members yet",
		leaderMetric: leader?.metric ?? 0,
		memberCount: entries.length,
	};
}
