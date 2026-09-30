import type { Prisma } from "@bbrc/db";
import { PostSchema, UserSchema } from "@bbrc/schemas";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const commentSortableFields = [
	"createdAt",
	"updatedAt",
	"editedAt",
	"likes._count",
] as const;

export const commentListSorting = defineSorting<
	typeof commentSortableFields,
	Prisma.CommentOrderByWithRelationInput
>(commentSortableFields, "createdAt", "asc", {
	orderBy: {
		"likes._count": (direction) => ({
			likes: { _count: direction },
		}),
	},
});

export const commentRangeableFields = [
	"createdAt",
	"updatedAt",
	"editedAt",
] as const;

export const commentListRanging = defineRanging<
	typeof commentRangeableFields,
	Prisma.CommentWhereInput
>(commentRangeableFields, "createdAt");

export const commentSearchableFields = [
	"content",
	"slug",
	"author.username",
] as const;

export const commentListSearching = defineSearching<
	typeof commentSearchableFields,
	Prisma.CommentWhereInput
>(commentSearchableFields, {
	where: {
		"author.username": (query) => ({
			author: {
				username: { contains: query, mode: "insensitive" },
			},
		}),
	},
});

export const commentListFiltersSchema = z
	.object({
		/** Comments on this post (required for list endpoints). */
		postSlug: PostSchema.shape.slug,
		authorUsername: UserSchema.shape.username,
	})
	.partial()
	.required({ postSlug: true });

export function commentPostSlugWhere(
	postSlug: string,
): Prisma.CommentWhereInput {
	return {
		post: { slug: postSlug },
	};
}

export function commentAuthorUsernameWhere(
	username: string,
): Prisma.CommentWhereInput {
	return {
		author: { username },
	};
}
