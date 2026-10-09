import type { Database, Prisma } from "@bbrc/db";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { sittingOngoingWhere } from "../sitting/sitting.listing";
import {
	type AdminSittingListFilters,
	adminSittingListRanging,
	adminSittingListSearching,
	adminSittingListSorting,
} from "./admin-sitting.listing";
import type {
	AdminSittingOverviewOutput,
	GetAdminSittingOverviewInput,
	GetAdminSittingStatsInput,
	GetAdminSittingStatsOutput,
	ListAdminSittingsInput,
	ListAdminSittingsOutput,
} from "./admin-sitting.schema";
import { adminSittingListSelect } from "./admin-sitting.schema";
import {
	emptyAdminSittingRankings,
	loadAdminSittingRankings,
} from "./admin-sitting-rankings";

type AdminSittingListQueryInput =
	| GetAdminSittingOverviewInput
	| ListAdminSittingsInput;

type SittingListRow = Prisma.SittingGetPayload<{
	select: typeof adminSittingListSelect;
}>;

function buildAdditionsByDay(
	rows: { createdAt: Date }[],
	days: number,
): { date: string; count: number }[] {
	const since = new Date();
	since.setUTCDate(since.getUTCDate() - (days - 1));
	since.setUTCHours(0, 0, 0, 0);

	const countsByDay = new Map<string, number>();
	for (let i = 0; i < days; i += 1) {
		const day = new Date(since);
		day.setUTCDate(since.getUTCDate() + i);
		countsByDay.set(day.toISOString().slice(0, 10), 0);
	}

	for (const row of rows) {
		const key = row.createdAt.toISOString().slice(0, 10);
		if (countsByDay.has(key)) {
			countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
		}
	}

	return [...countsByDay.entries()].map(([date, count]) => ({ date, count }));
}

function intersectSittingIds(
	current: string[] | null,
	next: string[],
): string[] | null {
	if (next.length === 0) {
		return [];
	}
	if (current === null) {
		return next;
	}
	const allowed = new Set(next);
	return current.filter((id) => allowed.has(id));
}

async function sittingIdsWithMinPostAttachments(
	db: Database,
	min: number,
): Promise<string[]> {
	if (min <= 0) {
		return [];
	}

	const rows = await db.sitting.findMany({
		select: { id: true, _count: { select: { postAttachments: true } } },
	});

	return rows
		.filter((row) => row._count.postAttachments >= min)
		.map((row) => row.id);
}

async function sittingIdsWithMinParticipants(
	db: Database,
	min: number,
	activeOnly: boolean,
): Promise<string[]> {
	if (min <= 0) {
		return [];
	}

	const rows = await db.participation.groupBy({
		by: ["sittingId"],
		where: activeOnly ? { removedAt: null } : undefined,
		_count: { _all: true },
		having: { sittingId: { _count: { gte: min } } },
	});

	return rows.map((row) => row.sittingId);
}

async function sittingIdsWithMinProgressCount(
	db: Database,
	progress: "completed" | "dnf",
	min: number,
): Promise<string[]> {
	if (min <= 0) {
		return [];
	}

	const rows = await db.participation.groupBy({
		by: ["sittingId"],
		where: { progress, removedAt: null },
		_count: { _all: true },
		having: { sittingId: { _count: { gte: min } } },
	});

	return rows.map((row) => row.sittingId);
}

async function sittingIdsWithMinPollOptions(
	db: Database,
	min: number,
): Promise<string[]> {
	if (min <= 0) {
		return [];
	}

	const polls = await db.poll.findMany({
		select: { sittingId: true, _count: { select: { options: true } } },
	});

	return polls
		.filter((row) => row._count.options >= min)
		.map((row) => row.sittingId);
}

async function sittingIdsWithMinPollVotes(
	db: Database,
	min: number,
): Promise<string[]> {
	if (min <= 0) {
		return [];
	}

	const options = await db.pollOption.findMany({
		select: {
			_count: { select: { votes: true } },
			poll: { select: { sittingId: true } },
		},
	});

	const totals = new Map<string, number>();
	for (const option of options) {
		const sittingId = option.poll.sittingId;
		totals.set(sittingId, (totals.get(sittingId) ?? 0) + option._count.votes);
	}

	return [...totals.entries()]
		.filter(([, votes]) => votes >= min)
		.map(([sittingId]) => sittingId);
}

