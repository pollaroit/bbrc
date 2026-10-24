import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import { LikeSourceSchema } from "@bbrc/schemas";
import {
	decodePostFeedCursor,
	encodePostFeedCursor,
	type PostFeedCursor,
	type PostFeedRange,
	type PostFeedSort,
	postFeedRangeMin,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { assertNormalizedSocialContent } from "../../lib/rich-content";
import { mergeWhereFragments } from "../../utils/searching";
import { notifyMemberPosted } from "../notification/notification-triggers";
import {
	createPostPoll,
	loadPollViews,
	pollViewer,
} from "../post-poll/post-poll.service";
import { tryDeleteR2PublicUrl } from "../storage/storage-r2-cleanup";
import {
	assertContentNotVisible,
	loadActorSocialGate,
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "../user/user-visibility";
import { XP_AWARD } from "../xp/xp.schema";
import { awardPostXp } from "../xp/xp.service";
import {
	postAttachedBookWhere,
	postAuthorUsernameWhere,
	postListSearching,
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
import {
	mapPostAttachmentFromPostRow,
	syncPostAttachment,
} from "./post-attachment.service";
import { queryRankedPostSlugs } from "./post-feed-query";
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

const topCommentSelect = {
	id: true,
	slug: true,
	content: true,
	imageUrl: true,
	isSpoiler: true,
	createdAt: true,
	postId: true,
	author: {
		select: postAuthorFields,
	},
	_count: {
		select: {
			likes: true,
			replies: true,
		},
	},
} as const;

const replyPreviewSelect = {
	...topCommentSelect,
	parentId: true,
} as const;

type TopCommentRow = Prisma.CommentGetPayload<{
	select: typeof topCommentSelect;
}>;

function viewerUserId(session: Session | null): string | null {
	return session?.user.id ?? null;
}

function groupTopComments(
	comments: TopCommentRow[],
	limit: number,
): Map<string, TopCommentRow[]> {
	const byPostId = new Map<string, TopCommentRow[]>();

	for (const comment of comments) {
		if (!comment.postId) {
			continue;
		}
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
		where: { postId: { in: postIds }, parentId: null },
		select: topCommentSelect,
	});

	const grouped = groupTopComments(comments, limit);
	const previewComments = [...grouped.values()].flat();

	// The newest reply under each previewed comment.
	const replyRows =
		previewComments.length > 0
			? await db.comment.findMany({
					where: { parentId: { in: previewComments.map((row) => row.id) } },
					orderBy: { createdAt: "desc" },
					select: replyPreviewSelect,
				})
			: [];
	const latestReplyByParent = new Map<string, (typeof replyRows)[number]>();
	for (const reply of replyRows) {
		if (reply.parentId && !latestReplyByParent.has(reply.parentId)) {
			latestReplyByParent.set(reply.parentId, reply);
		}
	}

	const likedCommentIds = await loadLikedCommentIds(
		[
			...previewComments.map((row) => row.id),
			...[...latestReplyByParent.values()].map((row) => row.id),
		],
		userId,
		db,
	);

	const result = new Map<string, PostListItem["topComments"]>();

	for (const [postId, rows] of grouped) {
		result.set(
			postId,
			rows.map((row) => {
				const reply = latestReplyByParent.get(row.id);
				return {
					slug: row.slug,
					content: row.content,
					imageUrl: row.imageUrl,
					isSpoiler: row.isSpoiler,
					createdAt: row.createdAt,
					author: row.author,
					likeCount: row._count.likes,
					likedByMe: likedCommentIds.has(row.id),
					replyCount: row._count.replies,
					latestReply: reply
						? {
								slug: reply.slug,
								content: reply.content,
								imageUrl: reply.imageUrl,
								isSpoiler: reply.isSpoiler,
								createdAt: reply.createdAt,
								author: reply.author,
								likeCount: reply._count.likes,
								likedByMe: likedCommentIds.has(reply.id),
							}
						: null,
				};
			}),
		);
	}

	return result;
}

function mapPostListRow(
	row: PostListRow,
	likedPostIds: Set<string>,
	topCommentsByPostId: Map<string, PostListItem["topComments"]>,
	polls: Map<string, PostListItem["poll"]>,
): PostListItem {
	return {
		slug: row.slug,
		content: row.content,
		imageUrl: row.imageUrl,
		isSpoiler: row.isSpoiler,
		allowLikes: row.allowLikes,
		allowComments: row.allowComments,
		allowShares: row.allowShares,
		poll: polls.get(row.id) ?? null,
		createdAt: row.createdAt,
		editedAt: row.editedAt,
		author: row.author,
		attachment: mapPostAttachmentFromPostRow({
			attachment: row.attachment,
			attachedBook: row.attachedBook,
		}),
		likeCount: row._count.likes,
		commentCount: row._count.comments,
		likedByMe: likedPostIds.has(row.id),
		topComments: topCommentsByPostId.get(row.id) ?? [],
	};
}

async function mapPostDetailRow(
	row: PostDetailRow,
	session: Session | null,
	db: Database,
): Promise<GetPostBySlugOutput> {
	const userId = viewerUserId(session);
	const [likedPostIds, polls] = await Promise.all([
		loadLikedPostIds([row.id], userId, db),
		loadPollViews(db, [row.id], pollViewer(session)),
	]);

	return {
		slug: row.slug,
		content: row.content,
		imageUrl: row.imageUrl,
		isSpoiler: row.isSpoiler,
		allowLikes: row.allowLikes,
		allowComments: row.allowComments,
		allowShares: row.allowShares,
		poll: polls.get(row.id) ?? null,
		createdAt: row.createdAt,
		editedAt: row.editedAt,
		author: row.author,
		attachment: mapPostAttachmentFromPostRow({
			attachment: row.attachment,
			attachedBook: row.attachedBook,
		}),
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

function resolveFeedMode(input: GetPostListInput): {
	feedSort: PostFeedSort;
	feedRange: PostFeedRange;
} {
	if (input.authorUsername) {
		return { feedSort: "recent", feedRange: "all" };
	}

	return {
		feedSort: input.feedSort ?? "hot",
		feedRange: input.feedRange ?? "week",
	};
}

function buildRecentCursorWhere(
	cursor: Extract<PostFeedCursor, { kind: "recent" }>,
): Prisma.PostWhereInput {
	const createdAt = new Date(cursor.createdAt);
	return {
		OR: [
			{ createdAt: { lt: createdAt } },
			{ createdAt, slug: { lt: cursor.slug } },
		],
	};
}

async function fetchPostsBySlugsInOrder(
	slugs: string[],
	db: Database,
): Promise<PostListRow[]> {
	if (slugs.length === 0) {
		return [];
	}

	const rows = await db.post.findMany({
		where: { slug: { in: slugs } },
		select: postListSelect,
	});
	const bySlug = new Map(rows.map((row) => [row.slug, row]));

	return slugs.flatMap((slug) => {
		const row = bySlug.get(slug);
		return row ? [row] : [];
	});
}

async function hydratePostListPage(
	rows: PostListRow[],
	session: Session | null,
	db: Database,
): Promise<PostListItem[]> {
	const postIds = rows.map((row) => row.id);
	const userId = viewerUserId(session);
	const [likedPostIds, topCommentsByPostId, polls] = await Promise.all([
		loadLikedPostIds(postIds, userId, db),
		loadTopCommentsByPostId(postIds, userId, db),
		loadPollViews(db, postIds, pollViewer(session)),
	]);

	return rows.map((row) =>
		mapPostListRow(row, likedPostIds, topCommentsByPostId, polls),
	);
}

function listPageMetadata(input: {
	limit: number;
	hasNextPage: boolean;
	cursor?: string;
	nextCursor: string | null;
}) {
	return {
		limit: input.limit,
		hasNextPage: input.hasNextPage,
		hasPreviousPage: input.cursor != null,
		nextCursor: input.nextCursor,
	};
}

export async function getPostList(
	input: GetPostListInput,
	db: Database,
	session: Session | null,
): Promise<GetPostListOutput> {
	const searching = postListSearching.from(input);
	const limit = input.limit ?? 10;
	const overfetch = limit + 1;
	const { feedSort, feedRange } = resolveFeedMode(input);
	const feedCursor = input.cursor ? decodePostFeedCursor(input.cursor) : null;

	const baseWhere = mergeWhereFragments<Prisma.PostWhereInput>(
		searching.use(),
		input.authorUsername ? postAuthorUsernameWhere(input.authorUsername) : {},
		input.hasAttachedBook != null
			? postAttachedBookWhere(input.hasAttachedBook)
			: {},
		{ author: visibleOnSiteUserWhere },
	);

	if (feedSort === "hot" || feedSort === "top") {
		const ranked = await queryRankedPostSlugs(db, {
			mode: feedSort,
			feedRange,
			authorUsername: input.authorUsername,
			limit: overfetch,
			cursor: feedCursor,
		});
		const pageRanked = ranked.slice(0, limit);
		const rows = await fetchPostsBySlugsInOrder(
			pageRanked.map((entry) => entry.slug),
			db,
		);
		const lastIncluded = ranked.at(limit - 1);
		const nextCursor =
			ranked.length > limit && lastIncluded
				? encodePostFeedCursor({
						kind: feedSort,
						score: lastIncluded.score,
						slug: lastIncluded.slug,
					})
				: null;

		return {
			items: await hydratePostListPage(rows, session, db),
			metadata: listPageMetadata({
				limit,
				hasNextPage: ranked.length > limit,
				cursor: input.cursor,
				nextCursor,
			}),
		};
	}

	const rangeMin = input.authorUsername
		? undefined
		: postFeedRangeMin(feedRange);
	const recentCursor = feedCursor?.kind === "recent" ? feedCursor : null;

	const rows = await db.post.findMany({
		take: overfetch,
		where: mergeWhereFragments(
			baseWhere,
			rangeMin ? { createdAt: { gte: rangeMin } } : {},
			recentCursor ? buildRecentCursorWhere(recentCursor) : {},
		),
		orderBy: [{ createdAt: "desc" }, { slug: "desc" }],
		select: postListSelect,
	});

	const hasNextPage = rows.length > limit;
	const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
	const lastRow = pageRows.at(-1);
	const nextCursor =
		hasNextPage && lastRow
			? encodePostFeedCursor({
					kind: "recent",
					createdAt: lastRow.createdAt.toISOString(),
					slug: lastRow.slug,
				})
			: null;

	return {
		items: await hydratePostListPage(pageRows, session, db),
		metadata: listPageMetadata({
			limit,
			hasNextPage,
			cursor: input.cursor,
			nextCursor,
		}),
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

	const author = await db.user.findUnique({
		where: { id: post.authorId },
		select: { id: true, isHidden: true },
	});

	assertContentNotVisible(
		author ?? { id: post.authorId, isHidden: true },
		viewerFromSession(session),
		"Post not found",
		{ slug },
	);

	return mapPostDetailRow(post, session, db);
}

function resolveCreateAttachment(
	input: CreatePostInput,
): CreatePostInput["attachment"] | null {
	if (input.attachment) {
		return input.attachment;
	}
	if (input.attachedBookSlug) {
		return { kind: "book", slug: input.attachedBookSlug };
	}
	return null;
}

export async function createPost(
	input: CreatePostInput,
	userId: string,
	db: Database,
): Promise<CreatePostOutput> {
	await loadActorSocialGate(userId, db);

	const content = assertNormalizedSocialContent(input.content);
	const attachmentInput = resolveCreateAttachment(input);

	if (input.poll && attachmentInput) {
		throw new ORPCError("BAD_REQUEST", {
			message: "A post with a poll cannot have another attachment.",
		});
	}

	const result = await db.$transaction(async (tx) => {
		const slug = await generatePostSlug(content, tx);

		const post = await tx.post.create({
			data: {
				content,
				isSpoiler: input.isSpoiler ?? false,
				allowLikes: input.allowLikes ?? true,
				allowComments: input.allowComments ?? true,
				allowShares: input.allowShares ?? true,
				slug,
				authorId: userId,
				attachedBookId: null,
			},
			select: { id: true, slug: true },
		});

		if (input.poll) {
			await createPostPoll(tx, post.id, userId, input.poll);
		}

		const attachedBookId = await syncPostAttachment(
			post.id,
			attachmentInput ?? null,
			tx,
			userId,
		);
		await tx.post.update({
			where: { id: post.id },
			data: { attachedBookId: attachedBookId ?? null },
		});

		const xpAwarded = (await awardPostXp({ userId, postId: post.id }, tx))
			? XP_AWARD.post
			: 0;

		return { slug: post.slug, xpAwarded };
	});

	void notifyMemberPosted(db, userId, result.slug);

	return result;
}

export async function updatePost(
	input: UpdatePostInput,
	userId: string,
	db: Database,
): Promise<UpdatePostOutput> {
	const post = await db.post.findUnique({
		where: { slug: input.slug },
		select: {
			id: true,
			authorId: true,
			content: true,
			imageUrl: true,
			poll: { select: { id: true } },
		},
	});

	if (!post) {
		throw new ORPCError("NOT_FOUND", {
			message: "Post not found",
			data: { slug: input.slug },
		});
	}

	assertPostAuthor(post, userId);

	if (post.poll && input.attachment) {
		throw new ORPCError("BAD_REQUEST", {
			message: "A post with a poll cannot have another attachment.",
		});
	}

	const normalizedContent =
		input.content != null
			? assertNormalizedSocialContent(input.content)
			: undefined;
	const contentChanged =
		normalizedContent != null && normalizedContent !== post.content;

	let attachmentPatch: CreatePostInput["attachment"] | null | undefined;
	if (input.attachment !== undefined) {
		attachmentPatch = input.attachment;
	} else if (input.attachedBookSlug !== undefined) {
		attachmentPatch = input.attachedBookSlug
			? { kind: "book", slug: input.attachedBookSlug }
			: null;
	}

	await db.$transaction(async (tx) => {
		const attachedBookId = await syncPostAttachment(
			post.id,
			attachmentPatch,
			tx,
			userId,
		);

		await tx.post.update({
			where: { id: post.id },
			data: {
				...(normalizedContent != null ? { content: normalizedContent } : {}),
				...(input.isSpoiler !== undefined
					? { isSpoiler: input.isSpoiler }
					: {}),
				...(input.allowLikes !== undefined
					? { allowLikes: input.allowLikes }
					: {}),
				...(input.allowComments !== undefined
					? { allowComments: input.allowComments }
					: {}),
				...(input.allowShares !== undefined
					? { allowShares: input.allowShares }
					: {}),
				...(contentChanged ? { editedAt: new Date() } : {}),
				...(attachedBookId !== undefined
					? { attachedBookId: attachedBookId ?? null }
					: {}),
			},
			select: { id: true },
		});
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
		select: { id: true, authorId: true, imageUrl: true },
	});

	if (!post) {
		throw new ORPCError("NOT_FOUND", {
			message: "Post not found",
			data: { slug: input.slug },
		});
	}

	assertPostAuthor(post, userId);

	await tryDeleteR2PublicUrl(post.imageUrl);

	await db.post.delete({
		where: { id: post.id },
	});

	return { slug: input.slug, deleted: true };
}

export async function getPostAttachmentPreference(
	userId: string,
	db: Database,
) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { allowPostAttachment: true },
	});
	return { allowPostAttachment: user?.allowPostAttachment ?? true };
}

export async function setPostAttachmentPreference(
	allowPostAttachment: boolean,
	userId: string,
	db: Database,
) {
	const user = await db.user.update({
		where: { id: userId },
		data: { allowPostAttachment },
		select: { allowPostAttachment: true },
	});
	return { allowPostAttachment: user.allowPostAttachment };
}
