import type { Database, Prisma } from "@bbrc/db";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import {
	type AdminSeriesListFilters,
	adminSeriesListRanging,
	adminSeriesListSearching,
	adminSeriesListSorting,
} from "./admin-series.listing";
import type {
	AdminSeriesOverviewOutput,
	GetAdminSeriesOverviewInput,
	GetAdminSeriesStatsInput,
	GetAdminSeriesStatsOutput,
	ListAdminSeriesInput,
	ListAdminSeriesOutput,
} from "./admin-series.schema";
import { adminSeriesListSelect } from "./admin-series.schema";

type AdminSeriesListQueryInput =
	| GetAdminSeriesOverviewInput
	| ListAdminSeriesInput
	| GetAdminSeriesStatsInput;

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

async function seriesIdsWithMinBooks(
	db: Database,
	min: number,
): Promise<string[]> {
	const rows = await db.seriesBook.groupBy({
		by: ["seriesId"],
		_count: { _all: true },
		having: { seriesId: { _count: { gte: min } } },
	});
	return rows.map((row) => row.seriesId);
}

function adminSeriesExtraWhere(
	input: AdminSeriesListFilters,
): Prisma.SeriesWhereInput {
	const parts: Prisma.SeriesWhereInput[] = [];

	if (input.hasDescription === true) {
		parts.push({ description: { not: null } });
	}
	if (input.hasDescription === false) {
		parts.push({ description: null });
	}

	return mergeWhereFragments(...parts);
}

export async function buildAdminSeriesListWhere(
	input: AdminSeriesListQueryInput,
	db: Database,
): Promise<{ where: Prisma.SeriesWhereInput | null; empty: boolean }> {
	const ranging = adminSeriesListRanging.from(input);
	const searching = adminSeriesListSearching.from(input);

	let idFilter: string[] | null = null;
	if (input.minBooks != null && input.minBooks > 0) {
		const matched = await seriesIdsWithMinBooks(db, input.minBooks);
		if (matched.length === 0) {
			return { where: null, empty: true };
		}
		idFilter = matched;
	}

	const where = mergeWhereFragments<Prisma.SeriesWhereInput>(
		ranging.use(),
		searching.use(),
		adminSeriesExtraWhere(input),
		{
			id: idFilter ? { in: idFilter } : undefined,
		},
	);

	return { where, empty: false };
}

function mapAdminSeriesListRow(
	row: Prisma.SeriesGetPayload<{ select: typeof adminSeriesListSelect }>,
) {
	return {
		slug: row.slug,
		title: row.title,
		description: row.description,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		bookCount: row._count.books,
	};
}

