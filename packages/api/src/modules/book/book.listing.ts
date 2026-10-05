import type { Prisma } from "@bbrc/db";
import { BookStatusSchema } from "@bbrc/schemas";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const bookSortableFields = [
	"createdAt",
	"updatedAt",
	"title",
	"pages",
	"averageRating",
	"openLibraryRating",
	"publishedIn",
	"feedbacks._count",
	"favorites._count",
] as const;

export const bookListSorting = defineSorting<
	typeof bookSortableFields,
	Prisma.BookOrderByWithRelationInput
>(bookSortableFields, "createdAt", "desc", {
	orderBy: {
		"feedbacks._count": (direction) => ({
			feedbacks: { _count: direction },
		}),
		"favorites._count": (direction) => ({
			favorites: { _count: direction },
		}),
	},
});

export const bookRangeableFields = ["createdAt", "updatedAt"] as const;

export const bookListRanging = defineRanging<
	typeof bookRangeableFields,
	Prisma.BookWhereInput
>(bookRangeableFields, "createdAt");

export const bookSearchableFields = ["title", "slug"] as const;

export const bookListSearching = defineSearching<
	typeof bookSearchableFields,
	Prisma.BookWhereInput
>(bookSearchableFields);

export const bookListFiltersSchema = z
	.object({
		minOpenLibraryRating: z.number().min(0).max(5),
		maxOpenLibraryRating: z.number().min(0).max(5),
		minPages: z.number().int().min(1),
		maxPages: z.number().int().min(1),
		statuses: z.array(BookStatusSchema),
		/** Completed club read for the authenticated viewer. */
		viewerRead: z.boolean(),
		/** Favorited by the authenticated viewer. */
		viewerFavorite: z.boolean(),
		/** Reviewed (feedback) by the authenticated viewer. */
		viewerReviewed: z.boolean(),
	})
	.partial();
