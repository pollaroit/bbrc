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
	GetAdminBookOverviewInput,
	GetAdminBookStatsInput,
	GetAdminBookStatsOutput,
	ListAdminBooksInput,
	ListAdminBooksOutput,
} from "./admin-book.schema";
import { adminBookListSelect } from "./admin-book.schema";
import {
	emptyAdminBookRankings,
	loadAdminBookRankings,
} from "./admin-book-rankings";

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
			reads: row._count.reads,
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

function adminExtraWhere(
	input: GetAdminBookOverviewInput | ListAdminBooksInput,
): Prisma.BookWhereInput {
	const clubRatingRange =
		input.minAverageRating == null && input.maxAverageRating == null
			? undefined
			: {
					gte: input.minAverageRating ?? undefined,
					lte: input.maxAverageRating ?? undefined,
				};

	return mergeWhereFragments({
		averageRating: input.missingClubRating ? { equals: null } : clubRatingRange,
		openLibraryRating: input.missingOpenLibraryRating
			? { equals: null }
			: undefined,
	});
}

function intersectBookIds(
	current: string[] | null,
	next: string[],
): string[] | null {
	if (current === null) {
		return next;
	}
	const nextSet = new Set(next);
	return current.filter((id) => nextSet.has(id));
}

async function bookIdsWithMinRelationCount(
	db: Database,
	relation: "feedbacks" | "favorites" | "postAttachments" | "polls",
	min: number,
): Promise<string[]> {
	if (min <= 0) {
		return [];
	}

	switch (relation) {
		case "feedbacks": {
			const rows = await db.feedback.groupBy({
				by: ["bookId"],
				_count: { _all: true },
				having: { bookId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.bookId);
		}
		case "favorites": {
			const rows = await db.favorite.groupBy({
				by: ["bookId"],
				_count: { _all: true },
				having: { bookId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.bookId);
		}
		case "postAttachments": {
			const rows = await db.postAttachment.groupBy({
				by: ["bookId"],
				where: { bookId: { not: null } },
				_count: { _all: true },
				having: { bookId: { _count: { gte: min } } },
			});
			return rows.flatMap((row) => (row.bookId ? [row.bookId] : []));
		}
		case "polls": {
			const rows = await db.pollOption.groupBy({
				by: ["bookId"],
				_count: { _all: true },
				having: { bookId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.bookId);
		}
	}
}

async function bookIdsWithMinPollVotes(
	db: Database,
	min: number,
): Promise<string[]> {
	if (min <= 0) {
		return [];
	}

	const options = await db.pollOption.findMany({
		select: { bookId: true, _count: { select: { votes: true } } },
	});

	const votesByBook = new Map<string, number>();
	for (const option of options) {
		votesByBook.set(
			option.bookId,
			(votesByBook.get(option.bookId) ?? 0) + option._count.votes,
		);
	}

	return [...votesByBook.entries()]
		.filter(([, votes]) => votes >= min)
		.map(([bookId]) => bookId);
}

type AdminBookMinCountInput = Pick<
	AdminBookListQueryInput,
	| "minFeedbacks"
	| "minFavorites"
	| "minPostAttachments"
	| "minPollOptions"
	| "minPollVotes"
>;

async function resolveMinCountBookIds(
	db: Database,
	input: AdminBookMinCountInput,
): Promise<string[] | null> {
	const filters: Array<{
		key: keyof AdminBookMinCountInput;
		resolve: () => Promise<string[]>;
	}> = [
		{
			key: "minFeedbacks",
			resolve: () =>
				bookIdsWithMinRelationCount(db, "feedbacks", input.minFeedbacks ?? 0),
		},
		{
			key: "minFavorites",
			resolve: () =>
				bookIdsWithMinRelationCount(db, "favorites", input.minFavorites ?? 0),
		},
		{
			key: "minPostAttachments",
			resolve: () =>
				bookIdsWithMinRelationCount(
					db,
					"postAttachments",
					input.minPostAttachments ?? 0,
				),
		},
		{
			key: "minPollOptions",
			resolve: () =>
				bookIdsWithMinRelationCount(db, "polls", input.minPollOptions ?? 0),
		},
		{
			key: "minPollVotes",
			resolve: () => bookIdsWithMinPollVotes(db, input.minPollVotes ?? 0),
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

		ids = intersectBookIds(ids, matched);
		if (ids?.length === 0) {
			return [];
		}
	}

	return ids;
}

async function bookIdsWithReadsCountBounds(
	db: Database,
	min?: number,
	max?: number,
): Promise<string[] | null> {
	if (min == null && max == null) {
		return null;
	}

	const effectiveMin = min ?? 0;
	const effectiveMax = max ?? Number.POSITIVE_INFINITY;

	if (effectiveMax < effectiveMin) {
		return [];
	}

	if (effectiveMax === 0) {
		const rows = await db.book.findMany({
			where: { reads: { none: {} } },
			select: { id: true },
		});
		return rows.map((row) => row.id);
	}

	const grouped = await db.read.groupBy({
		by: ["bookId"],
		_count: { _all: true },
	});

	const matched = grouped
		.filter((row) => {
			const count = row._count._all;
			return count >= effectiveMin && count <= effectiveMax;
		})
		.map((row) => row.bookId);

	if (effectiveMin > 0) {
		return matched;
	}

	const withReads = new Set(grouped.map((row) => row.bookId));
	const zeroReadBooks = await db.book.findMany({
		where: withReads.size > 0 ? { id: { notIn: [...withReads] } } : undefined,
		select: { id: true },
	});

	return [...matched, ...zeroReadBooks.map((row) => row.id)];
}

type AdminBookListQueryInput = GetAdminBookOverviewInput | ListAdminBooksInput;

export async function buildAdminBookListWhere(
	input: AdminBookListQueryInput,
	db: Database,
): Promise<{ where: Prisma.BookWhereInput | null; empty: boolean }> {
	const ranging = adminBookListRanging.from(input);
	const searching = adminBookListSearching.from(input);

	const {
		page: _page,
		limit: _limit,
		sortBy: _sortBy,
		sortDirection: _sortDirection,
		missingClubRating: _missingClubRating,
		missingOpenLibraryRating: _missingOpenLibraryRating,
		...listQuery
	} = input as ListAdminBooksInput;

	let minCountIds = await resolveMinCountBookIds(db, input);
	if (minCountIds?.length === 0) {
		return { where: null, empty: true };
	}

	const readsCountIds = await bookIdsWithReadsCountBounds(
		db,
		input.minReads ?? undefined,
		input.maxReads ?? undefined,
	);
	if (readsCountIds !== null) {
		if (readsCountIds.length === 0) {
			return { where: null, empty: true };
		}
		minCountIds = intersectBookIds(minCountIds, readsCountIds);
		if (minCountIds?.length === 0) {
			return { where: null, empty: true };
		}
	}

	const baseWhere = await buildBookListWhereWithAuthors(
		listQuery as BookListQueryInput,
		db,
	);
	if (baseWhere === null) {
		return { where: null, empty: true };
	}

	const where = mergeWhereFragments<Prisma.BookWhereInput>(
		baseWhere,
		ranging.use(),
		searching.use(),
		adminExtraWhere(input),
		{
			id: minCountIds ? { in: minCountIds } : undefined,
		},
	);

	return { where, empty: false };
}

function emptyAdminBookOverview(
	pendingBookRequests: number,
	blockedOpenLibraryWorks: number,
): AdminBookOverviewOutput {
	return {
		kpis: {
			totalBooks: 0,
			distinctAuthors: 0,
			averagePages: 0,
			totalPages: 0,
			statusCounts: { completed: 0, reading: 0, wishlist: 0 },
			addedLast7Days: 0,
			addedLast30Days: 0,
			pendingBookRequests,
			blockedOpenLibraryWorks,
		},
		additionsByDay: buildAdditionsByDay([], 30),
		rankings: emptyAdminBookRankings(),
	};
}

export async function getAdminBookOverview(
	input: GetAdminBookOverviewInput,
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

	const pendingBookRequestsPromise = db.bookRequest.count({
		where: { status: "pending" },
	});
	const blockedOpenLibraryWorksPromise = db.blockedOpenLibraryWork.count();

	const { where, empty } = await buildAdminBookListWhere(input, db);
	if (empty || where === null) {
		const [pendingBookRequests, blockedOpenLibraryWorks] = await Promise.all([
			pendingBookRequestsPromise,
			blockedOpenLibraryWorksPromise,
		]);
		return emptyAdminBookOverview(pendingBookRequests, blockedOpenLibraryWorks);
	}

	const chartWhere = mergeWhereFragments(where, {
		createdAt: { gte: chartSince },
	});
	const added7Where = mergeWhereFragments(where, {
		createdAt: { gte: sevenDaysAgo },
	});
	const added30Where = mergeWhereFragments(where, {
		createdAt: { gte: thirtyDaysAgo },
	});

	const [
		totalBooks,
		statusGroups,
		pageSumAgg,
		pageAgg,
		allAuthorsRows,
		addedLast7Days,
		addedLast30Days,
		pendingBookRequests,
		blockedOpenLibraryWorks,
		recentBooks,
		rankings,
	] = await Promise.all([
		db.book.count({ where }),
		db.book.groupBy({ by: ["status"], where, _count: { _all: true } }),
		db.book.aggregate({ where, _sum: { pages: true } }),
		db.book.aggregate({ where, _avg: { pages: true } }),
		db.book.findMany({ where, select: { authors: true } }),
		db.book.count({ where: added7Where }),
		db.book.count({ where: added30Where }),
		pendingBookRequestsPromise,
		blockedOpenLibraryWorksPromise,
		db.book.findMany({
			where: chartWhere,
			select: { createdAt: true },
			orderBy: { createdAt: "asc" },
		}),
		loadAdminBookRankings(db, where),
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
			totalPages: pageSumAgg._sum.pages ?? 0,
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

async function listAdminBooksSortedByPollVotes(
	input: ListAdminBooksInput,
	db: Database,
	where: Prisma.BookWhereInput,
): Promise<ListAdminBooksOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const sorting = adminBookListSorting.from(input);
	const direction = sorting.sortDirection;

	const matching = await db.book.findMany({ where, select: { id: true } });
	const total = matching.length;
	if (total === 0) {
		return pagination.paginate([], 0);
	}

	const options = await db.pollOption.findMany({
		where: { bookId: { in: matching.map((row) => row.id) } },
		select: { bookId: true, _count: { select: { votes: true } } },
	});

	const votesByBook = new Map<string, number>();
	for (const option of options) {
		votesByBook.set(
			option.bookId,
			(votesByBook.get(option.bookId) ?? 0) + option._count.votes,
		);
	}

	const sortedIds = matching
		.map((row) => row.id)
		.toSorted((a, b) => {
			const diff = (votesByBook.get(a) ?? 0) - (votesByBook.get(b) ?? 0);
			if (diff !== 0) {
				return direction === "asc" ? diff : -diff;
			}
			return direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
		});

	const { skip, take } = pagination.use();
	const pageIds = sortedIds.slice(skip, skip + take);

	const rows = await db.book.findMany({
		where: { id: { in: pageIds } },
		select: adminBookListSelect,
	});
	const rowById = new Map(rows.map((row) => [row.id, row]));
	const orderedRows = pageIds.flatMap((id) => {
		const row = rowById.get(id);
		return row ? [row] : [];
	});

	const bookIds = orderedRows.map((row) => row.id);
	const [pollVoteMap, sittingSlugMap] = await Promise.all([
		pollVoteCountsByBookId(db, bookIds),
		resolveLatestSittingSlugs(db, bookIds),
	]);

	return pagination.paginate(
		orderedRows.map((row) =>
			mapAdminBookListRow(
				row,
				pollVoteMap.get(row.id) ?? 0,
				sittingSlugMap.get(row.id) ?? null,
			),
		),
		total,
	);
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

	const { where, empty } = await buildAdminBookListWhere(input, db);
	if (empty || where === null) {
		return pagination.paginate([], 0);
	}

	if (sorting.sortBy === "pollVotes") {
		return listAdminBooksSortedByPollVotes(input, db, where);
	}

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