async function resolveMinCountSittingIds(
	db: Database,
	input: AdminSittingListFilters,
): Promise<string[] | null> {
	const filters: Array<{
		key: keyof AdminSittingListFilters;
		resolve: () => Promise<string[]>;
	}> = [
		{
			key: "minParticipants",
			resolve: () =>
				sittingIdsWithMinParticipants(db, input.minParticipants ?? 0, false),
		},
		{
			key: "minActiveParticipants",
			resolve: () =>
				sittingIdsWithMinParticipants(
					db,
					input.minActiveParticipants ?? 0,
					true,
				),
		},
		{
			key: "minCompletedParticipants",
			resolve: () =>
				sittingIdsWithMinProgressCount(
					db,
					"completed",
					input.minCompletedParticipants ?? 0,
				),
		},
		{
			key: "minDnfParticipants",
			resolve: () =>
				sittingIdsWithMinProgressCount(
					db,
					"dnf",
					input.minDnfParticipants ?? 0,
				),
		},
		{
			key: "minPollOptions",
			resolve: () =>
				sittingIdsWithMinPollOptions(db, input.minPollOptions ?? 0),
		},
		{
			key: "minPollVotes",
			resolve: () => sittingIdsWithMinPollVotes(db, input.minPollVotes ?? 0),
		},
		{
			key: "minPostAttachments",
			resolve: () =>
				sittingIdsWithMinPostAttachments(db, input.minPostAttachments ?? 0),
		},
	];

	let ids: string[] | null = null;

	for (const filter of filters) {
		const min = input[filter.key];
		if (typeof min !== "number" || min <= 0) {
			continue;
		}

		const matched = await filter.resolve();
		if (matched.length === 0) {
			return [];
		}

		ids = intersectSittingIds(ids, matched);
		if (ids?.length === 0) {
			return [];
		}
	}

	return ids;
}

function adminSittingExtraWhere(
	input: AdminSittingListFilters,
): Prisma.SittingWhereInput {
	const now = new Date();
	const parts: Prisma.SittingWhereInput[] = [];

	if (input.statuses?.length) {
		parts.push({ status: { in: input.statuses } });
	}
	if (input.ongoingOnly) {
		parts.push(sittingOngoingWhere());
	}
	if (input.hasSelectedBook === true) {
		parts.push({ selectedBookId: { not: null } });
	}
	if (input.hasSelectedBook === false) {
		parts.push({ selectedBookId: null });
	}
	if (input.telegramPollAnnounced === true) {
		parts.push({ telegramPollOpenSentAt: { not: null } });
	}
	if (input.telegramPollAnnounced === false) {
		parts.push({ telegramPollOpenSentAt: null });
	}
	if (input.deadlineOverdue === true) {
		parts.push({
			deadline: { lt: now },
			status: "voting",
		});
	}
	if (input.hasMidtermScheduled === true) {
		parts.push({ midtermAt: { not: null } });
	}
	if (input.hasMidtermScheduled === false) {
		parts.push({ midtermAt: null });
	}
	if (input.participantUsernames?.length) {
		parts.push({
			OR: input.participantUsernames.map((username) => ({
				participants: {
					some: {
						removedAt: null,
						user: { username },
					},
				},
			})),
		});
	}
	if (input.minSelectedBookPages != null) {
		parts.push({
			selectedBook: { pages: { gte: input.minSelectedBookPages } },
		});
	}
	if (input.maxSelectedBookPages != null) {
		parts.push({
			selectedBook: { pages: { lte: input.maxSelectedBookPages } },
		});
	}

	return mergeWhereFragments(...parts);
}

export async function buildAdminSittingListWhere(
	input: AdminSittingListQueryInput,
	db: Database,
): Promise<{ where: Prisma.SittingWhereInput | null; empty: boolean }> {
	const ranging = adminSittingListRanging.from(input);
	const searching = adminSittingListSearching.from(input);

	const minCountIds = await resolveMinCountSittingIds(db, input);
	if (minCountIds?.length === 0) {
		return { where: null, empty: true };
	}

	const where = mergeWhereFragments<Prisma.SittingWhereInput>(
		ranging.use(),
		searching.use(),
		adminSittingExtraWhere(input),
		{
			id: minCountIds ? { in: minCountIds } : undefined,
		},
	);

	return { where, empty: false };
}

