import type { Database, Prisma } from "@bbrc/db";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import {
	type BookListQueryInput,
	buildBookListWhereWithAuthors,
} from "../book/book-list-where";
import {
	adminBookListRanging,
	adminBookListSearching,
	adminBookListSorting,
} from "./admin-book.listing";
import type {
	AdminBookOverviewOutput,
	GetAdminBookStatsInput,
	GetAdminBookStatsOutput,
	ListAdminBooksInput,
	ListAdminBooksOutput,
} from "./admin-book.schema";
import { adminBookListSelect } from "./admin-book.schema";
import { loadAdminBookRankings } from "./admin-book-rankings";

type AdminBookListRow = Prisma.BookGetPayload<{
	select: typeof adminBookListSelect;
}>;

function withStableSlugOrderBy(
	orderBy: Prisma.BookOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.BookOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

function distinctAuthorCount(rows: { authors: string[] }[]): number {
	const names = new Set<string>();
	for (const row of rows) {
		for (const author of row.authors) {
			const trimmed = author.trim();
			if (trimmed) {
				names.add(trimmed);
			}
		}
	}
	return names.size;
}

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

async function resolveLatestSittingSlugs(
	db: Database,
	bookIds: string[],
): Promise<Map<string, string>> {
	const result = new Map<string, string>();
	if (bookIds.length === 0) {
		return result;
	}

	const selectedSittings = await db.sitting.findMany({
		where: { selectedBookId: { in: bookIds } },
		orderBy: { createdAt: "desc" },
		select: { selectedBookId: true, slug: true },
	});

	for (const sitting of selectedSittings) {
		if (sitting.selectedBookId && !result.has(sitting.selectedBookId)) {
			result.set(sitting.selectedBookId, sitting.slug);
		}
	}

	const missing = bookIds.filter((id) => !result.has(id));
	if (missing.length === 0) {
		return result;
	}

	const pollOptions = await db.pollOption.findMany({
		where: { bookId: { in: missing } },
		orderBy: { createdAt: "desc" },
		select: {
			bookId: true,
			poll: { select: { sitting: { select: { slug: true } } } },
		},
	});

	for (const option of pollOptions) {
		if (!result.has(option.bookId)) {
			result.set(option.bookId, option.poll.sitting.slug);
		}
	}

	return result;
}

async function pollVoteCountsByBookId(
	db: Database,
	bookIds: string[],
): Promise<Map<string, number>> {
	const counts = new Map<string, number>();
	if (bookIds.length === 0) {
		return counts;
	}

	const options = await db.pollOption.findMany({
		where: { bookId: { in: bookIds } },
		select: { bookId: true, _count: { select: { votes: true } } },
	});

	for (const option of options) {
		counts.set(
			option.bookId,
			(counts.get(option.bookId) ?? 0) + option._count.votes,
		);
	}

	return counts;
}

function mapAdminBookListRow(
	row: AdminBookListRow,
	pollVotes: number,
	latestSittingSlug: string | null,
) {
	const excerpt = row.excerpt?.trim();
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		authors: row.authors,
		pages: row.pages,
		status: row.status,
		openLibraryRating: row.openLibraryRating,
		publishedIn: row.publishedIn,
		averageRating: row.averageRating,
		coverId: row.coverId,
		olid: row.olid,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		excerptPreview:
			excerpt && excerpt.length > 120
				? `${excerpt.slice(0, 119).trimEnd()}…`
				: (excerpt ?? null),
		requestedBy: row.requestedBy,
		approvedBy: row.approvedBy,
		counts: {
			favorites: row._count.favorites,
			feedbacks: row._count.feedbacks,
			shelfBooks: row._count.shelfBooks,
			postAttachments: row._count.postAttachments,
			pollOptions: row._count.polls,
			pollVotes,
		},
		latestSittingSlug,
	};
}

function adminExtraWhere(input: ListAdminBooksInput): Prisma.BookWhereInput {
	return mergeWhereFragments({
		averageRating: input.missingClubRating ? { equals: null } : undefined,
		openLibraryRating: input.missingOpenLibraryRating
			? { equals: null }
			: undefined,
	});
}

