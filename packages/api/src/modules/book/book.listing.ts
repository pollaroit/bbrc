import type { Prisma } from "@bbrc/db";
import { BookStatusSchema } from "@bbrc/schemas";
import {
	bookCountryCodeSchema,
	isAuthorSlug,
	isSubjectSlug,
} from "@bbrc/shared";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const bookSortableFields = [
	"createdAt",
	"updatedAt",
	"title",
	"status",
	"pages",
	"averageRating",
	"openLibraryRating",
	"publishedIn",
	"feedbacks._count",
	"favorites._count",
	"reads._count",
	"shelves._count",
	"documents._count",
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
		"reads._count": (direction) => ({
			reads: { _count: direction },
		}),
		"shelves._count": (direction) => ({
			shelfBooks: { _count: direction },
		}),
		"documents._count": (direction) => ({
			documents: { _count: direction },
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
		authors: z.array(
			z.string().refine(isAuthorSlug, { message: "Invalid author slug" }),
		),
		subjects: z.array(
			z.string().refine(isSubjectSlug, { message: "Invalid subject slug" }),
		),
		/** With multiple subjects: match any (OR) vs all (AND). Defaults to any. */
		subjectsMatch: z.enum(["any", "all"]),
		countries: z.array(bookCountryCodeSchema),
		statuses: z.array(BookStatusSchema),
		/** Personal read state for the authenticated viewer. */
		viewerRead: z.enum(["read", "unread"]),
		/** Favorited by the authenticated viewer. */
		viewerFavorite: z.boolean(),
		/** Reviewed (feedback) by the authenticated viewer. */
		viewerReviewed: z.boolean(),
		minReads: z.number().int().min(0),
		maxReads: z.number().int().min(0),
		minFeedbacks: z.number().int().min(0),
		maxFeedbacks: z.number().int().min(0),
		/** Club (member) average rating. Books without reviews never match. */
		minAverageRating: z.number().min(0).max(5),
		maxAverageRating: z.number().min(0).max(5),
		minPublishedIn: z.number().int().min(0),
		maxPublishedIn: z.number().int().min(0),
	})
	.partial();
