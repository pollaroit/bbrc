import {
	BookSchema,
	CursorPaginationInputSchema,
	CursorPaginationMetadataSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import { bookCountriesSchema, isAuthorSlug } from "@bbrc/shared";
import { z } from "zod";
import {
	BookSeriesSummarySchema,
	CreateSeriesInputSchema,
	SeriesPositionSchema,
} from "../series/series.schema";
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
		value.maxFeedbacks != null &&
		value.minFeedbacks != null &&
		value.maxFeedbacks < value.minFeedbacks
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum reviews must be greater than or equal to minimum",
			path: ["maxFeedbacks"],
		});
	}

	if (
		value.maxAverageRating != null &&
		value.minAverageRating != null &&
		value.maxAverageRating < value.minAverageRating
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum club rating must be greater than or equal to minimum",
			path: ["maxAverageRating"],
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
	/** How many times the book page was opened (never counts the owner or bots). */
	viewCount: z.number().int().min(0),
	/** Members reading it right now (visible members only). */
	readingNowCount: z.number().int().min(0),
	/** Members who have it on their wishlist. */
	wishlistCount: z.number().int().min(0),
	/** Different people who opened the book page. */
	viewerCount: z.number().int().min(0),
	/** When it joined the library, and when it last changed (for sorting by date). */
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
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

/** Authors of a work: ids from the author chips (preferred), or plain names (each resolved to an author). */
const bookAuthorIdsSchema = z.array(z.string().uuid()).min(1).max(12);

/** ADD */
export const AddBookInputSchema = BookSchema.pick({
	title: true,
	coverId: true,
	openLibraryRating: true,
	excerpt: true,
	pages: true,
	publishedIn: true,
	olid: true,
	subjectPeople: true,
	subjectTimes: true,
	subjects: true,
})
	.extend({
		/** Author records, in order (from the chips). Wins over `authors`. */
		authorIds: bookAuthorIdsSchema.optional(),
		/** Author names, resolved to existing authors (by name, alias or likely spelling) or created. */
		authors: BookSchema.shape.authors.optional(),
		acceptanceNotes: z
			.string()
			.trim()
			.max(200, "Acceptance notes must be at most 200 characters long")
			.optional(),
		readAfterBookSlugs: z.array(BookSchema.shape.slug).max(20).optional(),
		countries: bookCountriesSchema.optional(),
		seriesSlug: BookSchema.shape.slug.optional(),
		newSeries: CreateSeriesInputSchema.optional(),
		/** Place in the series; left out means the end. */
		seriesPosition: SeriesPositionSchema.optional(),
		/** When the place is a taken whole number, move the later books down by one. */
		shiftLater: z.boolean().optional(),
		/** An uploaded cover (see the cover upload); wins over the Open Library one. */
		customCoverUrl: z.string().url().max(2048).optional(),
		/** Tell every member about the new book (default); false only tells the people who asked for it. */
		notifyMembers: z.boolean().optional(),
	})
	.superRefine((value, ctx) => {
		if (!value.authorIds?.length && !value.authors?.length) {
			ctx.addIssue({
				code: "custom",
				message: "Add at least one author.",
				path: ["authorIds"],
			});
		}
		if (value.seriesSlug && value.newSeries) {
			ctx.addIssue({
				code: "custom",
				message: "Choose either an existing series or a new series, not both.",
				path: ["seriesSlug"],
			});
		}
	});

export const AddBookOutputSchema = BookSchema.pick({
	slug: true,
}).extend({
	seriesSlug: z.string().optional(),
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
	subjects: true,
	subjectPeople: true,
	subjectTimes: true,
})
	.partial()
	.required({ slug: true })
	.extend({
		/** Author records, in order (from the chips). Wins over `authors`. */
		authorIds: bookAuthorIdsSchema.optional(),
		readAfterBookSlugs: z.array(BookSchema.shape.slug).max(20).optional(),
		countries: bookCountriesSchema.optional(),
		/** A newly uploaded cover; null removes the uploaded cover. */
		customCoverUrl: z.string().url().max(2048).nullish(),
		/** Left out keeps the series as is; null takes the book out of its series. */
		series: z
			.object({
				seriesSlug: BookSchema.shape.slug.optional(),
				newSeries: CreateSeriesInputSchema.optional(),
				position: SeriesPositionSchema.optional(),
				shiftLater: z.boolean().optional(),
			})
			.refine(
				(value) => Boolean(value.seriesSlug) !== Boolean(value.newSeries),
				{
					message: "Choose an existing series or a new one.",
				},
			)
			.nullish(),
	});

export const UpdateBookOutputSchema = BookSchema.pick({
	slug: true,
});

export type TUpdateBookInputSchema = z.infer<typeof UpdateBookInputSchema>;
export type TUpdateBookOutputSchema = z.infer<typeof UpdateBookOutputSchema>;

/** RANDOM — one book picked at random from those matching the list filters. */
export const GetRandomBookInputSchema = bookListFiltersSchema
	.extend(bookListSorting.inputSchema.shape)
	.extend(bookListRanging.inputSchema.shape)
	.extend(bookListSearching.inputSchema.shape)
	.superRefine(refineBookListQueryInput);

export const GetRandomBookOutputSchema = z.object({
	slug: z.string(),
	title: z.string(),
	/** Books that matched the filters, so the UI can say "1 of 12". */
	matched: z.number().int().min(1),
});

export type GetRandomBookInput = z.infer<typeof GetRandomBookInputSchema>;
export type GetRandomBookOutput = z.infer<typeof GetRandomBookOutputSchema>;
