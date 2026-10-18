import {
	BookSchema,
	CursorPaginationInputSchema,
	CursorPaginationMetadataSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import { bookCountriesSchema, isAuthorSlug } from "@bbrc/shared";
import { z } from "zod";
import { BookSeriesSummarySchema } from "../series/series.schema";
import {
	bookListFiltersSchema,
	bookListRanging,
	bookListSearching,
	bookListSorting,
} from "./book.listing";

export {
	bookListRanging,
	bookListSearching,
	bookListSorting,
	bookRangeableFields,
	bookSearchableFields,
	bookSortableFields,
} from "./book.listing";

export const bookListQueryInputShape = bookListFiltersSchema
	.extend(bookListSorting.inputSchema.shape)
	.extend(bookListRanging.inputSchema.shape)
	.extend(bookListSearching.inputSchema.shape);

export function refineBookListQueryInput(
	value: z.infer<typeof bookListQueryInputShape>,
	ctx: z.RefinementCtx,
) {
	refineRangingBounds(
		{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
		ctx,
	);

	if (
		value.maxOpenLibraryRating != null &&
		value.minOpenLibraryRating != null &&
		value.maxOpenLibraryRating < value.minOpenLibraryRating
	) {
		ctx.addIssue({
			code: "custom",
			message:
				"Maximum Open Library rating must be greater than or equal to minimum",
			path: ["maxOpenLibraryRating"],
		});
	}

	if (
		value.maxPages != null &&
		value.minPages != null &&
		value.maxPages < value.minPages
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum pages must be greater than or equal to minimum",
			path: ["maxPages"],
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
		value.maxPublishedIn != null &&
		value.minPublishedIn != null &&
		value.maxPublishedIn < value.minPublishedIn
	) {
		ctx.addIssue({
			code: "custom",
			message:
				"Maximum publish year must be greater than or equal to minimum publish year",
			path: ["maxPublishedIn"],
		});
	}
}

/** Filters, sort, range, and search — no pagination cursor. */
export const BookListQueryInputSchema = bookListQueryInputShape.superRefine(
	refineBookListQueryInput,
);

/** LIST — composed as a concrete ZodObject so oRPC clients get input autocomplete. */
export const GetBookListInputSchema = bookListQueryInputShape
	.extend(CursorPaginationInputSchema.shape)
	.superRefine(refineBookListQueryInput);

export const getBookListFields = {
	slug: true,
	title: true,
	authors: true,
	coverId: true,
	openLibraryRating: true,
	averageRating: true,
	pages: true,
	publishedIn: true,
	status: true,
} as const;

export const bookRequestedByFields = {
	username: true,
	name: true,
} as const;

export const BookRequestedBySchema = z.object({
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
});

export type BookRequestedBy = z.infer<typeof BookRequestedBySchema>;

export const getBookPollSelect = {
	id: true,
	...getBookListFields,
	requestedBy: {
		select: bookRequestedByFields,
	},
} as const;

export const BookWithRequestedBySchema = BookSchema.pick(
	getBookListFields,
).extend({
	requestedBy: BookRequestedBySchema.nullable(),
});

export const BookListItemSchema = BookSchema.pick(getBookListFields).extend({
	approvedDocumentCount: z.number().int().min(0),
	readCount: z.number().int().min(0),
	feedbackCount: z.number().int().min(0),
	shelfCount: z.number().int().min(0),
	favoriteCount: z.number().int().min(0),
	/** Sitting slug when status is reading or completed and a club sitting selected this book. */
	clubSittingSlug: z.string().nullable(),
	series: BookSeriesSummarySchema.nullable(),
});

export const BookListMetadataSchema = CursorPaginationMetadataSchema.extend({
	total: z.number().int().min(0).optional(),
});

export const GetBookListOutputSchema = z.object({
	items: z.array(BookListItemSchema),
	metadata: BookListMetadataSchema,
});

export type GetBookListInput = z.infer<typeof GetBookListInputSchema>;
export type GetBookListOutput = z.infer<typeof GetBookListOutputSchema>;

export const BookListAuthorFacetSchema = z.object({
	slug: z.string(),
	name: z.string().min(1),
	bookCount: z.number().int().min(0),
});

export const GetBookListAuthorFacetsInputSchema = bookListQueryInputShape
	.extend({
		pinnedAuthorSlugs: z
			.array(
				z.string().refine(isAuthorSlug, { message: "Invalid author slug" }),
			)
			.optional(),
	})
	.superRefine(refineBookListQueryInput);

export const GetBookListAuthorFacetsOutputSchema = z.object({
	authors: z.array(BookListAuthorFacetSchema),
});

export type GetBookListAuthorFacetsInput = z.infer<
	typeof GetBookListAuthorFacetsInputSchema
>;
export type GetBookListAuthorFacetsOutput = z.infer<
	typeof GetBookListAuthorFacetsOutputSchema
>;

export const BookListCountryFacetSchema = z.object({
	alpha2: z.string(),
	name: z.string().min(1),
	bookCount: z.number().int().min(0),
});

export const GetBookListCountryFacetsInputSchema = bookListQueryInputShape
	.extend({
		pinnedCountryCodes: z.array(bookCountriesSchema.element).optional(),
	})
	.superRefine(refineBookListQueryInput);

export const GetBookListCountryFacetsOutputSchema = z.object({
	countries: z.array(BookListCountryFacetSchema),
});

export type GetBookListCountryFacetsInput = z.infer<
	typeof GetBookListCountryFacetsInputSchema
>;
export type GetBookListCountryFacetsOutput = z.infer<
	typeof GetBookListCountryFacetsOutputSchema
>;

/** @deprecated Use `GetBookListInput` */
export type TGetBookListInputSchema = GetBookListInput;
/** @deprecated Use `GetBookListOutput` */
export type TGetBookListOutputSchema = GetBookListOutput;

/** ADD */
export const AddBookInputSchema = BookSchema.pick({
	title: true,
	authors: true,
	coverId: true,
	openLibraryRating: true,
	excerpt: true,
	pages: true,
	publishedIn: true,
	olid: true,
	subjectPeople: true,
	subjectTimes: true,
	subjects: true,
}).extend({
	acceptanceNotes: z
		.string()
		.trim()
		.max(200, "Acceptance notes must be at most 200 characters long")
		.optional(),
	readAfterBookSlugs: z.array(BookSchema.shape.slug).max(20).optional(),
	countries: bookCountriesSchema.optional(),
});

export const AddBookOutputSchema = BookSchema.pick({
	slug: true,
});

export type TAddBookInputSchema = z.infer<typeof AddBookInputSchema>;
export type TAddBookOutputSchema = z.infer<typeof AddBookOutputSchema>;

/** GET BY SLUG */
export const GetBookBySlugOutputSchema = BookSchema.omit({
	id: true,
	updatedAt: true,
	requestedById: true,
	approvedById: true,
}).extend({
	requestedBy: BookRequestedBySchema.nullable(),
	readAfterBooks: z.array(
		z.object({
			slug: BookSchema.shape.slug,
			title: BookSchema.shape.title,
			authors: BookSchema.shape.authors,
			coverId: BookSchema.shape.coverId,
		}),
	),
	series: BookSeriesSummarySchema.nullable(),
});

export type TGetBookBySlugOutputSchema = z.infer<
	typeof GetBookBySlugOutputSchema
>;

/** UPDATE */
export const UpdateBookInputSchema = BookSchema.pick({
	title: true,
	authors: true,
	coverId: true,
	openLibraryRating: true,
	excerpt: true,
	pages: true,
	publishedIn: true,
	averageRating: true,
	status: true,
	slug: true,
})
	.partial()
	.required({ slug: true })
	.extend({
		readAfterBookSlugs: z.array(BookSchema.shape.slug).max(20).optional(),
		countries: bookCountriesSchema.optional(),
	});

export const UpdateBookOutputSchema = BookSchema.pick({
	slug: true,
});

export type TUpdateBookInputSchema = z.infer<typeof UpdateBookInputSchema>;
export type TUpdateBookOutputSchema = z.infer<typeof UpdateBookOutputSchema>;
