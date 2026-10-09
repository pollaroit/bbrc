import type { Database, Prisma } from "@bbrc/db";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import {
	type AdminFeedbackListFilters,
	adminFeedbackListRanging,
	adminFeedbackListSearching,
	adminFeedbackListSorting,
} from "./admin-feedback.listing";
import type {
	AdminFeedbackOverviewOutput,
	GetAdminFeedbackOverviewInput,
	GetAdminFeedbackStatsInput,
	GetAdminFeedbackStatsOutput,
	ListAdminFeedbacksInput,
	ListAdminFeedbacksOutput,
} from "./admin-feedback.schema";
import { adminFeedbackListSelect } from "./admin-feedback.schema";
import {
	emptyAdminFeedbackRankings,
	loadAdminFeedbackRankings,
} from "./admin-feedback-rankings";

type AdminFeedbackListQueryInput =
	| GetAdminFeedbackOverviewInput
	| ListAdminFeedbacksInput;

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

function intersectFeedbackIds(
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

async function feedbackIdsWithMinRelationCount(
	db: Database,
	relation: "likes" | "comments" | "postAttachments",
	min: number,
): Promise<string[]> {
	if (min <= 0) {
		return [];
	}

	const rows = await db.feedback.findMany({
		select: {
			id: true,
			_count: { select: { [relation]: true } },
		},
	});

	return rows
		.filter((row) => {
			const count = row._count[relation];
			return count != null && count >= min;
		})
		.map((row) => row.id);
}

async function feedbackIdsWithMinReviewLength(
	db: Database,
	min: number,
): Promise<string[]> {
	if (min <= 0) {
		return [];
	}

	const rows = await db.feedback.findMany({
		select: { id: true, review: true },
	});

	return rows
		.filter((row) => row.review.trim().length >= min)
		.map((row) => row.id);
}

async function resolveMinCountFeedbackIds(
	db: Database,
	input: AdminFeedbackListFilters,
): Promise<string[] | null> {
	let ids: string[] | null = null;

	if (input.minLikes != null && input.minLikes > 0) {
		const matched = await feedbackIdsWithMinRelationCount(
			db,
			"likes",
			input.minLikes,
		);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectFeedbackIds(ids, matched);
	}

	if (input.minComments != null && input.minComments > 0) {
		const matched = await feedbackIdsWithMinRelationCount(
			db,
			"comments",
			input.minComments,
		);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectFeedbackIds(ids, matched);
	}

	if (input.minPostAttachments != null && input.minPostAttachments > 0) {
		const matched = await feedbackIdsWithMinRelationCount(
			db,
			"postAttachments",
			input.minPostAttachments,
		);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectFeedbackIds(ids, matched);
	}

	if (input.minReviewLength != null && input.minReviewLength > 0) {
		const matched = await feedbackIdsWithMinReviewLength(
			db,
			input.minReviewLength,
		);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectFeedbackIds(ids, matched);
	}

	return ids;
}

function adminFeedbackExtraWhere(
	input: AdminFeedbackListFilters,
): Prisma.FeedbackWhereInput {
	const parts: Prisma.FeedbackWhereInput[] = [];

	if (input.minRating != null) {
		parts.push({ rating: { gte: input.minRating } });
	}
	if (input.maxRating != null) {
		parts.push({ rating: { lte: input.maxRating } });
	}
	if (input.bookSlugs?.length) {
		parts.push({ book: { slug: { in: input.bookSlugs } } });
	}
	if (input.authorUsernames?.length) {
		parts.push({ author: { username: { in: input.authorUsernames } } });
	}
	if (input.minBookPages != null) {
		parts.push({ book: { pages: { gte: input.minBookPages } } });
	}
	if (input.maxBookPages != null) {
		parts.push({ book: { pages: { lte: input.maxBookPages } } });
	}
	return mergeWhereFragments(...parts);
}

export async function buildAdminFeedbackListWhere(
	input: AdminFeedbackListQueryInput,
	db: Database,
): Promise<{ where: Prisma.FeedbackWhereInput | null; empty: boolean }> {
	const ranging = adminFeedbackListRanging.from(input);
	const searching = adminFeedbackListSearching.from(input);

	const minCountIds = await resolveMinCountFeedbackIds(db, input);
	if (minCountIds?.length === 0) {
		return { where: null, empty: true };
	}

	const where = mergeWhereFragments<Prisma.FeedbackWhereInput>(
		ranging.use(),
		searching.use(),
		adminFeedbackExtraWhere(input),
		{
			id: minCountIds ? { in: minCountIds } : undefined,
		},
	);

	return { where, empty: false };
}

function mapAdminFeedbackListRow(
	row: Prisma.FeedbackGetPayload<{ select: typeof adminFeedbackListSelect }>,
) {
	return {
		id: row.id,
		slug: row.slug,
		rating: row.rating,
		review: row.review,
		reviewLength: row.review.trim().length,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		author: row.author,
		book: row.book,
		counts: {
			likes: row._count.likes,
			comments: row._count.comments,
			postAttachments: row._count.postAttachments,
		},
	};
}

function withStableSlugOrderBy(
	orderBy: Prisma.FeedbackOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.FeedbackOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

export async function listAdminFeedbacks(
	input: ListAdminFeedbacksInput,
	db: Database,
): Promise<ListAdminFeedbacksOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const sorting = adminFeedbackListSorting.from(input);

	const { where, empty } = await buildAdminFeedbackListWhere(input, db);
	if (empty || where === null) {
		return pagination.paginate([], 0);
	}

	const [total, rows] = await Promise.all([
		db.feedback.count({ where }),
		db.feedback.findMany({
			...pagination.use(),
			where,
			orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
			select: adminFeedbackListSelect,
		}),
	]);

	return pagination.paginate(rows.map(mapAdminFeedbackListRow), total);
}

function median(values: number[]): number {
	if (values.length === 0) {
		return 0;
	}
	const sorted = values.toSorted((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 0) {
		const lower = sorted[mid - 1];
		const upper = sorted[mid];
		return lower !== undefined && upper !== undefined ? (lower + upper) / 2 : 0;
	}
	return sorted[mid] ?? 0;
}

function emptyAdminFeedbackOverview(): AdminFeedbackOverviewOutput {
	return {
		kpis: {
			totalFeedbacks: 0,
			averageRating: 0,
			medianRating: 0,
			withComments: 0,
			withLikes: 0,
			inPosts: 0,
			distinctBooksReviewed: 0,
			distinctReviewers: 0,
			submittedLast7Days: 0,
			submittedLast30Days: 0,
		},
		feedbacksByDay: buildAdditionsByDay([], 30),
		rankings: emptyAdminFeedbackRankings(),
	};
}

export async function getAdminFeedbackOverview(
	input: GetAdminFeedbackOverviewInput,
	db: Database,
): Promise<AdminFeedbackOverviewOutput> {
	const now = new Date();
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setUTCDate(now.getUTCDate() - 7);
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setUTCDate(now.getUTCDate() - 30);

	const { where, empty } = await buildAdminFeedbackListWhere(input, db);
	if (empty || where === null) {
		return emptyAdminFeedbackOverview();
	}

	const feedbacks = await db.feedback.findMany({
		where,
		select: {
			rating: true,
			createdAt: true,
			bookId: true,
			authorId: true,
			_count: {
				select: { likes: true, comments: true, postAttachments: true },
			},
		},
	});

	const bookIds = new Set<string>();
	const authorIds = new Set<string>();

	let withComments = 0;
	let withLikes = 0;
	let inPosts = 0;
	let submittedLast7Days = 0;
	let submittedLast30Days = 0;
	const ratings: number[] = [];

	for (const row of feedbacks) {
		ratings.push(row.rating);
		bookIds.add(row.bookId);
		authorIds.add(row.authorId);
		if (row._count.comments > 0) {
			withComments += 1;
		}
		if (row._count.likes > 0) {
			withLikes += 1;
		}
		if (row._count.postAttachments > 0) {
			inPosts += 1;
		}
		if (row.createdAt >= sevenDaysAgo) {
			submittedLast7Days += 1;
		}
		if (row.createdAt >= thirtyDaysAgo) {
			submittedLast30Days += 1;
		}
	}

	const averageRating =
		ratings.length === 0
			? 0
			: ratings.reduce((sum, value) => sum + value, 0) / ratings.length;

	const rankings = await loadAdminFeedbackRankings(db, where);

	return {
		kpis: {
			totalFeedbacks: feedbacks.length,
			averageRating: Math.round(averageRating * 10) / 10,
			medianRating: median(ratings),
			withComments,
			withLikes,
			inPosts,
			distinctBooksReviewed: bookIds.size,
			distinctReviewers: authorIds.size,
			submittedLast7Days,
			submittedLast30Days,
		},
		feedbacksByDay: buildAdditionsByDay(feedbacks, 30),
		rankings,
	};
}

function ratingBucket(rating: number): string {
	const step = Math.round(rating * 2) / 2;
	return step.toFixed(1);
}

function reviewLengthBucket(length: number): string {
	if (length < 80) {
		return "Under 80 chars";
	}
	if (length < 200) {
		return "80–199 chars";
	}
	return "200+ chars";
}

function reviewedBookPagesBucket(pages: number): string {
	if (pages < 300) {
		return "Under 300 pages";
	}
	if (pages < 500) {
		return "300–499 pages";
	}
	return "500+ pages";
}

export async function getAdminFeedbackStats(
	input: GetAdminFeedbackStatsInput,
	db: Database,
): Promise<GetAdminFeedbackStatsOutput> {
	const { where, empty } = await buildAdminFeedbackListWhere(input, db);
	if (empty || where === null) {
		return emptyFeedbackStats();
	}

	const feedbacks = await db.feedback.findMany({
		where,
		select: {
			rating: true,
			review: true,
			createdAt: true,
			book: { select: { pages: true } },
			_count: {
				select: { likes: true, comments: true, postAttachments: true },
			},
		},
	});

	const ratingMap = new Map<string, number>();
	const lengthMap = new Map<string, number>();
	const pagesMap = new Map<string, number>();

	let withLikes = 0;
	let withComments = 0;
	let inPosts = 0;

	for (const row of feedbacks) {
		const bucket = ratingBucket(row.rating);
		ratingMap.set(bucket, (ratingMap.get(bucket) ?? 0) + 1);

		const lengthLabel = reviewLengthBucket(row.review.trim().length);
		lengthMap.set(lengthLabel, (lengthMap.get(lengthLabel) ?? 0) + 1);

		const pagesLabel = reviewedBookPagesBucket(row.book.pages);
		pagesMap.set(pagesLabel, (pagesMap.get(pagesLabel) ?? 0) + 1);

		if (row._count.likes > 0) {
			withLikes += 1;
		}
		if (row._count.comments > 0) {
			withComments += 1;
		}
		if (row._count.postAttachments > 0) {
			inPosts += 1;
		}
	}

	const total = feedbacks.length;

	return {
		ratingDistribution: [...ratingMap.entries()]
			.map(([label, value]) => ({ label, value }))
			.sort((a, b) => a.label.localeCompare(b.label)),
		feedbacksByDay: buildAdditionsByDay(feedbacks, 30),
		reviewLengthHistogram: [...lengthMap.entries()].map(([label, value]) => ({
			label,
			value,
		})),
		engagementFunnel: [
			{ stage: "All reviews", count: total },
			{ stage: "Has likes", count: withLikes },
			{ stage: "Has comments", count: withComments },
			{ stage: "Attached to posts", count: inPosts },
		],
		reviewedBookPagesHistogram: [...pagesMap.entries()].map(
			([label, value]) => ({
				label,
				value,
			}),
		),
	};
}

function emptyFeedbackStats(): GetAdminFeedbackStatsOutput {
	return {
		ratingDistribution: [],
		feedbacksByDay: [],
		reviewLengthHistogram: [],
		engagementFunnel: [
			{ stage: "All reviews", count: 0 },
			{ stage: "Has likes", count: 0 },
			{ stage: "Has comments", count: 0 },
			{ stage: "Attached to posts", count: 0 },
		],
		reviewedBookPagesHistogram: [],
	};
}
