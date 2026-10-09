import type { Database, Prisma } from "@bbrc/db";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { commentAuthorUsernameWhere } from "../comment/comment.listing";
import {
	type AdminCommentListFilters,
	adminCommentContextWhere,
	adminCommentListRanging,
	adminCommentListSearching,
	adminCommentListSorting,
} from "./admin-comment.listing";
import type {
	AdminCommentOverviewOutput,
	GetAdminCommentOverviewInput,
	GetAdminCommentStatsInput,
	GetAdminCommentStatsOutput,
	ListAdminCommentsInput,
	ListAdminCommentsOutput,
} from "./admin-comment.schema";
import { adminCommentListSelect } from "./admin-comment.schema";
import {
	emptyAdminCommentRankings,
	loadAdminCommentRankings,
} from "./admin-comment-rankings";

type AdminCommentListQueryInput =
	| GetAdminCommentOverviewInput
	| ListAdminCommentsInput
	| GetAdminCommentStatsInput;

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

function intersectIds(
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

async function commentIdsWithMinRelationCount(
	db: Database,
	relation: "likes" | "replies",
	min: number,
): Promise<string[]> {
	const rows = await db.comment.findMany({
		select: { id: true, _count: { select: { [relation]: true } } },
	});
	return rows
		.filter((row) => {
			const count =
				relation === "likes" ? row._count.likes : row._count.replies;
			return (count ?? 0) >= min;
		})
		.map((row) => row.id);
}

async function commentIdsWithMinContentLength(
	db: Database,
	min: number,
): Promise<string[]> {
	const rows = await db.comment.findMany({
		select: { id: true, content: true },
	});
	return rows
		.filter((row) => row.content.trim().length >= min)
		.map((row) => row.id);
}

async function resolveCommentIdFilters(
	db: Database,
	input: AdminCommentListFilters,
): Promise<string[] | null> {
	let ids: string[] | null = null;

	if (input.minLikes != null && input.minLikes > 0) {
		const matched = await commentIdsWithMinRelationCount(
			db,
			"likes",
			input.minLikes,
		);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectIds(ids, matched);
	}

	if (input.minReplies != null && input.minReplies > 0) {
		const matched = await commentIdsWithMinRelationCount(
			db,
			"replies",
			input.minReplies,
		);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectIds(ids, matched);
	}

	if (input.minContentLength != null && input.minContentLength > 0) {
		const matched = await commentIdsWithMinContentLength(
			db,
			input.minContentLength,
		);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectIds(ids, matched);
	}

	return ids;
}

function adminCommentExtraWhere(
	input: AdminCommentListFilters,
): Prisma.CommentWhereInput {
	const parts: Prisma.CommentWhereInput[] = [];

	if (input.authorUsername) {
		parts.push(commentAuthorUsernameWhere(input.authorUsername));
	}
	if (input.authorUsernames?.length) {
		parts.push({ author: { username: { in: input.authorUsernames } } });
	}
	if (input.contexts?.length) {
		const contextWhere = adminCommentContextWhere(input.contexts);
		if (contextWhere) {
			parts.push(contextWhere);
		}
	}
	if (input.postSlugs?.length) {
		parts.push({ post: { slug: { in: input.postSlugs } } });
	}
	if (input.feedbackSlugs?.length) {
		parts.push({ feedback: { slug: { in: input.feedbackSlugs } } });
	}
	if (input.isReply === true) {
		parts.push({ parentId: { not: null } });
	}
	if (input.isReply === false) {
		parts.push({ parentId: null });
	}
	if (input.depths?.length) {
		parts.push({ depth: { in: input.depths } });
	}
	if (input.hasImage === true) {
		parts.push({ imageUrl: { not: null } });
	}
	if (input.hasImage === false) {
		parts.push({ imageUrl: null });
	}
	if (input.wasEdited === true) {
		parts.push({ editedAt: { not: null } });
	}
	if (input.wasEdited === false) {
		parts.push({ editedAt: null });
	}

	return mergeWhereFragments(...parts);
}

export async function buildAdminCommentListWhere(
	input: AdminCommentListQueryInput,
	db: Database,
): Promise<{ where: Prisma.CommentWhereInput | null; empty: boolean }> {
	const ranging = adminCommentListRanging.from(input);
	const searching = adminCommentListSearching.from(input);
	const idFilter = await resolveCommentIdFilters(db, input);

	if (idFilter?.length === 0) {
		return { where: null, empty: true };
	}

	const where = mergeWhereFragments<Prisma.CommentWhereInput>(
		ranging.use(),
		searching.use(),
		adminCommentExtraWhere(input),
		{
			id: idFilter ? { in: idFilter } : undefined,
		},
	);

	return { where, empty: false };
}

function mapCommentContext(
	row: Prisma.CommentGetPayload<{ select: typeof adminCommentListSelect }>,
) {
	if (row.post) {
		return {
			type: "post" as const,
			postSlug: row.post.slug,
			feedbackSlug: null,
			bookSlug: null,
			bookTitle: null,
		};
	}
	if (row.feedback) {
		return {
			type: "feedback" as const,
			postSlug: null,
			feedbackSlug: row.feedback.slug,
			bookSlug: row.feedback.book.slug,
			bookTitle: row.feedback.book.title,
		};
	}
	return {
		type: "post" as const,
		postSlug: null,
		feedbackSlug: null,
		bookSlug: null,
		bookTitle: null,
	};
}

function mapAdminCommentListRow(
	row: Prisma.CommentGetPayload<{ select: typeof adminCommentListSelect }>,
) {
	return {
		id: row.id,
		slug: row.slug,
		content: row.content,
		contentLength: row.content.trim().length,
		imageUrl: row.imageUrl,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		editedAt: row.editedAt,
		depth: row.depth,
		author: row.author,
		parentSlug: row.parent?.slug ?? null,
		context: mapCommentContext(row),
		counts: {
			likes: row._count.likes,
			replies: row._count.replies,
		},
	};
}

function withStableSlugOrderBy(
	orderBy: Prisma.CommentOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.CommentOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

export async function listAdminComments(
	input: ListAdminCommentsInput,
	db: Database,
): Promise<ListAdminCommentsOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const sorting = adminCommentListSorting.from(input);

	const { where, empty } = await buildAdminCommentListWhere(input, db);
	if (empty || where === null) {
		return pagination.paginate([], 0);
	}

	const [total, rows] = await Promise.all([
		db.comment.count({ where }),
		db.comment.findMany({
			...pagination.use(),
			where,
			orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
			select: adminCommentListSelect,
		}),
	]);

	return pagination.paginate(rows.map(mapAdminCommentListRow), total);
}

function emptyAdminCommentOverview(): AdminCommentOverviewOutput {
	return {
		kpis: {
			totalComments: 0,
			onPosts: 0,
			onFeedbacks: 0,
			replies: 0,
			topLevel: 0,
			withImage: 0,
			edited: 0,
			totalLikes: 0,
			totalReplies: 0,
			distinctAuthors: 0,
			postedLast7Days: 0,
			postedLast30Days: 0,
		},
		commentsByDay: buildAdditionsByDay([], 30),
		rankings: emptyAdminCommentRankings(),
	};
}

export async function getAdminCommentOverview(
	input: GetAdminCommentOverviewInput,
	db: Database,
): Promise<AdminCommentOverviewOutput> {
	const now = new Date();
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setUTCDate(now.getUTCDate() - 7);
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setUTCDate(now.getUTCDate() - 30);

	const { where, empty } = await buildAdminCommentListWhere(input, db);
	if (empty || where === null) {
		return emptyAdminCommentOverview();
	}

	const comments = await db.comment.findMany({
		where,
		select: {
			authorId: true,
			postId: true,
			feedbackId: true,
			parentId: true,
			imageUrl: true,
			editedAt: true,
			createdAt: true,
			_count: { select: { likes: true, replies: true } },
		},
	});

	const authorIds = new Set<string>();
	let onPosts = 0;
	let onFeedbacks = 0;
	let replies = 0;
	let topLevel = 0;
	let withImage = 0;
	let edited = 0;
	let totalLikes = 0;
	let totalReplies = 0;
	let postedLast7Days = 0;
	let postedLast30Days = 0;

	for (const row of comments) {
		authorIds.add(row.authorId);
		totalLikes += row._count.likes;
		totalReplies += row._count.replies;
		if (row.postId) {
			onPosts += 1;
		}
		if (row.feedbackId) {
			onFeedbacks += 1;
		}
		if (row.parentId) {
			replies += 1;
		} else {
			topLevel += 1;
		}
		if (row.imageUrl) {
			withImage += 1;
		}
		if (row.editedAt) {
			edited += 1;
		}
		if (row.createdAt >= sevenDaysAgo) {
			postedLast7Days += 1;
		}
		if (row.createdAt >= thirtyDaysAgo) {
			postedLast30Days += 1;
		}
	}

	const rankings = await loadAdminCommentRankings(db, where);

	return {
		kpis: {
			totalComments: comments.length,
			onPosts,
			onFeedbacks,
			replies,
			topLevel,
			withImage,
			edited,
			totalLikes,
			totalReplies,
			distinctAuthors: authorIds.size,
			postedLast7Days,
			postedLast30Days,
		},
		commentsByDay: buildAdditionsByDay(comments, 30),
		rankings,
	};
}

function likesBucket(count: number): string {
	if (count === 0) {
		return "No likes";
	}
	if (count <= 3) {
		return "1–3 likes";
	}
	return "4+ likes";
}

function depthLabel(depth: number): string {
	return `Depth ${depth}`;
}

export async function getAdminCommentStats(
	input: GetAdminCommentStatsInput,
	db: Database,
): Promise<GetAdminCommentStatsOutput> {
	const { where, empty } = await buildAdminCommentListWhere(input, db);
	if (empty || where === null) {
		return {
			commentsByDay: buildAdditionsByDay([], 30),
			contextMix: [],
			depthHistogram: [],
			likesHistogram: [],
			engagementFunnel: [],
		};
	}

	const comments = await db.comment.findMany({
		where,
		select: {
			postId: true,
			feedbackId: true,
			parentId: true,
			depth: true,
			imageUrl: true,
			editedAt: true,
			createdAt: true,
			_count: { select: { likes: true, replies: true } },
		},
	});

	let onPosts = 0;
	let onFeedbacks = 0;
	let topLevelCount = 0;
	let withReplies = 0;
	let withLikes = 0;
	let withImage = 0;
	let edited = 0;
	const depthHistogram = new Map<string, number>();
	const likesHistogram = new Map<string, number>();

	for (const row of comments) {
		if (row.postId) {
			onPosts += 1;
		}
		if (row.feedbackId) {
			onFeedbacks += 1;
		}
		if (!row.parentId) {
			topLevelCount += 1;
		}
		const depthKey = depthLabel(row.depth);
		depthHistogram.set(depthKey, (depthHistogram.get(depthKey) ?? 0) + 1);
		const likeKey = likesBucket(row._count.likes);
		likesHistogram.set(likeKey, (likesHistogram.get(likeKey) ?? 0) + 1);
		if (row._count.replies > 0) {
			withReplies += 1;
		}
		if (row._count.likes > 0) {
			withLikes += 1;
		}
		if (row.imageUrl) {
			withImage += 1;
		}
		if (row.editedAt) {
			edited += 1;
		}
	}

	const total = comments.length;

	return {
		commentsByDay: buildAdditionsByDay(comments, 30),
		contextMix: [
			{ context: "post" as const, count: onPosts },
			{ context: "feedback" as const, count: onFeedbacks },
		],
		depthHistogram: [...depthHistogram.entries()].map(([label, value]) => ({
			label,
			value,
		})),
		likesHistogram: [...likesHistogram.entries()].map(([label, value]) => ({
			label,
			value,
		})),
		engagementFunnel: [
			{ stage: "All comments", count: total },
			{ stage: "Top-level", count: topLevelCount },
			{ stage: "With replies", count: withReplies },
			{ stage: "With likes", count: withLikes },
			{ stage: "With image", count: withImage },
			{ stage: "Edited", count: edited },
		],
	};
}
