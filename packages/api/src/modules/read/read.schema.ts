import { BookSchema, UserSchema } from "@bbrc/schemas";
import {
	CursorPaginationInputSchema,
	CursorPaginationMetadataSchema,
} from "@bbrc/schemas/listing/pagination";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import { ReadFinishedMonthInputSchema } from "@bbrc/schemas/read-finished-month";
import {
	isFeedbackRatingStep,
	openLibraryEditionKeyToOlid,
} from "@bbrc/shared";
import { z } from "zod";
import { bookListFiltersSchema } from "../book/book.listing";
import {
	userReadListRanging,
	userReadListSearching,
	userReadListSorting,
} from "./read.listing";

export const ReadEditionIdSchema = z.string().transform((value, ctx) => {
	const olid = openLibraryEditionKeyToOlid(value);
	if (!olid) {
		ctx.addIssue({
			code: "custom",
			message: "Invalid Open Library edition ID",
		});
		return z.NEVER;
	}
	return olid;
});

export const ReadEditionIdFieldSchema = ReadEditionIdSchema.nullable();

const OptionalFeedbackOnSetReadSchema = z.object({
	feedbackRating: z
		.number()
		.refine(isFeedbackRatingStep, {
			message: "Rating must be in half-star steps from 0 to 5",
		})
		.optional(),
	feedbackReview: z.string().max(500).optional(),
});

export const GetBookReadStateInputSchema = z.object({
	bookSlug: BookSchema.shape.slug,
});

export const SetReadInputSchema = z
	.object({
		bookSlug: BookSchema.shape.slug,
		/** Edition OLID or `/books/OL…M` key; pass `null` to clear. */
		editionId: ReadEditionIdFieldSchema.optional(),
		/** One of our own (member-added) editions; pass `null` to clear. */
		bookEditionId: z.string().uuid().nullable().optional(),
	})
	.merge(OptionalFeedbackOnSetReadSchema)
	.and(ReadFinishedMonthInputSchema);

export type SetReadInput = z.infer<typeof SetReadInputSchema>;

export const RemoveReadInputSchema = z.object({
	bookSlug: BookSchema.shape.slug,
});

export type RemoveReadInput = z.infer<typeof RemoveReadInputSchema>;

export const RemoveReadOutputSchema = z.object({
	removed: z.literal(true),
});

export type RemoveReadOutput = z.infer<typeof RemoveReadOutputSchema>;

export const GetBookReadStateOutputSchema = z.object({
	hasRead: z.boolean(),
	/** Whether the viewer already left club feedback on this book. */
	hasFeedback: z.boolean(),
	readEndYear: z.number().int().nullable(),
	readEndMonth: z.number().int().nullable(),
	editionId: ReadEditionIdFieldSchema,
});

export const GetReadPreferencesOutputSchema = z.object({
	/** New reads start with the current month and year filled in. */
	defaultToCurrentDate: z.boolean(),
});

export const SetReadPreferencesInputSchema = z.object({
	defaultToCurrentDate: z.boolean(),
});

export type GetReadPreferencesOutput = z.infer<
	typeof GetReadPreferencesOutputSchema
>;
export type SetReadPreferencesInput = z.infer<
	typeof SetReadPreferencesInputSchema
>;

export type GetBookReadStateOutput = z.infer<
	typeof GetBookReadStateOutputSchema
>;

export const OpenLibraryEditionLanguageSchema = z.enum([
	"eng",
	"tur",
	"aze",
	"rus",
	"any",
]);

export const SearchWorkEditionsInputSchema = z.object({
	bookSlug: BookSchema.shape.slug,
	query: z.string().max(200).optional(),
	language: OpenLibraryEditionLanguageSchema.optional(),
	page: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(24).optional(),
});

export type SearchWorkEditionsInput = z.infer<
	typeof SearchWorkEditionsInputSchema
>;

export const WorkEditionSummarySchema = z.object({
	editionId: z.string(),
	title: z.string(),
	pages: z.number().int().positive().nullable(),
	publishDate: z.string().nullable(),
	coverId: z.number().int().nullable(),
	languageKeys: z.array(z.string()),
});