function withStableSeriesSlugOrderBy(
	orderBy: Prisma.SeriesOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.SeriesOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

type SeriesOverviewRow = {
	slug: string;
	title: string;
	description: string | null;
	createdAt: Date;
	updatedAt: Date;
	_count: { books: number };
};

function buildSeriesRankings(rows: SeriesOverviewRow[]) {
	const toItem = (
		row: SeriesOverviewRow,
		metric: number,
	): AdminSeriesOverviewOutput["rankings"]["mostBooks"][number] => ({
		slug: row.slug,
		title: row.title,
		bookCount: row._count.books,
		metric,
	});

	const mostBooks = [...rows]
		.sort((a, b) => b._count.books - a._count.books)
		.slice(0, 8)
		.map((row) => toItem(row, row._count.books));

	const recentlyUpdated = [...rows]
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
		.slice(0, 8)
		.map((row) => toItem(row, row.updatedAt.getTime()));

	const emptySeries = rows
		.filter((row) => row._count.books === 0)
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
		.slice(0, 8)
		.map((row) => toItem(row, 0));

	return { mostBooks, recentlyUpdated, emptySeries };
}

function emptyAdminSeriesOverview(): AdminSeriesOverviewOutput {
	return {
		kpis: {
			totalSeries: 0,
			totalBooksInSeries: 0,
			emptySeries: 0,
			withDescription: 0,
			avgBooksPerSeries: 0,
			createdLast7Days: 0,
			createdLast30Days: 0,
		},
		seriesByDay: buildAdditionsByDay([], 30),
		rankings: {
			mostBooks: [],
			recentlyUpdated: [],
			emptySeries: [],
		},
	};
}

export async function getAdminSeriesOverview(
	input: GetAdminSeriesOverviewInput,
	db: Database,
): Promise<AdminSeriesOverviewOutput> {
	const now = new Date();
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setUTCDate(now.getUTCDate() - 7);
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setUTCDate(now.getUTCDate() - 30);

	const { where, empty } = await buildAdminSeriesListWhere(input, db);
	if (empty || where === null) {
		return emptyAdminSeriesOverview();
	}

	const rows = await db.series.findMany({
		where,
		select: {
			slug: true,
			title: true,
			description: true,
			createdAt: true,
			updatedAt: true,
			_count: { select: { books: true } },
		},
	});

	let totalBooksInSeries = 0;
	let emptySeries = 0;
	let withDescription = 0;
	let createdLast7Days = 0;
	let createdLast30Days = 0;

	for (const row of rows) {
		totalBooksInSeries += row._count.books;
		if (row._count.books === 0) {
			emptySeries += 1;
		}
		if (row.description?.trim()) {
			withDescription += 1;
		}
		if (row.createdAt >= sevenDaysAgo) {
			createdLast7Days += 1;
		}
		if (row.createdAt >= thirtyDaysAgo) {
			createdLast30Days += 1;
		}
	}

	const totalSeries = rows.length;
	const avgBooksPerSeries =
		totalSeries > 0 ? totalBooksInSeries / totalSeries : 0;

	return {
		kpis: {
			totalSeries,
			totalBooksInSeries,
			emptySeries,
			withDescription,
			avgBooksPerSeries: Math.round(avgBooksPerSeries * 10) / 10,
			createdLast7Days,
			createdLast30Days,
		},
		seriesByDay: buildAdditionsByDay(rows, 30),
		rankings: buildSeriesRankings(rows),
	};
}

export async function listAdminSeries(
	input: ListAdminSeriesInput,
	db: Database,
): Promise<ListAdminSeriesOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const sorting = adminSeriesListSorting.from(input);

	const { where, empty } = await buildAdminSeriesListWhere(input, db);
	if (empty || where === null) {
		return pagination.paginate([], 0);
	}

	const [total, rows] = await Promise.all([
		db.series.count({ where }),
		db.series.findMany({
			...pagination.use(),
			where,
			orderBy: withStableSeriesSlugOrderBy(
				sorting.use(),
				sorting.sortDirection,
			),
			select: adminSeriesListSelect,
		}),
	]);

	return pagination.paginate(rows.map(mapAdminSeriesListRow), total);
}

function booksPerSeriesBucket(count: number): string {
	if (count === 0) {
		return "Empty";
	}
	if (count <= 3) {
		return "1–3 books";
	}
	if (count <= 7) {
		return "4–7 books";
	}
	return "8+ books";
}

export async function getAdminSeriesStats(
	input: GetAdminSeriesStatsInput,
	db: Database,
): Promise<GetAdminSeriesStatsOutput> {
	const { where, empty } = await buildAdminSeriesListWhere(input, db);
	if (empty || where === null) {
		return {
			seriesByDay: buildAdditionsByDay([], 30),
			booksPerSeriesHistogram: [],
			coverageFunnel: [],
		};
	}

	const rows = await db.series.findMany({
		where,
		select: {
			createdAt: true,
			description: true,
			_count: { select: { books: true } },
		},
	});

	const booksHistogram = new Map<string, number>();
	let withDescription = 0;
	let withBooks = 0;

	for (const row of rows) {
		const bucket = booksPerSeriesBucket(row._count.books);
		booksHistogram.set(bucket, (booksHistogram.get(bucket) ?? 0) + 1);
		if (row.description?.trim()) {
			withDescription += 1;
		}
		if (row._count.books > 0) {
			withBooks += 1;
		}
	}

	const total = rows.length;

	return {
		seriesByDay: buildAdditionsByDay(rows, 30),
		booksPerSeriesHistogram: [...booksHistogram.entries()].map(
			([label, value]) => ({
				label,
				value,
			}),
		),
		coverageFunnel: [
			{ stage: "All series", count: total },
			{ stage: "With description", count: withDescription },
			{ stage: "With at least one book", count: withBooks },
			{
				stage: "Fully populated (3+ books)",
				count: rows.filter((row) => row._count.books >= 3).length,
			},
		],
	};
}
