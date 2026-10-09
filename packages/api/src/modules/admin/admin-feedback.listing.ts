import type { Prisma } from "@bbrc/db";
import { BookSchema, UserSchema } from "@bbrc/schemas";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const adminFeedbackSortableFields = [
	"createdAt",
	"updatedAt",
	"rating",
	"likes._count",
	"comments._count",
	"postAttachments._count",
	"book.averageRating",
	"book.pages",
] as const;

export const adminFeedbackListSorting = defineSorting<
	typeof adminFeedbackSortableFields,
	Prisma.FeedbackOrderByWithRelationInput
>(adminFeedbackSortableFields, "createdAt", "desc", {
	orderBy: {
		"likes._count": (direction) => ({ likes: { _count: direction } }),
		"comments._count": (direction) => ({ comments: { _count: direction } }),
		"postAttachments._count": (direction) => ({
			postAttachments: { _count: direction },
		}),
		"book.averageRating": (direction) => ({
			book: { averageRating: direction },
		}),
		"book.pages": (direction) => ({ book: { pages: direction } }),
	},
});

export const adminFeedbackRangeableFields = ["createdAt", "updatedAt"] as const;

export const adminFeedbackListRanging = defineRanging<
	typeof adminFeedbackRangeableFields,
	Prisma.FeedbackWhereInput
>(adminFeedbackRangeableFields, "createdAt");

export const adminFeedbackSearchableFields = [
	"slug",
	"review",
	"bookTitle",
	"authorUsername",
] as const;

export const adminFeedbackListSearching = defineSearching<
	typeof adminFeedbackSearchableFields,
	Prisma.FeedbackWhereInput
>(adminFeedbackSearchableFields, {
	where: {
		bookTitle: (query) => ({
			book: { title: { contains: query, mode: "insensitive" } },
		}),
		authorUsername: (query) => ({
			author: { username: { contains: query, mode: "insensitive" } },
		}),
	},
});

export const adminFeedbackListFiltersSchema = z
	.object({
		minRating: z.number().min(0).max(5),
		maxRating: z.number().min(0).max(5),
		minLikes: z.number().int().min(0),
		minComments: z.number().int().min(0),
		minPostAttachments: z.number().int().min(0),
		minReviewLength: z.number().int().min(1),
		minBookPages: z.number().int().min(1),
		maxBookPages: z.number().int().min(1),
		bookSlugs: z.array(BookSchema.shape.slug),
		authorUsernames: z.array(UserSchema.shape.username),
	})
	.partial();

export type AdminFeedbackListFilters = z.infer<
	typeof adminFeedbackListFiltersSchema
>;