async function pollVoteTotalsForSittings(
	db: Database,
	sittingIds: string[],
): Promise<Map<string, number>> {
	if (sittingIds.length === 0) {
		return new Map();
	}

	const options = await db.pollOption.findMany({
		where: { poll: { sittingId: { in: sittingIds } } },
		select: {
			_count: { select: { votes: true } },
			poll: { select: { sittingId: true } },
		},
	});

	const totals = new Map<string, number>();
	for (const option of options) {
		const sittingId = option.poll.sittingId;
		totals.set(sittingId, (totals.get(sittingId) ?? 0) + option._count.votes);
	}
	return totals;
}

async function participationBreakdownForSittings(
	db: Database,
	sittingIds: string[],
): Promise<
	Map<
		string,
		{
			active: number;
			completed: number;
			dnf: number;
			total: number;
		}
	>
> {
	const result = new Map<
		string,
		{ active: number; completed: number; dnf: number; total: number }
	>();

	if (sittingIds.length === 0) {
		return result;
	}

	const [totals, active, completed, dnf] = await Promise.all([
		db.participation.groupBy({
			by: ["sittingId"],
			where: { sittingId: { in: sittingIds } },
			_count: { _all: true },
		}),
		db.participation.groupBy({
			by: ["sittingId"],
			where: { sittingId: { in: sittingIds }, removedAt: null },
			_count: { _all: true },
		}),
		db.participation.groupBy({
			by: ["sittingId"],
			where: {
				sittingId: { in: sittingIds },
				progress: "completed",
				removedAt: null,
			},
			_count: { _all: true },
		}),
		db.participation.groupBy({
			by: ["sittingId"],
			where: {
				sittingId: { in: sittingIds },
				progress: "dnf",
				removedAt: null,
			},
			_count: { _all: true },
		}),
	]);

	for (const id of sittingIds) {
		result.set(id, { active: 0, completed: 0, dnf: 0, total: 0 });
	}

	for (const row of totals) {
		const entry = result.get(row.sittingId);
		if (entry) {
			entry.total = row._count._all;
		}
	}
	for (const row of active) {
		const entry = result.get(row.sittingId);
		if (entry) {
			entry.active = row._count._all;
		}
	}
	for (const row of completed) {
		const entry = result.get(row.sittingId);
		if (entry) {
			entry.completed = row._count._all;
		}
	}
	for (const row of dnf) {
		const entry = result.get(row.sittingId);
		if (entry) {
			entry.dnf = row._count._all;
		}
	}

	return result;
}

function mapAdminSittingListRow(
	row: SittingListRow,
	counts: {
		participants: number;
		activeParticipants: number;
		completedParticipants: number;
		dnfParticipants: number;
		pollOptions: number;
		pollVotes: number;
		postAttachments: number;
	},
) {
	return {
		id: row.id,
		slug: row.slug,
		status: row.status,
		deadline: row.deadline,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		readingStartedAt: row.readingStartedAt,
		midtermAt: row.midtermAt,
		telegramPollAnnounced: row.telegramPollOpenSentAt != null,
		selectedBook: row.selectedBook,
		pollSlug: row.poll?.slug ?? null,
		counts,
	};
}

function withStableSlugOrderBy(
	orderBy: Prisma.SittingOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.SittingOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

async function listAdminSittingsSortedByPollVotes(
	input: ListAdminSittingsInput,
	db: Database,
	where: Prisma.SittingWhereInput,
): Promise<ListAdminSittingsOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const sorting = adminSittingListSorting.from(input);
	const direction = sorting.sortDirection;

	const matching = await db.sitting.findMany({
		where,
		select: { id: true, slug: true },
	});

	const voteMap = await pollVoteTotalsForSittings(
		db,
		matching.map((row) => row.id),
	);

	const sortedIds = matching
		.map((row) => row.id)
		.toSorted((a, b) => {
			const diff = (voteMap.get(a) ?? 0) - (voteMap.get(b) ?? 0);
			if (diff !== 0) {
				return direction === "asc" ? diff : -diff;
			}
			const slugA = matching.find((row) => row.id === a)?.slug ?? "";
			const slugB = matching.find((row) => row.id === b)?.slug ?? "";
			return direction === "asc"
				? slugA.localeCompare(slugB)
				: slugB.localeCompare(slugA);
		});

	const total = sortedIds.length;
	const { skip, take } = pagination.use();
	const pageIds = sortedIds.slice(skip, skip + take);

	const rows = await db.sitting.findMany({
		where: { id: { in: pageIds } },
		select: adminSittingListSelect,
	});
	const rowById = new Map(rows.map((row) => [row.id, row]));
	const orderedRows = pageIds.flatMap((id) => {
		const row = rowById.get(id);
		return row ? [row] : [];
	});

	const [participationMap, voteTotals] = await Promise.all([
		participationBreakdownForSittings(db, pageIds),
		pollVoteTotalsForSittings(db, pageIds),
	]);

	return pagination.paginate(
		orderedRows.map((row) => {
			const participation = participationMap.get(row.id);
			return mapAdminSittingListRow(row, {
				participants: participation?.total ?? row._count.participants,
				activeParticipants: participation?.active ?? 0,
				completedParticipants: participation?.completed ?? 0,
				dnfParticipants: participation?.dnf ?? 0,
				pollOptions: row.poll?._count.options ?? 0,
				pollVotes: voteTotals.get(row.id) ?? 0,
				postAttachments: row._count.postAttachments,
			});
		}),
		total,
	);
}

