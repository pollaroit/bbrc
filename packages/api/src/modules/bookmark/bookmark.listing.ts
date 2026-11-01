import type { Prisma } from "@bbrc/db";
import { BOOKMARK_LIST_TYPES, BOOKMARK_SORT_FIELDS } from "@bbrc/shared";
import z from "zod";
import { defineSorting } from "../../utils/sorting";

export const bookmarkSortableFields = [...BOOKMARK_SORT_FIELDS] as const;

export const bookmarkListSorting = defineSorting<
	typeof bookmarkSortableFields,
	Prisma.BookmarkOrderByWithRelationInput
>(bookmarkSortableFields, "bookmarkedAt", "desc", {
	orderBy: {
		bookmarkedAt: (direction) => ({ createdAt: direction }),
		resourceCreatedAt: (direction) => ({ resourceCreatedAt: direction }),
	},
});

export const bookmarkListFiltersSchema = z.object({
	username: z.string().min(1),
	type: z.enum(BOOKMARK_LIST_TYPES).default("all"),
	search: z.string().trim().max(200).optional(),
});
