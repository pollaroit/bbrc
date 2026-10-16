import type { Database, Prisma } from "@bbrc/db";
import { contentPlainText } from "@bbrc/shared";
import type { z } from "zod";
import type {
	AdminFeedbackOverviewOutput,
	AdminFeedbackRankingItemSchema,
} from "./admin-feedback.schema";

type FeedbackRankingItem = z.infer<typeof AdminFeedbackRankingItemSchema>;

const RANKING_LIMIT = 5;

function mapFeedbackRow(row: {
	slug: string;
	rating: number;
	metric: number;
	secondaryMetric?: number;
	bookTitle: string;
	authorUsername: string;
}): FeedbackRankingItem {
	return {
		slug: row.slug,
		rating: row.rating,
		metric: row.metric,
		secondaryMetric: row.secondaryMetric,
		bookTitle: row.bookTitle,
		authorUsername: row.authorUsername,
	};
}

const rankingSelect = {
	slug: true,
	rating: true,
	review: true,
	author: { select: { username: true } },
	book: { select: { title: true, pages: true } },
	_count: { select: { likes: true, comments: true, postAttachments: true } },
} as const;

async function topFeedbacksByRating(
	db: Database,
	where: Prisma.FeedbackWhereInput,
	direction: "asc" | "desc",
): Promise<FeedbackRankingItem[]> {
	const rows = await db.feedback.findMany({
		where,
		orderBy: { rating: direction },
		take: RANKING_LIMIT,
		select: rankingSelect,
	});

	return rows.map((row) =>
		mapFeedbackRow({
			slug: row.slug,
			rating: row.rating,
			metric: row.rating,
			bookTitle: row.book.title,
			authorUsername: row.author.username,
		}),
	);
}

async function topFeedbacksByRelation(
	db: Database,
	where: Prisma.FeedbackWhereInput,
	relation: "likes" | "comments" | "postAttachments",
): Promise<FeedbackRankingItem[]> {
	const rows = await db.feedback.findMany({
		where,
		orderBy: { [relation]: { _count: "desc" } },
		take: RANKING_LIMIT,
		select: rankingSelect,
	});

	return rows.map((row) =>
		mapFeedbackRow({
			slug: row.slug,
			rating: row.rating,
			metric:
				relation === "likes"
					? row._count.likes
					: relation === "comments"
						? row._count.comments
						: row._count.postAttachments,
			bookTitle: row.book.title,
			authorUsername: row.author.username,
		}),
	);
}

async function reviewsByLength(
	db: Database,
	where: Prisma.FeedbackWhereInput,
	direction: "asc" | "desc",
): Promise<FeedbackRankingItem[]> {
	const rows = await db.feedback.findMany({
		where,
		select: rankingSelect,
		take: 40,
		orderBy: { updatedAt: "desc" },
	});

	return rows
		.map((row) =>
			mapFeedbackRow({
				slug: row.slug,
				rating: row.rating,
				metric: contentPlainText(row.review).trim().length,
				bookTitle: row.book.title,
				authorUsername: row.author.username,
			}),
		)
		.toSorted((a, b) =>
			direction === "asc" ? a.metric - b.metric : b.metric - a.metric,
		)
		.slice(0, RANKING_LIMIT);
}

async function topFeedbacksByEngagement(
	db: Database,
	where: Prisma.FeedbackWhereInput,
): Promise<FeedbackRankingItem[]> {
	const rows = await db.feedback.findMany({
		where,
		select: rankingSelect,
		take: 40,
		orderBy: { updatedAt: "desc" },
	});

	return rows
		.map((row) =>
			mapFeedbackRow({
				slug: row.slug,
				rating: row.rating,
				metric: row._count.likes + row._count.comments,
				secondaryMetric: row._count.likes,
				bookTitle: row.book.title,
				authorUsername: row.author.username,
			}),
		)
		.toSorted((a, b) => b.metric - a.metric)
		.slice(0, RANKING_LIMIT);
}

async function topFeedbacksOnLongestBooks(
	db: Database,
	where: Prisma.FeedbackWhereInput,
): Promise<FeedbackRankingItem[]> {
	const rows = await db.feedback.findMany({
		where,
		orderBy: { book: { pages: "desc" } },
		take: RANKING_LIMIT,
		select: rankingSelect,
	});

	return rows.map((row) =>
		mapFeedbackRow({
			slug: row.slug,
			rating: row.rating,
			metric: row.book.pages,
			bookTitle: row.book.title,
			authorUsername: row.author.username,
		}),
	);
}

export function emptyAdminFeedbackRankings(): AdminFeedbackOverviewOutput["rankings"] {
	return {
		highestRated: [],
		lowestRated: [],
		mostLiked: [],
		mostCommented: [],
		longestReviews: [],
		shortestReviews: [],
		mostPostAttachments: [],
		highestEngagement: [],
		onLongestBooks: [],
	};
}

export async function loadAdminFeedbackRankings(
	db: Database,
	where: Prisma.FeedbackWhereInput,
): Promise<AdminFeedbackOverviewOutput["rankings"]> {
	const [
		highestRated,
		lowestRated,
		mostLiked,
		mostCommented,
		longestReviews,
		shortestReviews,
		mostPostAttachments,
		highestEngagement,
		onLongestBooks,
	] = await Promise.all([
		topFeedbacksByRating(db, where, "desc"),
		topFeedbacksByRating(db, where, "asc"),
		topFeedbacksByRelation(db, where, "likes"),
		topFeedbacksByRelation(db, where, "comments"),
		reviewsByLength(db, where, "desc"),
		reviewsByLength(db, where, "asc"),
		topFeedbacksByRelation(db, where, "postAttachments"),
		topFeedbacksByEngagement(db, where),
		topFeedbacksOnLongestBooks(db, where),
	]);

	return {
		highestRated,
		lowestRated,
		mostLiked,
		mostCommented,
		longestReviews,
		shortestReviews,
		mostPostAttachments,
		highestEngagement,
		onLongestBooks,
	};
}