export async function getAdminBookOverview(
	db: Database,
): Promise<AdminBookOverviewOutput> {
	const now = new Date();
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setUTCDate(now.getUTCDate() - 7);
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setUTCDate(now.getUTCDate() - 30);

	const chartSince = new Date(now);
	chartSince.setUTCDate(now.getUTCDate() - 29);
	chartSince.setUTCHours(0, 0, 0, 0);

	const [
		totalBooks,
		statusGroups,
		pageAgg,
		allAuthorsRows,
		addedLast7Days,
		addedLast30Days,
		pendingBookRequests,
		blockedOpenLibraryWorks,
		recentBooks,
		rankings,
	] = await Promise.all([
		db.book.count(),
		db.book.groupBy({ by: ["status"], _count: { _all: true } }),
		db.book.aggregate({ _avg: { pages: true } }),
		db.book.findMany({ select: { authors: true } }),
		db.book.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
		db.book.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
		db.bookRequest.count({ where: { status: "pending" } }),
		db.blockedOpenLibraryWork.count(),
		db.book.findMany({
			where: { createdAt: { gte: chartSince } },
			select: { createdAt: true },
			orderBy: { createdAt: "asc" },
		}),
		loadAdminBookRankings(db),
	]);

	const statusCounts = {
		completed: 0,
		reading: 0,
		wishlist: 0,
	};
	for (const group of statusGroups) {
		statusCounts[group.status] = group._count._all;
	}

	return {
		kpis: {
			totalBooks,
			distinctAuthors: distinctAuthorCount(allAuthorsRows),
			averagePages: Math.round((pageAgg._avg.pages ?? 0) * 10) / 10,
			statusCounts,
			addedLast7Days,
			addedLast30Days,
			pendingBookRequests,
			blockedOpenLibraryWorks,
		},
		additionsByDay: buildAdditionsByDay(recentBooks, 30),
		rankings,
	};
}

export async function listAdminBooks(
	input: ListAdminBooksInput,
	db: Database,
): Promise<ListAdminBooksOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const sorting = adminBookListSorting.from(input);
	const ranging = adminBookListRanging.from(input);
	const searching = adminBookListSearching.from(input);

	const {
		page: _page,
		limit: _limit,
		missingClubRating: _missingClubRating,
		missingOpenLibraryRating: _missingOpenLibraryRating,
		...listQuery
	} = input;
	const baseWhere = await buildBookListWhereWithAuthors(
		listQuery as BookListQueryInput,
		db,
	);
	if (baseWhere === null) {
		return pagination.paginate([], 0);
	}

	const where = mergeWhereFragments<Prisma.BookWhereInput>(
		baseWhere,
		ranging.use(),
		searching.use(),
		adminExtraWhere(input),
	);

	const [total, rows] = await Promise.all([
		db.book.count({ where }),
		db.book.findMany({
			...pagination.use(),
			where,
			orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
			select: adminBookListSelect,
		}),
	]);

	const bookIds = rows.map((row) => row.id);
	const [pollVoteMap, sittingSlugMap] = await Promise.all([
		pollVoteCountsByBookId(db, bookIds),
		resolveLatestSittingSlugs(db, bookIds),
	]);

	return pagination.paginate(
		rows.map((row) =>
			mapAdminBookListRow(
				row,
				pollVoteMap.get(row.id) ?? 0,
				sittingSlugMap.get(row.id) ?? null,
			),
		),
		total,
	);
}

function pagesBucket(pages: number): string {
	if (pages < 200) {
		return "Under 200";
	}
	if (pages < 400) {
		return "200–399";
	}
	if (pages < 600) {
		return "400–599";
	}
	return "600+";
}

function ratingBucket(rating: number): string {
	const clamped = Math.min(5, Math.max(0, rating));
	if (clamped < 1) {
		return "0–0.9";
	}
	const floor = Math.floor(clamped);
	return `${floor}.0–${floor}.9`;
}

