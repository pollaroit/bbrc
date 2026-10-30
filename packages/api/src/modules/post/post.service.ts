import type { Database, Prisma } from "@bbrc/db";
import { LikeSourceSchema } from "@bbrc/schemas";
import {
	decodePostFeedCursor,
	encodePostFeedCursor,
	type PostFeedCursor,
	type PostFeedRange,
	type PostFeedSort,
	postAttachmentConflict,
	postFeedRangeMin,
	type Viewer,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { assertNormalizedSocialContent } from "../../lib/rich-content";
import { mergeWhereFragments } from "../../utils/searching";
import { warmLinkPreviewsInContent } from "../link-unfurl/link-unfurl.service";
import {
	loadMentionedIds,
	notifyMentions,
	prepareContentMentions,
	syncContentMentions,
} from "../mention/mention.service";
import { notifyMemberPosted } from "../notification/notification-triggers";
import {
	createPostPoll,
	loadPollViews,
	pollViewer,
} from "../post-poll/post-poll.service";
import {
	createPostTierlist,
	loadTierlistViews,
	tierlistImageUrls,
} from "../post-tierlist/post-tierlist.service";
import { tryDeleteR2PublicUrl } from "../storage/storage-r2-cleanup";
import {
	commentVisibleWhere,
	postVisibleWhere,
} from "../visibility/visibility-resources";
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
	assertAttachmentVisible,
	fillAuthorAttachments,
	mapPostAttachmentFromPostRow,
	syncPostAttachment,
} from "./post-attachment.service";
import { queryRankedPostSlugs } from "./post-feed-query";
import { generatePostSlug } from "./post-slug";
import { assertPostVisible, viewerUserId } from "./post-visibility";

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
	viewer: Viewer,
	db: Database,
	limit = 3,
): Promise<Map<string, PostListItem["topComments"]>> {
	const userId = viewerUserId(viewer);
	const visible = commentVisibleWhere(viewer) as Prisma.CommentWhereInput;
	if (postIds.length === 0) {
		return new Map();
	}

	const comments = await db.comment.findMany({
		where: { AND: [{ postId: { in: postIds }, parentId: null }, visible] },
		select: topCommentSelect,
	});

	const grouped = groupTopComments(comments, limit);
	const previewComments = [...grouped.values()].flat();

	// The newest reply under each previewed comment.
	const replyRows =
		previewComments.length > 0
			? await db.comment.findMany({
					where: {
						AND: [
							{ parentId: { in: previewComments.map((row) => row.id) } },
							visible,
						],
					},
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
	tierlists: Map<string, PostListItem["tierlist"]>,
	viewer: Viewer,
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
		tierlist: tierlists.get(row.id) ?? null,
		createdAt: row.createdAt,
		editedAt: row.editedAt,
		author: row.author,
		attachment: mapPostAttachmentFromPostRow({
			attachment: row.attachment,
			attachedBook: row.attachedBook,
			viewer,
		}),
		likeCount: row._count.likes,
		commentCount: row._count.comments,
		likedByMe: likedPostIds.has(row.id),
		topComments: topCommentsByPostId.get(row.id) ?? [],
	};
}

async function mapPostDetailRow(
	row: PostDetailRow,
	viewer: Viewer,
	db: Database,
): Promise<GetPostBySlugOutput> {
	const userId = viewerUserId(viewer);
	const [likedPostIds, polls, tierlists] = await Promise.all([
		loadLikedPostIds([row.id], userId, db),
		loadPollViews(db, [row.id], pollViewer(viewer)),
		loadTierlistViews(db, [row.id]),
	]);

	const attachment = mapPostAttachmentFromPostRow({
		attachment: row.attachment,
		attachedBook: row.attachedBook,
		viewer,
	});
	await fillAuthorAttachments(db, [attachment]);

	return {
		visibility: "public",
		slug: row.slug,
		content: row.content,
		imageUrl: row.imageUrl,
		isSpoiler: row.isSpoiler,
		allowLikes: row.allowLikes,
		allowComments: row.allowComments,
		allowShares: row.allowShares,
		poll: polls.get(row.id) ?? null,
		tierlist: tierlists.get(row.id) ?? null,
		createdAt: row.createdAt,
		editedAt: row.editedAt,
		author: row.author,
		attachment,
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
	viewer: Viewer,
	db: Database,
): Promise<PostListItem[]> {
	const postIds = rows.map((row) => row.id);
	const userId = viewerUserId(viewer);
	const [likedPostIds, topCommentsByPostId, polls, tierlists] =
		await Promise.all([
			loadLikedPostIds(postIds, userId, db),
			loadTopCommentsByPostId(postIds, viewer, db),
			loadPollViews(db, postIds, pollViewer(viewer)),
			loadTierlistViews(db, postIds),
		]);

	const items = rows.map((row) =>
		mapPostListRow(
			row,
			likedPostIds,
			topCommentsByPostId,
			polls,
			tierlists,
			viewer,
		),
	);
	await fillAuthorAttachments(
		db,
		items.map((item) => item.attachment),
	);
	return items;
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
	viewer: Viewer,
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
		postVisibleWhere(viewer) as Prisma.PostWhereInput,
	);

	if (feedSort === "hot" || feedSort === "top") {
		const ranked = await queryRankedPostSlugs(db, {
			mode: feedSort,
			feedRange,
			authorUsername: input.authorUsername,
			limit: overfetch,
			cursor: feedCursor,
			viewer,
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
			items: await hydratePostListPage(rows, viewer, db),
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
		items: await hydratePostListPage(pageRows, viewer, db),
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
	viewer: Viewer,
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

	await assertPostVisible(db, { id: post.id }, viewer, "Post not found", {
		slug,
	});

	return mapPostDetailRow(post, viewer, db);
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
	viewer: Viewer,
): Promise<CreatePostOutput> {
	const prepared = await prepareContentMentions(db, {
		content: assertNormalizedSocialContent(input.content),
		authorId: userId,
	});
	const content = prepared.content;
	// Outside links get their preview ready now (bounded; never fails the save).
	await warmLinkPreviewsInContent(db, userId, content);
	const attachmentInput = resolveCreateAttachment(input);
	if (attachmentInput) {
		await assertAttachmentVisible(attachmentInput, db, viewer);
	}

	const conflict = postAttachmentConflict({
		poll: input.poll != null,
		tierlist: input.tierlist != null,
		attachment: attachmentInput != null,
	});
	if (conflict) {
		throw new ORPCError("BAD_REQUEST", { message: conflict });
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
		if (input.tierlist) {
			await createPostTierlist(tx, post.id, input.tierlist);
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

		const freshMentions = await syncContentMentions(tx, {
			ref: { kind: "post", id: post.id },
			authorId: userId,
			mentioned: prepared.mentioned,
		});

		return { slug: post.slug, xpAwarded, freshMentions };
	});

	void notifyMentions(db, {
		authorId: userId,
		recipientIds: result.freshMentions,
		content,
		href: `/posts/${result.slug}`,
	});
	// A member who is mentioned gets the mention, not also the "new post" notice.
	void notifyMemberPosted(db, userId, result.slug, result.freshMentions);

	return { slug: result.slug, xpAwarded: result.xpAwarded };
}

export async function updatePost(
	input: UpdatePostInput,
	userId: string,
	db: Database,
	viewer: Viewer,
): Promise<UpdatePostOutput> {
	const post = await db.post.findUnique({
		where: { slug: input.slug },
		select: {
			id: true,
			authorId: true,
			content: true,
			imageUrl: true,
			poll: { select: { id: true } },
			tierlist: { select: { id: true } },
		},
	});

	if (!post) {
		throw new ORPCError("NOT_FOUND", {
			message: "Post not found",
			data: { slug: input.slug },
		});
	}

	assertPostAuthor(post, userId);

	if (input.attachment) {
		const conflict = postAttachmentConflict({
			poll: post.poll != null,
			tierlist: post.tierlist != null,
			attachment: true,
		});
		if (conflict) {
			throw new ORPCError("BAD_REQUEST", { message: conflict });
		}
	}

	const preparedContent =
		input.content != null
			? await prepareContentMentions(db, {
					content: assertNormalizedSocialContent(input.content),
					authorId: userId,
					alreadyMentionedIds: await loadMentionedIds(db, {
						kind: "post",
						id: post.id,
					}),
				})
			: undefined;
	const normalizedContent = preparedContent?.content;
	const contentChanged =
		normalizedContent != null && normalizedContent !== post.content;
	if (normalizedContent != null && contentChanged) {
		await warmLinkPreviewsInContent(db, userId, normalizedContent);
	}
	let freshMentions: string[] = [];

	let attachmentPatch: CreatePostInput["attachment"] | null | undefined;
	if (input.attachment !== undefined) {
		attachmentPatch = input.attachment;
	} else if (input.attachedBookSlug !== undefined) {
		attachmentPatch = input.attachedBookSlug
			? { kind: "book", slug: input.attachedBookSlug }
			: null;
	}

	if (attachmentPatch) {
		await assertAttachmentVisible(attachmentPatch, db, viewer);
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

		if (preparedContent) {
			freshMentions = await syncContentMentions(tx, {
				ref: { kind: "post", id: post.id },
				authorId: userId,
				mentioned: preparedContent.mentioned,
			});
		}
	});

	if (normalizedContent != null) {
		void notifyMentions(db, {
			authorId: userId,
			recipientIds: freshMentions,
			content: normalizedContent,
			href: `/posts/${input.slug}`,
		});
	}

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
	for (const url of await tierlistImageUrls(db, post.id)) {
		await tryDeleteR2PublicUrl(url);
	}

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

/**
 * Posts matching a `where`, newest first, in the same shape as the feed (for pages
 * that show "posts about X", such as an author's posts tab). Only posts the viewer may see.
 */
export async function getPostListForWhere(
	input: { where: Prisma.PostWhereInput; limit: number; cursor?: string },
	db: Database,
	viewer: Viewer,
): Promise<GetPostListOutput> {
	const feedCursor = input.cursor ? decodePostFeedCursor(input.cursor) : null;
	const recentCursor = feedCursor?.kind === "recent" ? feedCursor : null;

	const rows = await db.post.findMany({
		take: input.limit + 1,
		where: mergeWhereFragments<Prisma.PostWhereInput>(
			input.where,
			postVisibleWhere(viewer) as Prisma.PostWhereInput,
			recentCursor ? buildRecentCursorWhere(recentCursor) : {},
		),
		orderBy: [{ createdAt: "desc" }, { slug: "desc" }],
		select: postListSelect,
	});

	const hasNextPage = rows.length > input.limit;
	const pageRows = hasNextPage ? rows.slice(0, input.limit) : rows;
	const lastRow = pageRows.at(-1);

	return {
		items: await hydratePostListPage(pageRows, viewer, db),
		metadata: listPageMetadata({
			limit: input.limit,
			hasNextPage,
			cursor: input.cursor,
			nextCursor:
				hasNextPage && lastRow
					? encodePostFeedCursor({
							kind: "recent",
							createdAt: lastRow.createdAt.toISOString(),
							slug: lastRow.slug,
						})
					: null,
		}),
	};
}
