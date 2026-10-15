import type { Prisma } from "@bbrc/db";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const seriesSortableFields = [
	"createdAt",
	"updatedAt",
	"title",
	"books._count",
] as const;

export const seriesListSorting = defineSorting<
	typeof seriesSortableFields,
	Prisma.SeriesOrderByWithRelationInput
>(seriesSortableFields, "title", "asc", {
	orderBy: {
		"books._count": (direction) => ({
			books: { _count: direction },
		}),
	},
});

export const seriesSearchableFields = ["title", "slug"] as const;

export const seriesListSearching = defineSearching<
	typeof seriesSearchableFields,
	Prisma.SeriesWhereInput
>(seriesSearchableFields);

export const seriesRangeableFields = ["createdAt", "updatedAt"] as const;

export const seriesListRanging = defineRanging<
	typeof seriesRangeableFields,
	Prisma.SeriesWhereInput
>(seriesRangeableFields, "updatedAt");

export const seriesListFiltersSchema = z
	.object({
		minBooks: z.number().int().min(0).optional(),
		hasDescription: z.boolean().optional(),
	})
	.partial();
