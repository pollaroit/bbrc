import type { Database, Prisma } from "@bbrc/db";
import type { z } from "zod";
import { mergeWhereFragments } from "../../utils/searching";
import type {
	AdminSittingOverviewOutput,
	AdminSittingRankingItemSchema,
} from "./admin-sitting.schema";

type SittingRankingItem = z.infer<typeof AdminSittingRankingItemSchema>;

const RANKING_LIMIT = 5;

function mapSittingRow(row: {
	slug: string;
	status: SittingRankingItem["status"];
	metric: number;
	secondaryMetric?: number;
	label?: string;
}): SittingRankingItem {
	return {
		slug: row.slug,
		status: row.status,
		metric: row.metric,
		secondaryMetric: row.secondaryMetric,
		label: row.label,
	};
}

async function pollVoteTotalsBySittingId(
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

async function distinctVotersBySittingId(
	db: Database,
	sittingIds: string[],
): Promise<Map<string, number>> {
	if (sittingIds.length === 0) {
		return new Map();
	}

	const votes = await db.pollVote.findMany({
		where: { option: { poll: { sittingId: { in: sittingIds } } } },
		select: {
			userId: true,
			option: { select: { poll: { select: { sittingId: true } } } },
		},
	});

	const votersBySitting = new Map<string, Set<string>>();
	for (const vote of votes) {
		const sittingId = vote.option.poll.sittingId;
		const set = votersBySitting.get(sittingId) ?? new Set<string>();
		set.add(vote.userId);
		votersBySitting.set(sittingId, set);
	}

	const result = new Map<string, number>();
	for (const [sittingId, voters] of votersBySitting) {
		result.set(sittingId, voters.size);
	}
	return result;
}

async function topSittingsByParticipants(
	db: Database,
	where: Prisma.SittingWhereInput,
	direction: "asc" | "desc",
): Promise<SittingRankingItem[]> {
	const rows = await db.sitting.findMany({
		where,
		orderBy: { participants: { _count: direction } },
		take: RANKING_LIMIT,
		select: {
			slug: true,
			status: true,
			_count: { select: { participants: true } },
		},
	});

	return rows.map((row) =>
		mapSittingRow({
			slug: row.slug,
			status: row.status,
			metric: row._count.participants,
		}),
	);
}

async function topSittingsByPollVotes(
	db: Database,
	where: Prisma.SittingWhereInput,
): Promise<SittingRankingItem[]> {
	const candidates = await db.sitting.findMany({
		where: mergeWhereFragments(where, { poll: { isNot: null } }),
		select: { id: true, slug: true, status: true },
		take: 50,
		orderBy: { createdAt: "desc" },
	});

	const voteMap = await pollVoteTotalsBySittingId(
		db,
		candidates.map((row) => row.id),
	);

	return candidates
		.map((row) => ({
			slug: row.slug,
			status: row.status,
			metric: voteMap.get(row.id) ?? 0,
		}))
		.toSorted((a, b) => b.metric - a.metric)
		.slice(0, RANKING_LIMIT)
		.map((row) => mapSittingRow(row));
}

async function topSittingsByDistinctVoters(
	db: Database,
	where: Prisma.SittingWhereInput,
): Promise<SittingRankingItem[]> {
	const candidates = await db.sitting.findMany({
		where: mergeWhereFragments(where, { poll: { isNot: null } }),
		select: { id: true, slug: true, status: true },
		take: 50,
		orderBy: { createdAt: "desc" },
	});

	const voterMap = await distinctVotersBySittingId(
		db,
		candidates.map((row) => row.id),
	);

	return candidates
		.map((row) => ({
			slug: row.slug,
			status: row.status,
			metric: voterMap.get(row.id) ?? 0,
		}))
		.toSorted((a, b) => b.metric - a.metric)
		.slice(0, RANKING_LIMIT)
		.map((row) => mapSittingRow({ ...row, label: "voters" }));
}

async function topSittingsByProgressCount(
	db: Database,
	where: Prisma.SittingWhereInput,
	progress: "completed" | "dnf",
): Promise<SittingRankingItem[]> {
	const grouped = await db.participation.groupBy({
		by: ["sittingId"],
		where: {
			progress,
			removedAt: null,
			sitting: where,
		},
		_count: { _all: true },
		orderBy: { _count: { sittingId: "desc" } },
		take: RANKING_LIMIT,
	});

	const sittingIds = grouped.map((row) => row.sittingId);
	const sittings = await db.sitting.findMany({
		where: { id: { in: sittingIds } },
		select: { id: true, slug: true, status: true },
	});
	const byId = new Map(sittings.map((row) => [row.id, row]));

	return grouped.flatMap((row) => {
		const sitting = byId.get(row.sittingId);
		if (!sitting) {
			return [];
		}
		return [
			mapSittingRow({
				slug: sitting.slug,
				status: sitting.status,
				metric: row._count._all,
			}),
		];
	});
}

async function topSittingsByPostAttachments(
	db: Database,
	where: Prisma.SittingWhereInput,
): Promise<SittingRankingItem[]> {
	const rows = await db.sitting.findMany({
		where,
		orderBy: { postAttachments: { _count: "desc" } },
		take: RANKING_LIMIT,
		select: {
			slug: true,
			status: true,
			_count: { select: { postAttachments: true } },
		},
	});

	return rows.map((row) =>
		mapSittingRow({
			slug: row.slug,
			status: row.status,
			metric: row._count.postAttachments,
		}),
	);
}

async function topSittingsByReadingDuration(
	db: Database,
	where: Prisma.SittingWhereInput,
): Promise<SittingRankingItem[]> {
	const rows = await db.sitting.findMany({
		where: mergeWhereFragments(where, {
			readingStartedAt: { not: null },
			status: "finished",
		}),
		select: {
			slug: true,
			status: true,
			readingStartedAt: true,
			updatedAt: true,
		},
		take: 40,
	});

	return rows
		.map((row) => {
			const start = row.readingStartedAt?.getTime() ?? 0;
			const end = row.updatedAt.getTime();
			const days = Math.max(0, Math.round((end - start) / 86_400_000));
			return mapSittingRow({
				slug: row.slug,
				status: row.status,
				metric: days,
				label: "days reading",
			});
		})
		.toSorted((a, b) => b.metric - a.metric)
		.slice(0, RANKING_LIMIT);
}

async function topSittingsByCompletionRate(
	db: Database,
	where: Prisma.SittingWhereInput,
): Promise<SittingRankingItem[]> {
	const sittings = await db.sitting.findMany({
		where,
		select: { id: true, slug: true, status: true },
		take: 40,
	});

	const sittingIds = sittings.map((row) => row.id);
	const [activeRows, completedRows] = await Promise.all([
		db.participation.groupBy({
			by: ["sittingId"],
			where: { sittingId: { in: sittingIds }, removedAt: null },
			_count: { _all: true },
		}),
		db.participation.groupBy({
			by: ["sittingId"],
			where: {
				sittingId: { in: sittingIds },
				removedAt: null,
				progress: "completed",
			},
			_count: { _all: true },
		}),
	]);

	const activeById = new Map(
		activeRows.map((row) => [row.sittingId, row._count._all]),
	);
	const completedById = new Map(
		completedRows.map((row) => [row.sittingId, row._count._all]),
	);

	return sittings
		.map((row) => {
			const active = activeById.get(row.id) ?? 0;
			const completed = completedById.get(row.id) ?? 0;
			const rate = active === 0 ? 0 : Math.round((completed / active) * 100);
			return mapSittingRow({
				slug: row.slug,
				status: row.status,
				metric: rate,
				secondaryMetric: completed,
				label: "% completed",
			});
		})
		.filter((row) => row.metric > 0)
		.toSorted((a, b) => b.metric - a.metric)
		.slice(0, RANKING_LIMIT);
}

async function soonestVotingDeadlines(
	db: Database,
	where: Prisma.SittingWhereInput,
): Promise<SittingRankingItem[]> {
	const now = new Date();
	const rows = await db.sitting.findMany({
		where: mergeWhereFragments(where, {
			status: "voting",
			deadline: { gte: now },
		}),
		orderBy: { deadline: "asc" },
		take: RANKING_LIMIT,
		select: { slug: true, status: true, deadline: true },
	});

	return rows.map((row) =>
		mapSittingRow({
			slug: row.slug,
			status: row.status,
			metric: row.deadline.getTime(),
			label: "deadline",
		}),
	);
}

export function emptyAdminSittingRankings(): AdminSittingOverviewOutput["rankings"] {
	return {
		mostParticipants: [],
		mostPollVotes: [],
		mostCompletedReaders: [],
		mostPostAttachments: [],
		longestReadingPhase: [],
		leastParticipants: [],
		mostDistinctVoters: [],
		mostDnfParticipants: [],
		highestCompletionRate: [],
		soonestVotingDeadlines: [],
	};
}

export async function loadAdminSittingRankings(
	db: Database,
	where: Prisma.SittingWhereInput,
): Promise<AdminSittingOverviewOutput["rankings"]> {
	const [
		mostParticipants,
		leastParticipants,
		mostPollVotes,
		mostDistinctVoters,
		mostCompletedReaders,
		mostDnfParticipants,
		mostPostAttachments,
		longestReadingPhase,
		highestCompletionRate,
		soonestVotingDeadlinesList,
	] = await Promise.all([
		topSittingsByParticipants(db, where, "desc"),
		topSittingsByParticipants(db, where, "asc"),
		topSittingsByPollVotes(db, where),
		topSittingsByDistinctVoters(db, where),
		topSittingsByProgressCount(db, where, "completed"),
		topSittingsByProgressCount(db, where, "dnf"),
		topSittingsByPostAttachments(db, where),
		topSittingsByReadingDuration(db, where),
		topSittingsByCompletionRate(db, where),
		soonestVotingDeadlines(db, where),
	]);

	return {
		mostParticipants,
		leastParticipants,
		mostPollVotes,
		mostDistinctVoters,
		mostCompletedReaders,
		mostDnfParticipants,
		mostPostAttachments,
		longestReadingPhase,
		highestCompletionRate,
		soonestVotingDeadlines: soonestVotingDeadlinesList,
	};
}
