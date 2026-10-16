import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import { LikeSourceSchema } from "@bbrc/schemas";
import { MAX_COMMENT_DEPTH } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { assertNormalizedSocialContent } from "../../lib/rich-content";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import {
	notifyCommentOnYourPost,
	notifyReplyToYourComment,
} from "../notification/notification-triggers";
import { tryDeleteR2PublicUrl } from "../storage/storage-r2-cleanup";
import {
	assertContentNotVisible,
	loadActorSocialGate,
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "../user/user-visibility";
import { XP_AWARD } from "../xp/xp.schema";
import { awardCommentXp } from "../xp/xp.service";
import {
	commentAuthorUsernameWhere,
	commentFeedbackSlugWhere,
	commentListRanging,
	commentListSearching,
	commentListSorting,
	commentPostSlugWhere,
} from "./comment.listing";
import {
	type CommentListItem,
	type CreateCommentInput,
	type CreateCommentOutput,
	type DeleteCommentInput,
	type DeleteCommentOutput,
	type GetCommentBySlugOutput,
	type GetCommentListInput,
	type GetCommentListOutput,
	getCommentBySlugFields,
	getCommentListFields,
	type UpdateCommentInput,
	type UpdateCommentOutput,
} from "./comment.schema";
import { generateCommentSlug } from "./comment-slug";

const commentListSelect = {
	...getCommentListFields,
	id: true,
} as const;

type CommentListRow = Prisma.CommentGetPayload<{
	select: typeof commentListSelect;
}>;

const getCommentBySlugSelect = {
	...getCommentBySlugFields,
	_count: {
		select: {
			likes: true,
			replies: true,
		},
	},
} as const;

type CommentDetailRow = Prisma.CommentGetPayload<{
	select: typeof getCommentBySlugSelect;
}>;

const commentListCursorCodec = {
	decode(cursor: string): { slug: string } {
		return { slug: cursor };
	},
	encode(item: CommentListRow): string {
		return item.slug;
	},
};

function withStableSlugOrderBy(
	orderBy: Prisma.CommentOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.CommentOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

function viewerUserId(session: Session | null): string | null {
	return session?.user.id ?? null;
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

function mapCommentListRow(
	row: CommentListRow,
	likedCommentIds: Set<string>,
): CommentListItem {
	return {
		slug: row.slug,
		content: row.content,
		imageUrl: row.imageUrl,
		isSpoiler: row.isSpoiler,
		createdAt: row.createdAt,
		editedAt: row.editedAt,
		depth: row.depth,
		parentSlug: row.parent?.slug ?? null,
		author: row.author,
		likeCount: row._count.likes,
		likedByMe: likedCommentIds.has(row.id),
		replyCount: row._count.replies,
	};
}

function mapCommentDetailRow(
	row: CommentDetailRow,
	likedCommentIds: Set<string>,
): GetCommentBySlugOutput {
	return {
		slug: row.slug,
		content: row.content,
		imageUrl: row.imageUrl,
		isSpoiler: row.isSpoiler,
		createdAt: row.createdAt,
		editedAt: row.editedAt,
		depth: row.depth,
		parentSlug: row.parent?.slug ?? null,
		postSlug: row.post?.slug ?? null,
		feedbackSlug: row.feedback?.slug ?? null,
		bookSlug: row.feedback?.book.slug ?? null,
		author: row.author,
		likeCount: row._count.likes,
		likedByMe: likedCommentIds.has(row.id),
		replyCount: row._count.replies,
	};
}

function assertCommentAuthor(
	comment: { authorId: string },
	userId: string,
): void {
	if (comment.authorId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the comment author can change this comment",
		});
	}
}

async function loadPostIdBySlug(
	postSlug: string,
	db: Database,
): Promise<string> {
	const post = await db.post.findUnique({
		where: { slug: postSlug },
		select: { id: true },
	});

	if (!post) {
		throw new ORPCError("NOT_FOUND", {
			message: "Post not found",
			data: { slug: postSlug },
		});
	}

	return post.id;
}

async function loadFeedbackIdBySlug(
	feedbackSlug: string,
	db: Database,
): Promise<string> {
	const feedback = await db.feedback.findUnique({
		where: { slug: feedbackSlug },
		select: { id: true },
	});

	if (!feedback) {
		throw new ORPCError("NOT_FOUND", {
			message: "Feedback not found",
			data: { slug: feedbackSlug },
		});
	}

	return feedback.id;
}

export async function getCommentList(
	input: GetCommentListInput,
	db: Database,
	session: Session | null,
): Promise<GetCommentListOutput> {
	const pagination = definePagination.cursor(input, commentListCursorCodec);
	const sorting = commentListSorting.from(input);
	const ranging = commentListRanging.from(input);
	const searching = commentListSearching.from(input);
	const userId = viewerUserId(session);

	const targetWhere = input.postSlug
		? commentPostSlugWhere(input.postSlug)
		: commentFeedbackSlugWhere(input.feedbackSlug!);

	const where = mergeWhereFragments<Prisma.CommentWhereInput>(
		targetWhere,
		ranging.use(),
		searching.use(),
		input.authorUsername
			? commentAuthorUsernameWhere(input.authorUsername)
			: {},
		{ author: visibleOnSiteUserWhere },
	);

	const rows = await db.comment.findMany({
		...pagination.use(),
		where,
		orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
		select: commentListSelect,
	});

	const page = pagination.paginate(rows);
	const likedCommentIds = await loadLikedCommentIds(
		page.items.map((row) => row.id),
		userId,
		db,
	);

	return {
		items: page.items.map((row) => mapCommentListRow(row, likedCommentIds)),
		metadata: page.metadata,
	};
}

export async function getCommentBySlug(
	slug: string,
	db: Database,
	session: Session | null,
): Promise<GetCommentBySlugOutput> {
	const comment = await db.comment.findUnique({
		where: { slug },
		select: getCommentBySlugSelect,
	});

	if (!comment) {
		throw new ORPCError("NOT_FOUND", {
			message: "Comment not found",
			data: { slug },
		});
	}

	const author = await db.user.findUnique({
		where: { id: comment.authorId },
		select: { id: true, isHidden: true },
	});

	assertContentNotVisible(
		author ?? { id: comment.authorId, isHidden: true },
		viewerFromSession(session),
		"Comment not found",
		{ slug },
	);

	const likedCommentIds = await loadLikedCommentIds(
		[comment.id],
		viewerUserId(session),
		db,
	);

	return mapCommentDetailRow(comment, likedCommentIds);
}

export async function createComment(
	input: CreateCommentInput,
	userId: string,
	db: Database,
): Promise<CreateCommentOutput> {
	await loadActorSocialGate(userId, db);

	const postId = input.postSlug
		? await loadPostIdBySlug(input.postSlug, db)
		: null;
	const feedbackId = input.feedbackSlug
		? await loadFeedbackIdBySlug(input.feedbackSlug, db)
		: null;

	let parent: {
		id: string;
		postId: string | null;
		feedbackId: string | null;
		depth: number;
		authorId: string;
	} | null = null;

	if (input.parentSlug) {
		const row = await db.comment.findUnique({
			where: { slug: input.parentSlug },
			select: {
				id: true,
				postId: true,
				feedbackId: true,
				depth: true,
				authorId: true,
			},
		});

		const sameTarget =
			row &&
			((postId != null && row.postId === postId) ||
				(feedbackId != null && row.feedbackId === feedbackId));

		if (!row || !sameTarget) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Reply target must be a comment on this thread",
				data: { parentSlug: input.parentSlug },
			});
		}

		if (row.depth >= MAX_COMMENT_DEPTH) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Replies cannot exceed ${MAX_COMMENT_DEPTH + 1} levels deep`,
			});
		}

		parent = row;
	}

	const content = assertNormalizedSocialContent(input.content);

	return db
		.$transaction(async (tx) => {
			const slug = await generateCommentSlug(content, tx);

			const comment = await tx.comment.create({
				data: {
					content,
					isSpoiler: input.isSpoiler ?? false,
					slug,
					authorId: userId,
					postId,
					feedbackId,
					parentId: parent?.id ?? null,
					depth: parent ? parent.depth + 1 : 0,
				},
				select: { id: true, slug: true },
			});

			const xpAwarded = (await awardCommentXp(
				{ userId, commentId: comment.id },
				tx,
			))
				? XP_AWARD.comment
				: 0;

			return {
				slug: comment.slug,
				xpAwarded,
				parentAuthorId: parent?.authorId ?? null,
			};
		})
		.then(async (result) => {
			if (input.postSlug) {
				if (parent) {
					void notifyReplyToYourComment(
						db,
						input.postSlug,
						result.slug,
						userId,
						result.parentAuthorId,
					);
				} else {
					void notifyCommentOnYourPost(db, input.postSlug, userId);
				}
			}

			return { slug: result.slug, xpAwarded: result.xpAwarded };
		});
}

export async function updateComment(
	input: UpdateCommentInput,
	userId: string,
	db: Database,
): Promise<UpdateCommentOutput> {
	const comment = await db.comment.findUnique({
		where: { slug: input.slug },
		select: { id: true, authorId: true, content: true },
	});

	if (!comment) {
		throw new ORPCError("NOT_FOUND", {
			message: "Comment not found",
			data: { slug: input.slug },
		});
	}

	assertCommentAuthor(comment, userId);

	const normalizedContent =
		input.content != null
			? assertNormalizedSocialContent(input.content)
			: undefined;
	const contentChanged =
		normalizedContent != null && normalizedContent !== comment.content;

	await db.comment.update({
		where: { id: comment.id },
		data: {
			...(normalizedContent != null ? { content: normalizedContent } : {}),
			...(input.isSpoiler !== undefined ? { isSpoiler: input.isSpoiler } : {}),
			...(contentChanged ? { editedAt: new Date() } : {}),
		},
		select: { slug: true },
	});

	return { slug: input.slug };
}

export async function deleteComment(
	input: DeleteCommentInput,
	userId: string,
	db: Database,
): Promise<DeleteCommentOutput> {
	const comment = await db.comment.findUnique({
		where: { slug: input.slug },
		select: { id: true, authorId: true, imageUrl: true },
	});

	if (!comment) {
		throw new ORPCError("NOT_FOUND", {
			message: "Comment not found",
			data: { slug: input.slug },
		});
	}

	assertCommentAuthor(comment, userId);

	await tryDeleteR2PublicUrl(comment.imageUrl);

	await db.comment.delete({
		where: { id: comment.id },
	});

	return { slug: input.slug, deleted: true };
}
