import type { Prisma } from "@bbrc/db";
import { defineSorting } from "../../utils/sorting";
import {
	bookListRanging,
	bookListSearching,
	bookRangeableFields,
	bookSearchableFields,
	bookSortableFields,
} from "../book/book.listing";

export const userReadSortableFields = [
	"recordedAt",
	"readEnd",
	"createdAt",
	"updatedAt",
	"title",
	"pages",
	"averageRating",
	"openLibraryRating",
	"publishedIn",
	"feedbacks._count",
	"favorites._count",
	"reads._count",
] as const;

export type UserReadSortableField = (typeof userReadSortableFields)[number];

export const userReadListSorting = defineSorting<
	typeof userReadSortableFields,
	Prisma.ReadOrderByWithRelationInput
>(userReadSortableFields, "recordedAt", "desc", {
	orderBy: {
		recordedAt: (direction) => ({ createdAt: direction }),
		readEnd: (direction) => ({ readEnd: direction }),
		title: (direction) => ({ book: { title: direction } }),
		pages: (direction) => ({ book: { pages: direction } }),
		averageRating: (direction) => ({ book: { averageRating: direction } }),
		openLibraryRating: (direction) => ({
			book: { openLibraryRating: direction },
		}),
		publishedIn: (direction) => ({ book: { publishedIn: direction } }),
		createdAt: (direction) => ({ book: { createdAt: direction } }),
		updatedAt: (direction) => ({ book: { updatedAt: direction } }),
		"feedbacks._count": (direction) => ({
			book: { feedbacks: { _count: direction } },
		}),
		"favorites._count": (direction) => ({
			book: { favorites: { _count: direction } },
		}),
		"reads._count": (direction) => ({
			book: { reads: { _count: direction } },
		}),
	},
});

export {
	bookListRanging as userReadListRanging,
	bookListSearching as userReadListSearching,
	bookRangeableFields as userReadRangeableFields,
	bookSearchableFields as userReadSearchableFields,
	bookSortableFields,
};

export function withStableUserReadOrderBy(
	orderBy: Prisma.ReadOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.ReadOrderByWithRelationInput[] {
	return [orderBy, { bookId: sortDirection }];
}
