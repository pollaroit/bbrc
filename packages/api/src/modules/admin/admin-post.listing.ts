import type { Prisma } from "@bbrc/db";
import { UserSchema } from "@bbrc/schemas";
import z from "zod";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";
import {
	postAttachedBookWhere,
	postListFiltersSchema,
	postListRanging,
	postSortableFields,
} from "../post/post.listing";

export const postAttachmentKindValues = [
	"book",
	"shelf",
	"sitting",
	"user",
	"feedback",
	"post",
	"comment",
] as const;

export const adminPostSortableFields = [...postSortableFields] as const;

export const adminPostListSorting = defineSorting<
	typeof adminPostSortableFields,
	Prisma.PostOrderByWithRelationInput
>(adminPostSortableFields, "createdAt", "desc", {
	orderBy: {
		"likes._count": (direction) => ({
			likes: { _count: direction },
		}),
		"comments._count": (direction) => ({
			comments: { _count: direction },
		}),
	},
});

export { postListRanging as adminPostListRanging };

export const adminPostSearchableFields = [
	"content",
	"slug",
	"author.username",
] as const;

export const adminPostListSearching = defineSearching<
	typeof adminPostSearchableFields,
	Prisma.PostWhereInput
>(adminPostSearchableFields, {
	where: {
		"author.username": (query) => ({
			author: { username: { contains: query, mode: "insensitive" } },
		}),
	},
});

export const adminPostListFiltersSchema = postListFiltersSchema
	.omit({ feedSort: true, feedRange: true })
	.extend({
		authorUsernames: z.array(UserSchema.shape.username),
		hasImage: z.boolean(),
		hasAttachment: z.boolean(),
		attachmentKinds: z.array(z.enum(postAttachmentKindValues)),
		minLikes: z.number().int().min(0),
		minComments: z.number().int().min(0),
		wasEdited: z.boolean(),
		minContentLength: z.number().int().min(1),
	})
	.partial();

export type AdminPostListFilters = z.infer<typeof adminPostListFiltersSchema>;

export { postAttachedBookWhere };
