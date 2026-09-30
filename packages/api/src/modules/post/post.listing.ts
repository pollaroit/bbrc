import type { Prisma } from "@bbrc/db";
import { UserSchema } from "@bbrc/schemas";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const postSortableFields = [
	"createdAt",
	"updatedAt",
	"editedAt",
	"likes._count",
	"comments._count",
] as const;

export const postListSorting = defineSorting<
	typeof postSortableFields,
	Prisma.PostOrderByWithRelationInput
>(postSortableFields, "createdAt", "desc", {
	orderBy: {
		"likes._count": (direction) => ({
			likes: { _count: direction },
		}),
		"comments._count": (direction) => ({
			comments: { _count: direction },
		}),
	},
});

export const postRangeableFields = [
	"createdAt",
	"updatedAt",
	"editedAt",
] as const;

export const postListRanging = defineRanging<
	typeof postRangeableFields,
	Prisma.PostWhereInput
>(postRangeableFields, "createdAt");

export const postSearchableFields = [
	"content",
	"slug",
	"author.username",
] as const;

export const postListSearching = defineSearching<
	typeof postSearchableFields,
	Prisma.PostWhereInput
>(postSearchableFields, {
	where: {
		"author.username": (query) => ({
			author: {
				username: { contains: query, mode: "insensitive" },
			},
		}),
	},
});

export const postListFiltersSchema = z
	.object({
		/** Limit to posts by this member (public username). */
		authorUsername: UserSchema.shape.username,
		/** When true, only posts with an attached book; when false, only without. */
		hasAttachedBook: z.boolean(),
	})
	.partial();

export function postAuthorUsernameWhere(
	username: string,
): Prisma.PostWhereInput {
	return {
		author: { username },
	};
}

export function postAttachedBookWhere(
	hasAttachedBook: boolean,
): Prisma.PostWhereInput {
	return hasAttachedBook
		? { attachedBookId: { not: null } }
		: { attachedBookId: null };
}