export async function getAdminBookStats(
	input: GetAdminBookStatsInput,
	db: Database,
): Promise<GetAdminBookStatsOutput> {
	const hasRange = input.rangeMin != null || input.rangeMax != null;
	const listQuery = {
		sortBy: "createdAt" as const,
		sortDirection: "desc" as const,
		statuses: input.statuses,
		authors: input.authors,
		...(hasRange
			? {
					rangeBy: "createdAt" as const,
					rangeMin: input.rangeMin,
					rangeMax: input.rangeMax,
				}
			: {}),
	} as BookListQueryInput;

	const where = await buildBookListWhereWithAuthors(listQuery, db);
	if (where === null) {
		return emptyBookStats();
	}

	const books = await db.book.findMany({
		where,
		select: {
			id: true,
			status: true,
			pages: true,
			publishedIn: true,
			openLibraryRating: true,
			averageRating: true,
			createdAt: true,
			_count: {
				select: {
					favorites: true,
					feedbacks: true,
					shelfBooks: true,
					postAttachments: true,
				},
			},
		},
	});

	const bookIds = books.map((b) => b.id);
	const [selectedBookIds, pollBookIds] = await Promise.all([
		db.sitting.findMany({
			where: { selectedBookId: { in: bookIds } },
			select: { selectedBookId: true },
			distinct: ["selectedBookId"],
		}),
		db.pollOption.findMany({
			where: { bookId: { in: bookIds } },
			select: { bookId: true },
			distinct: ["bookId"],
		}),
	]);

	const selectedSet = new Set(
		selectedBookIds.flatMap((r) =>
			r.selectedBookId ? [r.selectedBookId] : [],
		),
	);
	const pollSet = new Set(pollBookIds.map((r) => r.bookId));

	let pollOnly = 0;
	let selectedCount = 0;
	for (const id of bookIds) {
		if (selectedSet.has(id)) {
			selectedCount += 1;
		} else if (pollSet.has(id)) {
			pollOnly += 1;
		}
	}

	const statusDistribution = (
		["completed", "reading", "wishlist"] as const
	).map((status) => ({
		status,
		count: books.filter((b) => b.status === status).length,
	}));

	const pagesHistogramMap = new Map<string, number>();
	const decadeMap = new Map<string, number>();
	const ratingMap = new Map<string, { openLibrary: number; club: number }>();

	for (const book of books) {
		const pagesLabel = pagesBucket(book.pages);
		pagesHistogramMap.set(
			pagesLabel,
			(pagesHistogramMap.get(pagesLabel) ?? 0) + 1,
		);

		const decade = `${Math.floor(book.publishedIn / 10) * 10}s`;
		decadeMap.set(decade, (decadeMap.get(decade) ?? 0) + 1);

		if (book.openLibraryRating != null) {
			const key = ratingBucket(book.openLibraryRating);
			const entry = ratingMap.get(key) ?? { openLibrary: 0, club: 0 };
			entry.openLibrary += 1;
			ratingMap.set(key, entry);
		}
		if (book.averageRating != null) {
			const key = ratingBucket(book.averageRating);
			const entry = ratingMap.get(key) ?? { openLibrary: 0, club: 0 };
			entry.club += 1;
			ratingMap.set(key, entry);
		}
	}

	const catalogTotal = books.length;
	const favorited = books.filter((b) => b._count.favorites > 0).length;
	const reviewed = books.filter((b) => b._count.feedbacks > 0).length;
	const shelved = books.filter((b) => b._count.shelfBooks > 0).length;
	const attached = books.filter((b) => b._count.postAttachments > 0).length;

	return {
		statusDistribution,
		additionsByDay: buildAdditionsByDay(books, 30),
		pagesHistogram: [...pagesHistogramMap.entries()]
			.map(([label, value]) => ({ label, value }))
			.sort((a, b) => a.label.localeCompare(b.label)),
		publishedByDecade: [...decadeMap.entries()]
			.map(([label, value]) => ({ label, value }))
			.sort((a, b) => a.label.localeCompare(b.label)),
		ratingBuckets: [...ratingMap.entries()]
			.map(([bucket, counts]) => ({
				bucket,
				openLibrary: counts.openLibrary,
				club: counts.club,
			}))
			.sort((a, b) => a.bucket.localeCompare(b.bucket)),
		engagementFunnel: [
			{ stage: "In catalog", count: catalogTotal },
			{ stage: "Favorited", count: favorited },
			{ stage: "Reviewed", count: reviewed },
			{ stage: "Shelved", count: shelved },
			{ stage: "In posts", count: attached },
		],
		sittingInvolvement: [
			{ kind: "Selected for sitting", count: selectedCount },
			{ kind: "Poll option only", count: pollOnly },
		],
	};
}

function emptyBookStats(): GetAdminBookStatsOutput {
	return {
		statusDistribution: [
			{ status: "completed", count: 0 },
			{ status: "reading", count: 0 },
			{ status: "wishlist", count: 0 },
		],
		additionsByDay: [],
		pagesHistogram: [],
		publishedByDecade: [],
		ratingBuckets: [],
		engagementFunnel: [
			{ stage: "In catalog", count: 0 },
			{ stage: "Favorited", count: 0 },
			{ stage: "Reviewed", count: 0 },
			{ stage: "Shelved", count: 0 },
			{ stage: "In posts", count: 0 },
		],
		sittingInvolvement: [
			{ kind: "Selected for sitting", count: 0 },
			{ kind: "Poll option only", count: 0 },
		],
	};
}
