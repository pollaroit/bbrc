import type { Database, Prisma } from "@bbrc/db";
import { LikeSourceSchema } from "@bbrc/schemas";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { notifyReactionOnYourPost } from "../notification/notification-triggers";
import {
	likeListRanging,
	likeListSearching,
	likeListSorting,
	likeListTargetWhere,
} from "./like.listing";
import {
	type GetLikeListInput,
	type GetLikeListOutput,
	getLikeListFields,
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

async function resolvePostTarget(
	postSlug: string,
	db: Database,
): Promise<LikeTarget> {
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
): Promise<LikeTarget> {
	const comment = await db.comment.findUnique({
		where: { slug: commentSlug },
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
): Promise<LikeTarget> {
	const feedback = await db.feedback.findUnique({
		where: { slug: feedbackSlug },
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
): Promise<LikeTarget> {
	if (input.postSlug) {
		return resolvePostTarget(input.postSlug, db);
	}

	if (input.commentSlug) {
		return resolveCommentTarget(input.commentSlug, db);
	}

	if (input.feedbackSlug) {
		return resolveFeedbackTarget(input.feedbackSlug, db);
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
): Promise<GetLikeListOutput> {
	const pagination = definePagination.cursor(input, likeListCursorCodec);
	const sorting = likeListSorting.from(input);
	const ranging = likeListRanging.from(input);
	const searching = likeListSearching.from(input);

	const where = mergeWhereFragments<Prisma.LikeWhereInput>(
		likeListTargetWhere(input),
		ranging.use(),
		searching.use(),
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

export async function toggleLike(
	input: ToggleLikeInput,
	userId: string,
	db: Database,
): Promise<ToggleLikeOutput> {
	const target = await resolveLikeTarget(input, db);

	const result = await db.$transaction(async (tx) => {
		const existing = await tx.like.findFirst({
			where: existingLikeWhere(target, userId),
			select: { id: true },
		});

		if (existing) {
			await tx.like.delete({
				where: { id: existing.id },
			});

			return {
				source: target.source,
				liked: false,
				likeCount: await countLikesForTarget(target, tx),
			};
		}

		await tx.like.create({
			data: {
				source: target.source,
				userId,
				postId: target.postId,
				commentId: target.commentId,
				feedbackId: target.feedbackId,
			},
		});

		return {
			source: target.source,
			liked: true,
			likeCount: await countLikesForTarget(target, tx),
		};
	});

	if (
		result.liked &&
		result.source === LikeSourceSchema.enum.post &&
		input.postSlug
	) {
		void notifyReactionOnYourPost(db, input.postSlug, userId);
	}

	return result;
}
