import { z } from "zod";
import {
	bookListQueryInputShape,
	refineBookListQueryInput,
} from "./book.schema";

export const bookExportFieldKeys = [
	"title",
	"authors",
	"status",
	"averageRating",
	"openLibraryRating",
	"pages",
	"publishedIn",
	"slug",
	"olid",
	"excerpt",
	"subjects",
	"subjectPeople",
	"subjectTimes",
	"feedbackCount",
	"favoriteCount",
	"createdAt",
	"updatedAt",
] as const;

export type BookExportFieldKey = (typeof bookExportFieldKeys)[number];

export const BookExportFieldKeySchema = z.enum(bookExportFieldKeys);

export const defaultBookExportFieldKeys = [
	"title",
	"authors",
	"status",
	"averageRating",
] as const satisfies readonly BookExportFieldKey[];

export const ExportBookListInputSchema = bookListQueryInputShape
	.extend({
		limit: z.number().int().min(1).max(5000).optional(),
	})
	.superRefine(refineBookListQueryInput);

export const BookExportRowSchema = z.object({
	title: z.string(),
	authors: z.array(z.string()),
	status: z.string(),
	averageRating: z.number().nullable(),
	openLibraryRating: z.number().nullable(),
	pages: z.number(),
	publishedIn: z.number(),
	slug: z.string(),
	olid: z.string(),
	excerpt: z.string().nullable(),
	subjects: z.array(z.string()),
	subjectPeople: z.array(z.string()),
	subjectTimes: z.array(z.string()),
	feedbackCount: z.number().int(),
	favoriteCount: z.number().int(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const ExportBookListOutputSchema = z.object({
	count: z.number().int().nonnegative(),
	items: z.array(BookExportRowSchema),
});

export type ExportBookListInput = z.infer<typeof ExportBookListInputSchema>;
export type ExportBookListOutput = z.infer<typeof ExportBookListOutputSchema>;
