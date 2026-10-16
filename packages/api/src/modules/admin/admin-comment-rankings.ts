import type { Database, Prisma } from "@bbrc/db";
import { richContentPreview } from "@bbrc/shared";
import type { z } from "zod";
import type {
	AdminCommentOverviewOutput,
	AdminCommentRankingItemSchema,
} from "./admin-comment.schema";

type CommentRankingItem = z.infer<typeof AdminCommentRankingItemSchema>;

const RANKING_LIMIT = 5;

const rankingSelect = {
	slug: true,
	content: true,
	editedAt: true,
	author: { select: { username: true } },
	post: { select: { slug: true } },
	feedback: {
		select: {
			slug: true,
			book: { select: { slug: true, title: true } },
		},
	},
	_count: { select: { likes: true, replies: true } },
} as const;

function contextMeta(
	row: Prisma.CommentGetPayload<{ select: typeof rankingSelect }>,
): Pick<CommentRankingItem, "context" | "contextLabel"> {
	if (row.post) {
		return { context: "post", contextLabel: `Post · ${row.post.slug}` };
	}
	if (row.feedback) {
		return {
			context: "feedback",
			contextLabel: `${row.feedback.book.title} · ${row.feedback.slug}`,
		};
	}
	return { context: "post", contextLabel: "Unknown" };
}

function mapCommentRow(
	row: Prisma.CommentGetPayload<{ select: typeof rankingSelect }>,
	metric: number,
	secondaryMetric?: number,
): CommentRankingItem {
	const ctx = contextMeta(row);
	return {
		slug: row.slug,
		authorUsername: row.author.username,
		contentPreview: richContentPreview(row.content),
		context: ctx.context,
		contextLabel: ctx.contextLabel,
		metric,
		secondaryMetric,
	};
}

export function emptyAdminCommentRankings(): AdminCommentOverviewOutput["rankings"] {
	return {
		mostLiked: [],
		mostReplies: [],
		longestContent: [],
		mostEdited: [],
		mostAuthors: [],
	};
}

export async function loadAdminCommentRankings(
	db: Database,
	where: Prisma.CommentWhereInput,
): Promise<AdminCommentOverviewOutput["rankings"]> {
	const [mostLiked, mostReplies, candidateComments] = await Promise.all([
		db.comment.findMany({
			where,
			orderBy: { likes: { _count: "desc" } },
			take: RANKING_LIMIT,
			select: rankingSelect,
		}),
		db.comment.findMany({
			where,
			orderBy: { replies: { _count: "desc" } },
			take: RANKING_LIMIT,
			select: rankingSelect,
		}),
		db.comment.findMany({
			where,
			select: rankingSelect,
			take: 80,
			orderBy: { updatedAt: "desc" },
		}),
	]);

	const longestContent = candidateComments
		.toSorted((a, b) => b.content.length - a.content.length)
		.slice(0, RANKING_LIMIT);

	const mostEdited = candidateComments
		.filter((row) => row.editedAt != null)
		.toSorted((a, b) => {
			const aTime = a.editedAt?.getTime() ?? 0;
			const bTime = b.editedAt?.getTime() ?? 0;
			return bTime - aTime;
		})
		.slice(0, RANKING_LIMIT);

	const authorCounts = await db.comment.groupBy({
		by: ["authorId"],
		where,
		_count: { _all: true },
		orderBy: { _count: { authorId: "desc" } },
		take: RANKING_LIMIT,
	});

	const authorIds = authorCounts.map((row) => row.authorId);
	const authors =
		authorIds.length > 0
			? await db.user.findMany({
					where: { id: { in: authorIds } },
					select: { id: true, username: true },
				})
			: [];
	const usernameById = new Map(authors.map((user) => [user.id, user.username]));

	return {
		mostLiked: mostLiked.map((row) =>
			mapCommentRow(row, row._count.likes, row._count.replies),
		),
		mostReplies: mostReplies.map((row) =>
			mapCommentRow(row, row._count.replies, row._count.likes),
		),
		longestContent: longestContent.map((row) =>
			mapCommentRow(row, row.content.length, row._count.likes),
		),
		mostEdited: mostEdited.map((row) =>
			mapCommentRow(row, row.editedAt?.getTime() ?? 0, row._count.likes),
		),
		mostAuthors: authorCounts.flatMap((row) => {
			const username = usernameById.get(row.authorId);
			if (!username) {
				return [];
			}
			return [{ authorUsername: username, metric: row._count._all }];
		}),
	};
}
