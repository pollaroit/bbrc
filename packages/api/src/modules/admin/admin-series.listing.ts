import type { Prisma } from "@bbrc/db";
import type z from "zod";
import { defineSearching } from "../../utils/searching";
import {
	seriesListFiltersSchema,
	seriesListRanging,
	seriesListSorting,
	seriesSortableFields,
} from "../series/series.listing";

export const adminSeriesSortableFields = [...seriesSortableFields] as const;

export const adminSeriesListSorting = seriesListSorting;

export { seriesListRanging as adminSeriesListRanging };

export const adminSeriesSearchableFields = [
	"title",
	"slug",
	"description",
] as const;

export const adminSeriesListSearching = defineSearching<
	typeof adminSeriesSearchableFields,
	Prisma.SeriesWhereInput
>(adminSeriesSearchableFields, {
	where: {
		slug: (query) => ({
			slug: { contains: query, mode: "insensitive" },
		}),
		description: (query) => ({
			description: { contains: query, mode: "insensitive" },
		}),
	},
});

export { seriesListFiltersSchema as adminSeriesListFiltersSchema };

export type AdminSeriesListFilters = z.infer<typeof seriesListFiltersSchema>;
