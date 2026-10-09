import type { Prisma } from "@bbrc/db";
import { defineSorting } from "../../utils/sorting";

export const adminFactSortableFields = [
	"createdAt",
	"upvoteCount",
	"downvoteCount",
	"impressionCount",
] as const;

export const adminFactListSorting = defineSorting<
	typeof adminFactSortableFields,
	Prisma.FactOrderByWithRelationInput
>(adminFactSortableFields, "createdAt", "desc", {
	orderBy: {
		impressionCount: (direction) => ({
			impressions: { _count: direction },
		}),
	},
});
