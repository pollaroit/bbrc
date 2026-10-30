import type { Database, Prisma } from "@bbrc/db";
import { LikeSourceSchema } from "@bbrc/schemas";
import type { Viewer } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { threadCommentVisibleWhere } from "../comment/comment-visibility";
import { notifyReactionOnYourPost } from "../notification/notification-triggers";
import { assertPostVisible } from "../post/post-visibility";
import {
	likeVisibleWhere,
	reviewVisibleWhere,
} from "../visibility/visibility-resources";
import { notBlockedWhere } from "../visibility/visibility-where";
import {
	likeListRanging,
	likeListSearching,
	likeListSorting,
	likeListTargetWhere,
} from "./like.listing";
import {
	type GetLikeListInput,
	type GetLikeListOutput,
	type GetViewerLikesInput,
	type GetViewerLikesOutput,
	getLikeListFields,
	type SetLikeInput,
	type ToggleLikeInput,
	type ToggleLikeOutput,
} from "./like.schema";

const likeListSelect = {
	...getLikeListFields,
	id: true,
} as const;

type LikeListRow = Prisma.LikeGetPayload<{
	select: typeof likeListSelect;
}>;

const likeListCursorCodec = {
	decode(cursor: string): { id: string } {
		return { id: cursor };
	},
	encode(item: LikeListRow): string {
		return item.id;
	},
};

type LikeTarget =
	| {
			source: typeof LikeSourceSchema.enum.post;
			postId: string;
			commentId: null;
			feedbackId: null;
			bookId: null;
	  }
	| {
			source: typeof LikeSourceSchema.enum.comment;
			postId: null;
			commentId: string;
			feedbackId: null;
			bookId: null;
	  }
	| {
			source: typeof LikeSourceSchema.enum.feedback;
			postId: null;
			commentId: null;
			feedbackId: string;
			bookId: string;
	  };