export async function listAdminSittings(
	input: ListAdminSittingsInput,
	db: Database,
): Promise<ListAdminSittingsOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const sorting = adminSittingListSorting.from(input);

	const { where, empty } = await buildAdminSittingListWhere(input, db);
	if (empty || where === null) {
		return pagination.paginate([], 0);
	}

	if (sorting.sortBy === "pollVotes") {
		return listAdminSittingsSortedByPollVotes(input, db, where);
	}

	const [total, rows] = await Promise.all([
		db.sitting.count({ where }),
		db.sitting.findMany({
			...pagination.use(),
			where,
			orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
			select: adminSittingListSelect,
		}),
	]);

	const sittingIds = rows.map((row) => row.id);
	const [participationMap, voteTotals] = await Promise.all([
		participationBreakdownForSittings(db, sittingIds),
		pollVoteTotalsForSittings(db, sittingIds),
	]);

	return pagination.paginate(
		rows.map((row) => {
			const participation = participationMap.get(row.id);
			return mapAdminSittingListRow(row, {
				participants: participation?.total ?? row._count.participants,
				activeParticipants: participation?.active ?? 0,
				completedParticipants: participation?.completed ?? 0,
				dnfParticipants: participation?.dnf ?? 0,
				pollOptions: row.poll?._count.options ?? 0,
				pollVotes: voteTotals.get(row.id) ?? 0,
				postAttachments: row._count.postAttachments,
			});
		}),
		total,
	);
}

function emptyAdminSittingOverview(): AdminSittingOverviewOutput {
	return {
		kpis: {
			totalSittings: 0,
			ongoing: 0,
			voting: 0,
			reading: 0,
			finished: 0,
			withSelectedBook: 0,
			telegramAnnounced: 0,
			overdueVotingDeadlines: 0,
			startedLast30Days: 0,
			finishedLast30Days: 0,
		},
		sittingsByDay: buildAdditionsByDay([], 30),
		rankings: emptyAdminSittingRankings(),
	};
}

export async function getAdminSittingOverview(
	input: GetAdminSittingOverviewInput,
	db: Database,
): Promise<AdminSittingOverviewOutput> {
	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setUTCDate(now.getUTCDate() - 30);

	const { where, empty } = await buildAdminSittingListWhere(input, db);
	if (empty || where === null) {
		return emptyAdminSittingOverview();
	}

	const sittings = await db.sitting.findMany({
		where,
		select: {
			status: true,
			createdAt: true,
			updatedAt: true,
			selectedBookId: true,
			telegramPollOpenSentAt: true,
			deadline: true,
		},
	});

	let voting = 0;
	let reading = 0;
	let finished = 0;
	let withSelectedBook = 0;
	let telegramAnnounced = 0;
	let overdueVotingDeadlines = 0;
	let startedLast30Days = 0;
	let finishedLast30Days = 0;

	for (const sitting of sittings) {
		if (sitting.status === "voting") {
			voting += 1;
		} else if (sitting.status === "reading") {
			reading += 1;
		} else {
			finished += 1;
		}

		if (sitting.selectedBookId) {
			withSelectedBook += 1;
		}
		if (sitting.telegramPollOpenSentAt) {
			telegramAnnounced += 1;
		}
		if (sitting.status === "voting" && sitting.deadline < now) {
			overdueVotingDeadlines += 1;
		}
		if (sitting.createdAt >= thirtyDaysAgo) {
			startedLast30Days += 1;
		}
		if (sitting.status === "finished" && sitting.updatedAt >= thirtyDaysAgo) {
			finishedLast30Days += 1;
		}
	}

	const rankings = await loadAdminSittingRankings(db, where);

	return {
		kpis: {
			totalSittings: sittings.length,
			ongoing: voting + reading,
			voting,
			reading,
			finished,
			withSelectedBook,
			telegramAnnounced,
			overdueVotingDeadlines,
			startedLast30Days,
			finishedLast30Days,
		},
		sittingsByDay: buildAdditionsByDay(sittings, 30),
		rankings,
	};
}

