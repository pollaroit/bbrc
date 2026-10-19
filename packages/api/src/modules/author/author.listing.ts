import { bookCountryCodeSchema } from "@bbrc/shared";
import z from "zod";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const authorSortableFields = [
	"name",
	"bookCount",
	"readerCount",
	"averageRating",
] as const;

/** Input validation only — author list sorts in application code. */
export const authorListSorting = defineSorting<
	typeof authorSortableFields,
	Record<string, never>
>(authorSortableFields, "name", "asc");

export const authorSearchableFields = ["name", "slug"] as const;

export const authorListSearching = defineSearching<
	typeof authorSearchableFields,
	Record<string, never>
>(authorSearchableFields);

export const authorListFiltersSchema = z
	.object({
		minBooks: z.number().int().min(0).optional(),
		maxBooks: z.number().int().min(0).optional(),
		minReads: z.number().int().min(0).optional(),
		maxReads: z.number().int().min(0).optional(),
		minAverageRating: z.number().min(0).max(5).optional(),
		maxAverageRating: z.number().min(0).max(5).optional(),
		countries: z.array(bookCountryCodeSchema).optional(),
	})
	.partial();