export const WorkEditionListItemSchema = WorkEditionSummarySchema.extend({
	languages: z.array(z.string()),
	publishers: z.array(z.string()),
	publishPlaces: z.array(z.string()),
	physicalFormat: z.string().nullable(),
	isbn13: z.string().nullable(),
	openLibraryUrl: z.string().url(),
	isbnUrl: z.string().url().nullable(),
});

export const SearchWorkEditionsOutputSchema = z.object({
	items: z.array(WorkEditionListItemSchema),
	total: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	limit: z.number().int().positive(),
	totalPages: z.number().int().nonnegative(),
	hasNextPage: z.boolean(),
});

export type SearchWorkEditionsOutput = z.infer<
	typeof SearchWorkEditionsOutputSchema
>;

export const ListBookReadsInputSchema = z.object({
	bookSlug: BookSchema.shape.slug,
	limit: z.number().int().min(1).max(100).optional(),
});

export type ListBookReadsInput = z.infer<typeof ListBookReadsInputSchema>;

export const BookReadListItemSchema = z.object({
	readEndYear: z.number().int().nullable(),
	readEndMonth: z.number().int().nullable(),
	editionId: ReadEditionIdFieldSchema,
	recordedAt: z.coerce.date(),
	user: z.object({
		username: z.string(),
		name: z.string(),
		image: z.string().nullable(),
	}),
});

export const ListBookReadsOutputSchema = z.object({
	total: z.number().int().nonnegative(),
	items: z.array(BookReadListItemSchema),
});

export type ListBookReadsOutput = z.infer<typeof ListBookReadsOutputSchema>;

const UserReadBookSummarySchema = z.object({
	slug: BookSchema.shape.slug,
	title: z.string(),
	authors: z.array(z.string()),
	coverId: z.number().int().nullable().optional(),
	status: BookSchema.shape.status,
	pages: z.number().int(),
	publishedIn: z.number().int(),
	readCount: z.number().int().min(0),
});

export const UserReadListItemSchema = z.object({
	readEndYear: z.number().int().nullable(),
	readEndMonth: z.number().int().nullable(),
	editionId: ReadEditionIdFieldSchema,
	recordedAt: z.coerce.date(),
	/** The member's own rating for this book, when they left feedback. */
	rating: z.number().nullable(),
	book: UserReadBookSummarySchema,
});

const userReadListQueryInputShape = bookListFiltersSchema
	.omit({
		viewerRead: true,
		viewerFavorite: true,
		viewerReviewed: true,
		viewerWishlist: true,
		viewerReading: true,
	})
	.extend(userReadListSorting.inputSchema.shape)
	.extend(userReadListRanging.inputSchema.shape)
	.extend(userReadListSearching.inputSchema.shape);

function refineUserReadListQueryInput(
	value: z.infer<typeof userReadListQueryInputShape>,
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
}

export const ListUserReadsQueryInputSchema =
	userReadListQueryInputShape.superRefine(refineUserReadListQueryInput);

export const ListUserReadsInputSchema = userReadListQueryInputShape
	.extend({
		username: UserSchema.shape.username,
		mutualOnly: z.boolean().optional(),
	})
	.extend(CursorPaginationInputSchema.shape)
	.superRefine(refineUserReadListQueryInput);

export {
	userReadListRanging,
	userReadListSearching,
	userReadListSorting,
	userReadRangeableFields,
	userReadSearchableFields,
	userReadSortableFields,
} from "./read.listing";

export const ListUserReadsMetadataSchema =
	CursorPaginationMetadataSchema.extend({
		total: z.number().int().min(0).optional(),
	});

export const ListUserReadsOutputSchema = z.object({
	items: z.array(UserReadListItemSchema),
	metadata: ListUserReadsMetadataSchema,
});

export type ListUserReadsInput = z.infer<typeof ListUserReadsInputSchema>;
export type ListUserReadsOutput = z.infer<typeof ListUserReadsOutputSchema>;

export const userReadListSelect = {
	readEndYear: true,
	readEndMonth: true,
	editionId: true,
	createdAt: true,
	book: {
		select: {
			id: true,
			slug: true,
			title: true,
			authors: true,
			coverId: true,
			status: true,
			pages: true,
			publishedIn: true,
			_count: {
				select: { reads: true },
			},
		},
	},
} as const;

export const readBookSlugSelect = {
	slug: true,
} as const;