function withStableIdOrderBy(
	orderBy: Prisma.LikeOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.LikeOrderByWithRelationInput[] {
	return [orderBy, { id: sortDirection }];
}

/**
 * Likes the viewer may see by name. A like is public space: it follows what it is on (a
 * post, a comment, a review) and never its author's profile; a blocked member's like is
 * left out. Counts never use this.
 */
export function likeListVisibleWhere(viewer: Viewer): Prisma.LikeWhereInput {
	return {
		OR: [
			likeVisibleWhere(viewer) as Prisma.LikeWhereInput,
			{
				AND: [
					{ comment: threadCommentVisibleWhere(viewer) },
					notBlockedWhere(viewer, "userId") as Prisma.LikeWhereInput,
				],
			},
			{
				AND: [
					{ feedback: reviewVisibleWhere(viewer) as Prisma.FeedbackWhereInput },
					notBlockedWhere(viewer, "userId") as Prisma.LikeWhereInput,
				],
			},
		],
	};
}

async function resolvePostTarget(
	postSlug: string,
	db: Database,
	viewer: Viewer,
): Promise<LikeTarget> {
	const post = await db.post.findUnique({
		where: { slug: postSlug },
		select: { id: true, allowLikes: true },
	});

	if (!post) {
		throw new ORPCError("NOT_FOUND", {
			message: "Post not found",
			data: { slug: postSlug },
		});
	}

	await assertPostVisible(db, { id: post.id }, viewer, "Post not found", {
		slug: postSlug,
	});

	if (!post.allowLikes) {
		throw new ORPCError("FORBIDDEN", {
			message: "Likes are turned off for this post.",
		});
	}

	return {
		source: LikeSourceSchema.enum.post,
		postId: post.id,
		commentId: null,
		feedbackId: null,
		bookId: null,
	};
}

async function resolveCommentTarget(
	commentSlug: string,
	db: Database,
	viewer: Viewer,
): Promise<LikeTarget> {
	const comment = await db.comment.findFirst({
		where: { AND: [{ slug: commentSlug }, threadCommentVisibleWhere(viewer)] },
		select: { id: true },
	});

	if (!comment) {
		throw new ORPCError("NOT_FOUND", {
			message: "Comment not found",
			data: { slug: commentSlug },
		});
	}

	return {
		source: LikeSourceSchema.enum.comment,
		postId: null,
		commentId: comment.id,
		feedbackId: null,
		bookId: null,
	};
}

async function resolveFeedbackTarget(
	feedbackSlug: string,
	db: Database,
	viewer: Viewer,
): Promise<LikeTarget> {
	const feedback = await db.feedback.findFirst({
		where: {
			AND: [
				{ slug: feedbackSlug },
				reviewVisibleWhere(viewer) as Prisma.FeedbackWhereInput,
			],
		},
		select: { id: true, bookId: true },
	});

	if (!feedback) {
		throw new ORPCError("NOT_FOUND", {
			message: "Feedback not found",
			data: { slug: feedbackSlug },
		});
	}

	return {
		source: LikeSourceSchema.enum.feedback,
		postId: null,
		commentId: null,
		feedbackId: feedback.id,
		bookId: feedback.bookId,
	};
}

async function resolveLikeTarget(
	input: ToggleLikeInput,
	db: Database,
	viewer: Viewer,
): Promise<LikeTarget> {
	if (input.postSlug) {
		return resolvePostTarget(input.postSlug, db, viewer);
	}

	if (input.commentSlug) {
		return resolveCommentTarget(input.commentSlug, db, viewer);
	}

	if (input.feedbackSlug) {
		return resolveFeedbackTarget(input.feedbackSlug, db, viewer);
	}

	throw new ORPCError("BAD_REQUEST", {
		message: "Provide postSlug, commentSlug, or feedbackSlug",
	});
}

async function countLikesForTarget(
	target: LikeTarget,
	db: Pick<Database, "like">,
): Promise<number> {
	if (target.source === LikeSourceSchema.enum.post) {
		return db.like.count({
			where: {
				source: target.source,
				postId: target.postId,
			},
		});
	}

	if (target.source === LikeSourceSchema.enum.comment) {
		return db.like.count({
			where: {
				source: target.source,
				commentId: target.commentId,
			},
		});
	}

	return db.like.count({
		where: {
			source: target.source,
			feedbackId: target.feedbackId,
		},
	});
}

function existingLikeWhere(
	target: LikeTarget,
	userId: string,
): Prisma.LikeWhereInput {
	if (target.source === LikeSourceSchema.enum.post) {
		return {
			userId,
			source: target.source,
			postId: target.postId,
		};
	}

	if (target.source === LikeSourceSchema.enum.comment) {
		return {
			userId,
			source: target.source,
			commentId: target.commentId,
		};
	}

	return {
		userId,
		source: target.source,
		feedbackId: target.feedbackId,
	};
}

export async function getLikeList(
	input: GetLikeListInput,
	db: Database,
	viewer: Viewer,
): Promise<GetLikeListOutput> {
	const pagination = definePagination.cursor(input, likeListCursorCodec);
	const sorting = likeListSorting.from(input);
	const ranging = likeListRanging.from(input);
	const searching = likeListSearching.from(input);

	const where = mergeWhereFragments<Prisma.LikeWhereInput>(
		likeListTargetWhere(input),
		ranging.use(),
		searching.use(),
		likeListVisibleWhere(viewer),
	);

	const rows = await db.like.findMany({
		...pagination.use(),
		where,
		orderBy: withStableIdOrderBy(sorting.use(), sorting.sortDirection),
		select: likeListSelect,
	});

	const page = pagination.paginate(rows);

	return {
		items: page.items.map((row) => ({
			user: row.user,
			likedAt: row.createdAt,
		})),
		metadata: page.metadata,
	};
}

type LikeIntent = boolean | "toggle";

async function applyLike(
	input: ToggleLikeInput,
	userId: string,
	db: Database,
	intent: LikeIntent,
	viewer: Viewer,
): Promise<ToggleLikeOutput> {
	const target = await resolveLikeTarget(input, db, viewer);

	const result = await db.$transaction(async (tx) => {
		const existing = await tx.like.findFirst({
			where: existingLikeWhere(target, userId),
			select: { id: true },
		});
		const wantsLiked = intent === "toggle" ? !existing : intent;

		if (!wantsLiked) {
			if (existing) {
				await tx.like.delete({ where: { id: existing.id } });
			}

			return {
				source: target.source,
				liked: false,
				created: false,
				likeCount: await countLikesForTarget(target, tx),
			};
		}

		if (!existing) {
			await tx.like.create({
				data: {
					source: target.source,
					userId,
					postId: target.postId,
					commentId: target.commentId,
					feedbackId: target.feedbackId,
				},
			});
		}

		return {
			source: target.source,
			liked: true,
			created: !existing,
			likeCount: await countLikesForTarget(target, tx),
		};
	});

	if (
		result.created &&
		result.source === LikeSourceSchema.enum.post &&
		input.postSlug
	) {
		void notifyReactionOnYourPost(db, input.postSlug, userId);
	}

	return {
		source: result.source,
		liked: result.liked,
		likeCount: result.likeCount,
	};
}

export async function toggleLike(
	input: ToggleLikeInput,
	userId: string,
	db: Database,
	viewer: Viewer,
): Promise<ToggleLikeOutput> {
	return applyLike(input, userId, db, "toggle", viewer);
}

/** Idempotent: sets the viewer's like to exactly `liked`, however many times it is called. */
export async function setLike(
	input: SetLikeInput,
	userId: string,
	db: Database,
	viewer: Viewer,
): Promise<ToggleLikeOutput> {
	const { liked, ...target } = input;
	return applyLike(target, userId, db, liked, viewer);
}

/** Which of the given posts, comments and reviews the viewer has liked. */
export async function getViewerLikes(
	input: GetViewerLikesInput,
	userId: string | null,
	db: Database,
): Promise<GetViewerLikesOutput> {
	const postSlugs = input.postSlugs ?? [];
	const commentSlugs = input.commentSlugs ?? [];
	const feedbackSlugs = input.feedbackSlugs ?? [];

	if (
		!userId ||
		postSlugs.length + commentSlugs.length + feedbackSlugs.length === 0
	) {
		return { postSlugs: [], commentSlugs: [], feedbackSlugs: [] };
	}

	const rows = await db.like.findMany({
		where: {
			userId,
			OR: [
				...(postSlugs.length ? [{ post: { slug: { in: postSlugs } } }] : []),
				...(commentSlugs.length
					? [{ comment: { slug: { in: commentSlugs } } }]
					: []),
				...(feedbackSlugs.length
					? [{ feedback: { slug: { in: feedbackSlugs } } }]
					: []),
			],
		},
		select: {
			post: { select: { slug: true } },
			comment: { select: { slug: true } },
			feedback: { select: { slug: true } },
		},
	});

	return {
		postSlugs: rows.flatMap((row) => (row.post ? [row.post.slug] : [])),
		commentSlugs: rows.flatMap((row) =>
			row.comment ? [row.comment.slug] : [],
		),
		feedbackSlugs: rows.flatMap((row) =>
			row.feedback ? [row.feedback.slug] : [],
		),
	};
}