function pollVoteBucket(votes: number): string {
	if (votes === 0) {
		return "No votes";
	}
	if (votes < 5) {
		return "1–4";
	}
	if (votes < 15) {
		return "5–14";
	}
	return "15+";
}

function selectedPagesBucket(pages: number): string {
	if (pages < 300) {
		return "Under 300";
	}
	if (pages < 500) {
		return "300–499";
	}
	return "500+";
}

export async function getAdminSittingStats(
	input: GetAdminSittingStatsInput,
	db: Database,
): Promise<GetAdminSittingStatsOutput> {
	const { where, empty } = await buildAdminSittingListWhere(input, db);
	if (empty || where === null) {
		return emptySittingStats();
	}

	const sittings = await db.sitting.findMany({
		where,
		select: {
			id: true,
			status: true,
			createdAt: true,
			selectedBook: { select: { pages: true } },
			_count: { select: { participants: true, postAttachments: true } },
			poll: { select: { id: true } },
		},
	});

	const sittingIds = sittings.map((row) => row.id);
	const voteTotals = await pollVoteTotalsForSittings(db, sittingIds);

	const statusDistribution = (["voting", "reading", "finished"] as const).map(
		(status) => ({
			status,
			count: sittings.filter((row) => row.status === status).length,
		}),
	);

	const participationMixMap = new Map<string, number>();
	const pollVoteMap = new Map<string, number>();
	const pagesMap = new Map<string, number>();

	let withPoll = 0;
	let withParticipants = 0;
	let withPosts = 0;
	let withSelectedBook = 0;

	for (const sitting of sittings) {
		const participants = sitting._count.participants;
		const bucket =
			participants === 0
				? "No participants"
				: participants < 5
					? "1–4 members"
					: participants < 10
						? "5–9 members"
						: "10+ members";
		participationMixMap.set(bucket, (participationMixMap.get(bucket) ?? 0) + 1);

		const votes = voteTotals.get(sitting.id) ?? 0;
		const voteLabel = pollVoteBucket(votes);
		pollVoteMap.set(voteLabel, (pollVoteMap.get(voteLabel) ?? 0) + 1);

		if (sitting.selectedBook) {
			withSelectedBook += 1;
			const pagesLabel = selectedPagesBucket(sitting.selectedBook.pages);
			pagesMap.set(pagesLabel, (pagesMap.get(pagesLabel) ?? 0) + 1);
		}

		if (sitting.poll) {
			withPoll += 1;
		}
		if (participants > 0) {
			withParticipants += 1;
		}
		if (sitting._count.postAttachments > 0) {
			withPosts += 1;
		}
	}

	const total = sittings.length;

	return {
		statusDistribution,
		sittingsByDay: buildAdditionsByDay(sittings, 30),
		participationMix: [...participationMixMap.entries()].map(
			([label, value]) => ({
				label,
				value,
			}),
		),
		pollVoteHistogram: [...pollVoteMap.entries()].map(([label, value]) => ({
			label,
			value,
		})),
		selectedBookPagesHistogram: [...pagesMap.entries()].map(
			([label, value]) => ({ label, value }),
		),
		engagementFunnel: [
			{ stage: "All sittings", count: total },
			{ stage: "Has poll", count: withPoll },
			{ stage: "Has participants", count: withParticipants },
			{ stage: "Book selected", count: withSelectedBook },
			{ stage: "Post attachments", count: withPosts },
		],
	};
}

function emptySittingStats(): GetAdminSittingStatsOutput {
	return {
		statusDistribution: [
			{ status: "voting", count: 0 },
			{ status: "reading", count: 0 },
			{ status: "finished", count: 0 },
		],
		sittingsByDay: [],
		participationMix: [],
		pollVoteHistogram: [],
		selectedBookPagesHistogram: [],
		engagementFunnel: [
			{ stage: "All sittings", count: 0 },
			{ stage: "Has poll", count: 0 },
			{ stage: "Has participants", count: 0 },
			{ stage: "Book selected", count: 0 },
			{ stage: "Post attachments", count: 0 },
		],
	};
}
