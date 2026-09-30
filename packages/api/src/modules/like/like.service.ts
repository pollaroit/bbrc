import type { Database, Prisma } from "@bbrc/db";
import { LikeSourceSchema } from "@bbrc/schemas";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
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
	  }
	| {
			source: typeof LikeSourceSchema.enum.comment;
			postId: null;
			commentId: string;
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

	throw new ORPCError("BAD_REQUEST", {
		message: "Provide postSlug or commentSlug",
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

	return db.like.count({
		where: {
			source: target.source,
			commentId: target.commentId,
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

	return {
		userId,
		source: target.source,
		commentId: target.commentId,
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

	return db.$transaction(async (tx) => {
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
			},
		});

		return {
			source: target.source,
			liked: true,
			likeCount: await countLikesForTarget(target, tx),
		};
	});
}
