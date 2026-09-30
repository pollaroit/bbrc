import type { Prisma } from "@bbrc/db";
import { CommentSchema, LikeSourceSchema, PostSchema } from "@bbrc/schemas";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const likeSortableFields = ["createdAt", "user.username"] as const;

export const likeListSorting = defineSorting<
	typeof likeSortableFields,
	Prisma.LikeOrderByWithRelationInput
>(likeSortableFields, "createdAt", "desc", {
	orderBy: {
		"user.username": (direction) => ({
			user: { username: direction },
		}),
	},
});

export const likeRangeableFields = ["createdAt"] as const;

export const likeListRanging = defineRanging<
	typeof likeRangeableFields,
	Prisma.LikeWhereInput
>(likeRangeableFields, "createdAt");

export const likeSearchableFields = ["user.username", "user.name"] as const;

export const likeListSearching = defineSearching<
	typeof likeSearchableFields,
	Prisma.LikeWhereInput
>(likeSearchableFields, {
	where: {
		"user.username": (query) => ({
			user: {
				username: { contains: query, mode: "insensitive" },
			},
		}),
		"user.name": (query) => ({
			user: {
				name: { contains: query, mode: "insensitive" },
			},
		}),
	},
});

/** Target of a like list (exactly one must be set — validated on list input). */
export const likeListFiltersSchema = z.object({
	postSlug: PostSchema.shape.slug.optional(),
	commentSlug: CommentSchema.shape.slug.optional(),
});

export function likeOnPostWhere(postSlug: string): Prisma.LikeWhereInput {
	return {
		source: LikeSourceSchema.enum.post,
		post: { slug: postSlug },
	};
}

export function likeOnCommentWhere(commentSlug: string): Prisma.LikeWhereInput {
	return {
		source: LikeSourceSchema.enum.comment,
		comment: { slug: commentSlug },
	};
}

export function likeListTargetWhere(input: {
	postSlug?: string;
	commentSlug?: string;
}): Prisma.LikeWhereInput {
	if (input.postSlug) {
		return likeOnPostWhere(input.postSlug);
	}

	if (input.commentSlug) {
		return likeOnCommentWhere(input.commentSlug);
	}

	throw new Error("likeListTargetWhere requires postSlug or commentSlug");
}
