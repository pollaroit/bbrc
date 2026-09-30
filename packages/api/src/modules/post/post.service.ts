import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import { LikeSourceSchema } from "@bbrc/schemas";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { XP_AWARD } from "../xp/xp.schema";
import { awardPostXp } from "../xp/xp.service";
import {
	postAttachedBookWhere,
	postAuthorUsernameWhere,
	postListRanging,
	postListSearching,
	postListSorting,
} from "./post.listing";
import {
	type CreatePostInput,
	type CreatePostOutput,
	type DeletePostInput,
	type DeletePostOutput,
	type GetPostBySlugOutput,
	type GetPostListInput,
	type GetPostListOutput,
	getPostBySlugFields,
	getPostListFields,
	type PostListItem,
	postAuthorFields,
	type UpdatePostInput,
	type UpdatePostOutput,
} from "./post.schema";
import { generatePostSlug } from "./post-slug";

const postListSelect = {
	...getPostListFields,
	id: true,
} as const;

type PostListRow = Prisma.PostGetPayload<{
	select: typeof postListSelect;
}>;

const getPostBySlugSelect = {
	...getPostBySlugFields,
	_count: {
		select: {
			likes: true,
			comments: true,
		},
	},
} as const;

type PostDetailRow = Prisma.PostGetPayload<{
	select: typeof getPostBySlugSelect;
}>;

const postListCursorCodec = {
	decode(cursor: string): { slug: string } {
		return { slug: cursor };
	},
	encode(item: PostListRow): string {
		return item.slug;
	},
};

const topCommentSelect = {
	id: true,
	slug: true,
	content: true,
	createdAt: true,
	postId: true,
	author: {
		select: postAuthorFields,
	},
	_count: {
		select: {
			likes: true,
		},
	},
} as const;

type TopCommentRow = Prisma.CommentGetPayload<{
	select: typeof topCommentSelect;
}>;

function withStableSlugOrderBy(
	orderBy: Prisma.PostOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.PostOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

function viewerUserId(session: Session | null): string | null {
	return session?.user.id ?? null;
}

async function resolveAttachedBookId(
	bookSlug: string | null | undefined,
	db: Database,
): Promise<string | null | undefined> {
	if (bookSlug === undefined) {
		return undefined;
	}

	if (bookSlug === null) {
		return null;
	}

	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: { id: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug: bookSlug },
		});
	}

	return book.id;
}

function groupTopComments(
	comments: TopCommentRow[],
	limit: number,
): Map<string, TopCommentRow[]> {
	const byPostId = new Map<string, TopCommentRow[]>();

	for (const comment of comments) {
		const bucket = byPostId.get(comment.postId) ?? [];
		bucket.push(comment);
		byPostId.set(comment.postId, bucket);
	}

	for (const [postId, rows] of byPostId) {
		rows.sort((a, b) => b._count.likes - a._count.likes);
		byPostId.set(postId, rows.slice(0, limit));
	}

	return byPostId;
}

async function loadLikedPostIds(
	postIds: string[],
	userId: string | null,
	db: Database,
): Promise<Set<string>> {
	if (!userId || postIds.length === 0) {
		return new Set();
	}

	const likes = await db.like.findMany({
		where: {
			userId,
			source: LikeSourceSchema.enum.post,
			postId: { in: postIds },
		},
		select: { postId: true },
	});

	return new Set(
		likes.map((row) => row.postId).filter((id): id is string => id != null),
	);
}

async function loadLikedCommentIds(
	commentIds: string[],
	userId: string | null,
	db: Database,
): Promise<Set<string>> {
	if (!userId || commentIds.length === 0) {
		return new Set();
	}

	const likes = await db.like.findMany({
		where: {
			userId,
			source: LikeSourceSchema.enum.comment,
			commentId: { in: commentIds },
		},
		select: { commentId: true },
	});

	return new Set(
		likes.map((row) => row.commentId).filter((id): id is string => id != null),
	);
}

async function loadTopCommentsByPostId(
	postIds: string[],
	userId: string | null,
	db: Database,
	limit = 3,
): Promise<Map<string, PostListItem["topComments"]>> {
	if (postIds.length === 0) {
		return new Map();
	}

	const comments = await db.comment.findMany({
		where: { postId: { in: postIds } },
		select: topCommentSelect,
	});

	const grouped = groupTopComments(comments, limit);
	const previewCommentIds = [...grouped.values()].flatMap((rows) =>
		rows.map((row) => row.id),
	);
	const likedCommentIds = await loadLikedCommentIds(
		previewCommentIds,
		userId,
		db,
	);

	const result = new Map<string, PostListItem["topComments"]>();

	for (const [postId, rows] of grouped) {
		result.set(
			postId,
			rows.map((row) => ({
				slug: row.slug,
				content: row.content,
				createdAt: row.createdAt,
				author: row.author,
				likeCount: row._count.likes,
				likedByMe: likedCommentIds.has(row.id),
			})),
		);
	}

	return result;
}

