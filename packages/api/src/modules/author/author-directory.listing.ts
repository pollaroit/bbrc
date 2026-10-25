import { bookCountryCodeSchema } from "@bbrc/shared";
import z from "zod";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const authorDirectorySortFields = [
	"name",
	"bookCount",
	"readerCount",
	"reviewCount",
	"averageRating",
	"followerCount",
	"createdAt",
	"birthYear",
] as const;

/** Input validation only: the directory sorts in application code (the numbers are computed). */
export const authorDirectorySorting = defineSorting<
	typeof authorDirectorySortFields,
	Record<string, never>
>(authorDirectorySortFields, "bookCount", "desc");

export const authorDirectorySearching = defineSearching<
	readonly ["name", "sortName", "slug", "alias"],
	Record<string, unknown>
>(["name", "sortName", "slug", "alias"], {
	where: {
		alias: (query) => ({
			aliases: { some: { alias: { contains: query, mode: "insensitive" } } },
		}),
	},
});

export const authorDirectoryFiltersSchema = z
	.object({
		minBooks: z.number().int().min(0).optional(),
		maxBooks: z.number().int().min(0).optional(),
		/** Distinct members who read at least one book by the author. */
		minReaders: z.number().int().min(0).optional(),
		maxReaders: z.number().int().min(0).optional(),
		minReviews: z.number().int().min(0).optional(),
		maxReviews: z.number().int().min(0).optional(),
		minAverageRating: z.number().min(0).max(5).optional(),
		maxAverageRating: z.number().min(0).max(5).optional(),
		/** Nationality codes (ISO 3166-1 alpha-2); an author matches when they have any of them. */
		countries: z.array(bookCountryCodeSchema).optional(),
		genders: z
			.array(z.enum(["female", "male", "non_binary", "other", "unknown"]))
			.optional(),
		hasPhoto: z.boolean().optional(),
		/** Admins only (ignored for everyone else). */
		statuses: z.array(z.enum(["verified", "auto", "needs_review"])).optional(),
		/** Admins only: also list authors that have no books. */
		includeEmpty: z.boolean().optional(),
	})
	.partial();
