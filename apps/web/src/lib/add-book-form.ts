import { AddBookInputSchema } from "@bbrc/api/modules/book/book.schema";
import z from "zod";

const stringArrayField = z.array(z.string());

export const AddNewBookFormSchema = z.object({
	title: AddBookInputSchema.shape.title,
	authorsText: z.string().min(1, "At least one author is required"),
	coverId: z.number().int().nullable(),
	openLibraryRating: z.number().min(0).max(5).nullable(),
	excerpt: z.string().max(4000).nullable(),
	pages: AddBookInputSchema.shape.pages,
	publishedIn: AddBookInputSchema.shape.publishedIn,
	olid: AddBookInputSchema.shape.olid,
	subjectPeople: stringArrayField,
	subjectTimes: stringArrayField,
	subjects: stringArrayField,
	readAfterBookSlugs: z.array(z.string()).max(20),
});

export type AddNewBookFormValues = z.infer<typeof AddNewBookFormSchema>;

export function parseAuthorsText(authorsText: string): string[] {
	return authorsText
		.split(",")
		.map((author) => author.trim())
		.filter(Boolean);
}

export function toAddBookInput(values: AddNewBookFormValues) {
	const authors = parseAuthorsText(values.authorsText);

	return AddBookInputSchema.parse({
		title: values.title,
		authors,
		coverId: values.coverId ?? undefined,
		openLibraryRating: values.openLibraryRating ?? undefined,
		excerpt: values.excerpt ?? undefined,
		pages: values.pages,
		publishedIn: values.publishedIn,
		olid: values.olid,
		subjectPeople: values.subjectPeople,
		subjectTimes: values.subjectTimes,
		subjects: values.subjects,
		readAfterBookSlugs:
			values.readAfterBookSlugs.length > 0
				? values.readAfterBookSlugs
				: undefined,
	});
}

export function authorsToText(authors: string[]) {
	return authors.join(", ");
}
