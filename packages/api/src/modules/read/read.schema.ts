import { BookSchema, UserSchema } from "@bbrc/schemas";
import {
	CursorPaginationInputSchema,
	CursorPaginationMetadataSchema,
} from "@bbrc/schemas/listing/pagination";
import { ReadDateFieldSchema } from "@bbrc/schemas/read-dates";
import { openLibraryEditionKeyToOlid } from "@bbrc/shared";
import { z } from "zod";

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

export const GetBookReadStateInputSchema = z.object({
	bookSlug: BookSchema.shape.slug,
});

export const SetReadInputSchema = z.object({
	bookSlug: BookSchema.shape.slug,
	readStart: ReadDateFieldSchema.optional(),
	readEnd: ReadDateFieldSchema.optional(),
	/** Edition OLID or `/books/OL…M` key; pass `null` to clear. */
	editionId: ReadEditionIdFieldSchema.optional(),
});

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
	readStart: ReadDateFieldSchema.nullable(),
	readEnd: ReadDateFieldSchema.nullable(),
	editionId: ReadEditionIdFieldSchema,
});

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
	limit: z.number().int().min(1).max(25).optional(),
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

export const SearchWorkEditionsOutputSchema = z.object({
	items: z.array(WorkEditionSummarySchema),
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
	readStart: ReadDateFieldSchema.nullable(),
	readEnd: ReadDateFieldSchema.nullable(),
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
	readStart: ReadDateFieldSchema.nullable(),
	readEnd: ReadDateFieldSchema.nullable(),
	editionId: ReadEditionIdFieldSchema,
	recordedAt: z.coerce.date(),
	book: UserReadBookSummarySchema,
});

export const ListUserReadsInputSchema = CursorPaginationInputSchema.extend({
	username: UserSchema.shape.username,
});

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
	readStart: true,
	readEnd: true,
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