function mapPostListRow(
	row: PostListRow,
	likedPostIds: Set<string>,
	topCommentsByPostId: Map<string, PostListItem["topComments"]>,
): PostListItem {
	return {
		slug: row.slug,
		content: row.content,
		createdAt: row.createdAt,
		editedAt: row.editedAt,
		author: row.author,
		attachedBook: row.attachedBook,
		likeCount: row._count.likes,
		commentCount: row._count.comments,
		likedByMe: likedPostIds.has(row.id),
		topComments: topCommentsByPostId.get(row.id) ?? [],
	};
}

async function mapPostDetailRow(
	row: PostDetailRow,
	userId: string | null,
	db: Database,
): Promise<GetPostBySlugOutput> {
	const likedPostIds = await loadLikedPostIds([row.id], userId, db);

	return {
		slug: row.slug,
		content: row.content,
		createdAt: row.createdAt,
		editedAt: row.editedAt,
		author: row.author,
		attachedBook: row.attachedBook,
		likeCount: row._count.likes,
		commentCount: row._count.comments,
		likedByMe: likedPostIds.has(row.id),
	};
}

function assertPostAuthor(post: { authorId: string }, userId: string): void {
	if (post.authorId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the post author can change this post",
		});
	}
}

export async function getPostList(
	input: GetPostListInput,
	db: Database,
	session: Session | null,
): Promise<GetPostListOutput> {
	const pagination = definePagination.cursor(input, postListCursorCodec);
	const sorting = postListSorting.from(input);
	const ranging = postListRanging.from(input);
	const searching = postListSearching.from(input);
	const userId = viewerUserId(session);

	const where = mergeWhereFragments<Prisma.PostWhereInput>(
		ranging.use(),
		searching.use(),
		input.authorUsername ? postAuthorUsernameWhere(input.authorUsername) : {},
		input.hasAttachedBook != null
			? postAttachedBookWhere(input.hasAttachedBook)
			: {},
	);

	const rows = await db.post.findMany({
		...pagination.use(),
		where,
		orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
		select: postListSelect,
	});

	const page = pagination.paginate(rows);
	const postIds = page.items.map((row) => row.id);
	const [likedPostIds, topCommentsByPostId] = await Promise.all([
		loadLikedPostIds(postIds, userId, db),
		loadTopCommentsByPostId(postIds, userId, db),
	]);

	return {
		items: page.items.map((row) =>
			mapPostListRow(row, likedPostIds, topCommentsByPostId),
		),
		metadata: page.metadata,
	};
}

export async function getPostBySlug(
	slug: string,
	db: Database,
	session: Session | null,
): Promise<GetPostBySlugOutput> {
	const post = await db.post.findUnique({
		where: { slug },
		select: getPostBySlugSelect,
	});

	if (!post) {
		throw new ORPCError("NOT_FOUND", {
			message: "Post not found",
			data: { slug },
		});
	}

	return mapPostDetailRow(post, viewerUserId(session), db);
}

export async function createPost(
	input: CreatePostInput,
	userId: string,
	db: Database,
): Promise<CreatePostOutput> {
	const attachedBookId = input.attachedBookSlug
		? await resolveAttachedBookId(input.attachedBookSlug, db)
		: null;

	return db.$transaction(async (tx) => {
		const slug = await generatePostSlug(input.content, tx);

		const post = await tx.post.create({
			data: {
				content: input.content.trim(),
				slug,
				authorId: userId,
				attachedBookId: attachedBookId ?? null,
			},
			select: { id: true, slug: true },
		});

		const xpAwarded = (await awardPostXp({ userId, postId: post.id }, tx))
			? XP_AWARD.post
			: 0;

		return { slug: post.slug, xpAwarded };
	});
}

export async function updatePost(
	input: UpdatePostInput,
	userId: string,
	db: Database,
): Promise<UpdatePostOutput> {
	const post = await db.post.findUnique({
		where: { slug: input.slug },
		select: { id: true, authorId: true, content: true },
	});

	if (!post) {
		throw new ORPCError("NOT_FOUND", {
			message: "Post not found",
			data: { slug: input.slug },
		});
	}

	assertPostAuthor(post, userId);

	const attachedBookId = await resolveAttachedBookId(
		input.attachedBookSlug,
		db,
	);

	const content = input.content?.trim();
	const contentChanged = content != null && content !== post.content;

	await db.post.update({
		where: { id: post.id },
		data: {
			...(content != null ? { content } : {}),
			...(contentChanged ? { editedAt: new Date() } : {}),
			...(attachedBookId !== undefined
				? { attachedBookId: attachedBookId ?? null }
				: {}),
		},
		select: { slug: true },
	});

	return { slug: input.slug };
}

export async function deletePost(
	input: DeletePostInput,
	userId: string,
	db: Database,
): Promise<DeletePostOutput> {
	const post = await db.post.findUnique({
		where: { slug: input.slug },
		select: { id: true, authorId: true },
	});

	if (!post) {
		throw new ORPCError("NOT_FOUND", {
			message: "Post not found",
			data: { slug: input.slug },
		});
	}

	assertPostAuthor(post, userId);

	await db.post.delete({
		where: { id: post.id },
	});

	return { slug: input.slug, deleted: true };
}
