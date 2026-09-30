import {
	BookSchema,
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import type { z } from "zod";
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

/** LIST — composed as a concrete ZodObject so oRPC clients get input autocomplete. */
export const GetBookListInputSchema = bookListFiltersSchema
	.extend(CursorPaginationInputSchema.shape)
	.extend(bookListSorting.inputSchema.shape)
	.extend(bookListRanging.inputSchema.shape)
	.extend(bookListSearching.inputSchema.shape)
	.superRefine((value, ctx) => {
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
	});

export const getBookListFields = {
	slug: true,
	title: true,
	authors: true,
	coverId: true,
	openLibraryRating: true,
	pages: true,
	publishedIn: true,
	status: true,
} as const;

export const GetBookListOutputSchema = CursorPaginationOutputSchema(
	BookSchema.pick(getBookListFields),
);

export type GetBookListInput = z.infer<typeof GetBookListInputSchema>;
export type GetBookListOutput = z.infer<typeof GetBookListOutputSchema>;

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
	.required({ slug: true });

export const UpdateBookOutputSchema = BookSchema.pick({
	slug: true,
});

export type TUpdateBookInputSchema = z.infer<typeof UpdateBookInputSchema>;
export type TUpdateBookOutputSchema = z.infer<typeof UpdateBookOutputSchema>;
