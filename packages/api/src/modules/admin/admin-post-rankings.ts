import type { Database, Prisma } from "@bbrc/db";
import type { z } from "zod";
import type {
	AdminPostOverviewOutput,
	AdminPostRankingItemSchema,
} from "./admin-post.schema";

type PostRankingItem = z.infer<typeof AdminPostRankingItemSchema>;

const RANKING_LIMIT = 5;

const rankingSelect = {
	slug: true,
	content: true,
	editedAt: true,
	author: { select: { username: true } },
	_count: { select: { likes: true, comments: true } },
} as const;

function preview(content: string): string {
	const trimmed = content.trim();
	if (trimmed.length <= 120) {
		return trimmed;
	}
	return `${trimmed.slice(0, 117)}…`;
}

function mapPostRow(
	row: Prisma.PostGetPayload<{ select: typeof rankingSelect }>,
	metric: number,
	secondaryMetric?: number,
): PostRankingItem {
	return {
		slug: row.slug,
		authorUsername: row.author.username,
		contentPreview: preview(row.content),
		metric,
		secondaryMetric,
	};
}

export function emptyAdminPostRankings(): AdminPostOverviewOutput["rankings"] {
	return {
		mostLiked: [],
		mostCommented: [],
		longestContent: [],
		mostEdited: [],
		mostAuthors: [],
	};
}

export async function loadAdminPostRankings(
	db: Database,
	where: Prisma.PostWhereInput,
): Promise<AdminPostOverviewOutput["rankings"]> {
	const [mostLiked, mostCommented, candidatePosts] = await Promise.all([
		db.post.findMany({
			where,
			orderBy: { likes: { _count: "desc" } },
			take: RANKING_LIMIT,
			select: rankingSelect,
		}),
		db.post.findMany({
			where,
			orderBy: { comments: { _count: "desc" } },
			take: RANKING_LIMIT,
			select: rankingSelect,
		}),
		db.post.findMany({
			where,
			select: rankingSelect,
			take: 80,
			orderBy: { updatedAt: "desc" },
		}),
	]);

	const longestContent = candidatePosts
		.toSorted((a, b) => b.content.length - a.content.length)
		.slice(0, RANKING_LIMIT);

	const mostEdited = candidatePosts
		.filter((row) => row.editedAt != null)
		.toSorted((a, b) => {
			const aTime = a.editedAt?.getTime() ?? 0;
			const bTime = b.editedAt?.getTime() ?? 0;
			return bTime - aTime;
		})
		.slice(0, RANKING_LIMIT);

	const authorCounts = await db.post.groupBy({
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
			mapPostRow(row, row._count.likes, row._count.comments),
		),
		mostCommented: mostCommented.map((row) =>
			mapPostRow(row, row._count.comments, row._count.likes),
		),
		longestContent: longestContent.map((row) =>
			mapPostRow(row, row.content.length, row._count.likes),
		),
		mostEdited: mostEdited.map((row) =>
			mapPostRow(row, row.editedAt?.getTime() ?? 0, row._count.comments),
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
