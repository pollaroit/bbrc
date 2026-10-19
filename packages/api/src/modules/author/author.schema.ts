import { CursorPaginationInputSchema, UserSchema } from "@bbrc/schemas";
import { bookCountryCodeSchema, isAuthorSlug } from "@bbrc/shared";
import zod from "zod";
import {
	authorListFiltersSchema,
	authorListSearching,
	authorListSorting,
} from "./author.listing";

export const GetAuthorPageInputSchema = zod
	.string()
	.refine(isAuthorSlug, { message: "Invalid author slug" });

export const AuthorPageReaderSchema = zod.object({
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: UserSchema.shape.image,
	readCount: zod.number().int().min(1),
});

export const AuthorPageFanSchema = zod.object({
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: UserSchema.shape.image,
	averageRating: zod.number().min(0).max(5),
	ratingCount: zod.number().int().min(1),
});

export const AuthorPageSimilarAuthorSchema = zod.object({
	slug: zod.string(),
	name: zod.string(),
	bookCount: zod.number().int().min(1),
	score: zod.number().min(0),
});

export const GetAuthorPageOutputSchema = zod.object({
	slug: zod.string(),
	name: zod.string(),
	bookCount: zod.number().int().min(0),
	bestReaders: zod.array(AuthorPageReaderSchema),
	biggestFans: zod.array(AuthorPageFanSchema),
	similarAuthors: zod.array(AuthorPageSimilarAuthorSchema),
});

export type GetAuthorPageOutput = zod.infer<typeof GetAuthorPageOutputSchema>;

export const AuthorListItemSchema = zod.object({
	slug: zod.string(),
	name: zod.string(),
	bookCount: zod.number().int().min(0),
	readerCount: zod.number().int().min(0),
	reviewCount: zod.number().int().min(0),
	averageRating: zod.number().min(0).max(5).nullable(),
	countryAlpha2: bookCountryCodeSchema.nullable(),
});

export type AuthorListItem = zod.infer<typeof AuthorListItemSchema>;

export type AuthorListFilters = zod.infer<typeof authorListFiltersSchema>;

export const authorListQueryInputShape = authorListFiltersSchema
	.extend(authorListSorting.inputSchema.shape)
	.extend(authorListSearching.inputSchema.shape);

function refineAuthorListQueryInput(
	value: zod.infer<typeof authorListQueryInputShape>,
	ctx: zod.RefinementCtx,
) {
	if (
		value.maxBooks != null &&
		value.minBooks != null &&
		value.maxBooks < value.minBooks
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum books must be greater than or equal to minimum",
			path: ["maxBooks"],
		});
	}

	if (
		value.maxReads != null &&
		value.minReads != null &&
		value.maxReads < value.minReads
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum reads must be greater than or equal to minimum",
			path: ["maxReads"],
		});
	}

	if (
		value.maxAverageRating != null &&
		value.minAverageRating != null &&
		value.maxAverageRating < value.minAverageRating
	) {
		ctx.addIssue({
			code: "custom",
			message:
				"Maximum average rating must be greater than or equal to minimum",
			path: ["maxAverageRating"],
		});
	}
}

export const GetAuthorListInputSchema = authorListQueryInputShape
	.extend(CursorPaginationInputSchema.shape)
	.superRefine(refineAuthorListQueryInput);

export const GetAuthorListOutputSchema = zod.object({
	items: zod.array(AuthorListItemSchema),
	metadata: zod.object({
		limit: zod.number().int().min(1),
		hasNextPage: zod.boolean(),
		hasPreviousPage: zod.boolean(),
		nextCursor: zod.string().nullable(),
		total: zod.number().int().min(0).optional(),
	}),
});

export type GetAuthorListInput = zod.infer<typeof GetAuthorListInputSchema>;
export type GetAuthorListOutput = zod.infer<typeof GetAuthorListOutputSchema>;

export const AuthorListCountryFacetSchema = zod.object({
	alpha2: bookCountryCodeSchema,
	name: zod.string(),
	authorCount: zod.number().int().min(0),
});

export const GetAuthorListCountryFacetsInputSchema = authorListQueryInputShape
	.extend({
		pinnedCountryCodes: zod.array(bookCountryCodeSchema).optional(),
	})
	.superRefine(refineAuthorListQueryInput);

export const GetAuthorListCountryFacetsOutputSchema = zod.object({
	countries: zod.array(AuthorListCountryFacetSchema),
});

export type GetAuthorListCountryFacetsInput = zod.infer<
	typeof GetAuthorListCountryFacetsInputSchema
>;
export type GetAuthorListCountryFacetsOutput = zod.infer<
	typeof GetAuthorListCountryFacetsOutputSchema
>;
