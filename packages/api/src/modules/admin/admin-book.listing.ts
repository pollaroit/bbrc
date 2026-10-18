import type { Prisma } from "@bbrc/db";
import { BookStatusSchema } from "@bbrc/schemas";
import { bookCountryCodeSchema, isAuthorSlug } from "@bbrc/shared";
import z from "zod";
import { defineSorting } from "../../utils/sorting";
import {
	bookListRanging,
	bookListSearching,
	bookSortableFields,
} from "../book/book.listing";

export const adminBookSortableFields = [
	...bookSortableFields,
	"postAttachments._count",
	"polls._count",
	"pollVotes",
] as const;

export const adminBookListSorting = defineSorting<
	typeof adminBookSortableFields,
	Prisma.BookOrderByWithRelationInput
>(adminBookSortableFields, "createdAt", "desc", {
	orderBy: {
		"feedbacks._count": (direction) => ({
			feedbacks: { _count: direction },
		}),
		"favorites._count": (direction) => ({
			favorites: { _count: direction },
		}),
		"shelves._count": (direction) => ({
			shelfBooks: { _count: direction },
		}),
		"documents._count": (direction) => ({
			documents: { _count: direction },
		}),
		"postAttachments._count": (direction) => ({
			postAttachments: { _count: direction },
		}),
		"polls._count": (direction) => ({
			polls: { _count: direction },
		}),
		"reads._count": (direction) => ({
			reads: { _count: direction },
		}),
	},
});

export {
	bookListRanging as adminBookListRanging,
	bookListSearching as adminBookListSearching,
};

export const adminBookListFiltersSchema = z
	.object({
		statuses: z.array(BookStatusSchema),
		minOpenLibraryRating: z.number().min(0).max(5),
		maxOpenLibraryRating: z.number().min(0).max(5),
		minAverageRating: z.number().min(0).max(5),
		maxAverageRating: z.number().min(0).max(5),
		minPages: z.number().int().min(1),
		maxPages: z.number().int().min(1),
		authors: z.array(
			z.string().refine(isAuthorSlug, { message: "Invalid author slug" }),
		),
		countries: z.array(bookCountryCodeSchema),
		missingClubRating: z.boolean(),
		missingOpenLibraryRating: z.boolean(),
		minFeedbacks: z.number().int().min(0),
		minFavorites: z.number().int().min(0),
		minPostAttachments: z.number().int().min(0),
		minPollOptions: z.number().int().min(0),
		minPollVotes: z.number().int().min(0),
		minReads: z.number().int().min(0),
		maxReads: z.number().int().min(0),
	})
	.partial();
