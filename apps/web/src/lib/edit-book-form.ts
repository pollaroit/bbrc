import {
	type TGetBookBySlugOutputSchema,
	UpdateBookInputSchema,
} from "@bbrc/api/modules/book/book.schema";
import { BookSchema, BookStatusSchema } from "@bbrc/schemas";
import z from "zod";
import { authorsToText, parseAuthorsText } from "@/lib/add-book-form";

export const EditBookFormSchema = z.object({
	title: BookSchema.shape.title,
	authorsText: z.string().min(1, "At least one author is required"),
	coverId: z.number().int().nullable(),
	openLibraryRating: z.number().min(0).max(5).nullable(),
	excerpt: z.string().max(4000).nullable(),
	pages: BookSchema.shape.pages,
	publishedIn: BookSchema.shape.publishedIn,
	averageRating: z.number().min(0).max(5).nullable(),
	status: BookStatusSchema,
});

export type EditBookFormValues = z.infer<typeof EditBookFormSchema>;

export function bookToEditFormValues(
	book: TGetBookBySlugOutputSchema,
): EditBookFormValues {
	return {
		title: book.title,
		authorsText: authorsToText(book.authors),
		coverId: book.coverId ?? null,
		openLibraryRating: book.openLibraryRating ?? null,
		excerpt: book.excerpt ?? null,
		pages: book.pages,
		publishedIn: book.publishedIn,
		averageRating: book.averageRating ?? null,
		status: book.status,
	};
}

export function toUpdateBookInput(slug: string, values: EditBookFormValues) {
	return UpdateBookInputSchema.parse({
		slug,
		title: values.title,
		authors: parseAuthorsText(values.authorsText),
		coverId: values.coverId ?? undefined,
		openLibraryRating: values.openLibraryRating ?? undefined,
		excerpt: values.excerpt ?? undefined,
		pages: values.pages,
		publishedIn: values.publishedIn,
		averageRating: values.averageRating ?? undefined,
		status: values.status,
	});
}
