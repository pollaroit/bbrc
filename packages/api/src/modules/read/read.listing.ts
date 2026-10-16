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
	"readEndMonth",
	"recordedAt",
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
>(userReadSortableFields, "readEndMonth", "desc", {
	orderBy: {
		recordedAt: (direction) => ({ createdAt: direction }),
		readEndMonth: (direction) => ({
			readEndYear: direction,
			readEndMonth: direction,
		}),
		title: (direction) => ({ book: { title: direction } }),
		pages: (direction) => ({ book: { pages: direction } }),
		averageRating: (direction) => ({ book: { averageRating: direction } }),
		openLibraryRating: (direction) => ({
			book: { openLibraryRating: direction },
		}),
		publishedIn: (direction) => ({ book: { publishedIn: direction } }),
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

function finishMonthOrderBy(
	direction: "asc" | "desc",
): Prisma.ReadOrderByWithRelationInput[] {
	// Undated reads stay at the bottom; dated rows sort by year then month.
	const nulls = "last" as const;
	return [
		{ readEndYear: { sort: direction, nulls } },
		{ readEndMonth: { sort: direction, nulls } },
	];
}

function expandReadOrderBy(
	orderBy: Prisma.ReadOrderByWithRelationInput,
): Prisma.ReadOrderByWithRelationInput[] {
	const keys = Object.keys(orderBy);
	if (
		keys.length === 2 &&
		"readEndYear" in orderBy &&
		"readEndMonth" in orderBy
	) {
		const direction = orderBy.readEndYear as "asc" | "desc";
		return finishMonthOrderBy(direction);
	}
	return [orderBy];
}

export function withStableUserReadOrderBy(
	orderBy: Prisma.ReadOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.ReadOrderByWithRelationInput[] {
	return [...expandReadOrderBy(orderBy), { bookId: sortDirection }];
}
