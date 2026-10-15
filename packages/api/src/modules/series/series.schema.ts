import { BookSchema, CursorPaginationInputSchema } from "@bbrc/schemas";
import type { z } from "zod";
import zod from "zod";
import {
	seriesListFiltersSchema,
	seriesListSearching,
	seriesListSorting,
} from "./series.listing";

export const BookSeriesSummarySchema = zod.object({
	slug: zod.string(),
	title: zod.string(),
	position: zod.number().int().min(1),
});

export type BookSeriesSummary = z.infer<typeof BookSeriesSummarySchema>;

export const SeriesListItemSchema = zod.object({
	slug: zod.string(),
	title: zod.string(),
	description: zod.string().nullable(),
	bookCount: zod.number().int().min(0),
	updatedAt: zod.coerce.date(),
	coverPreviewCoverIds: zod.array(zod.number().nullable()).max(4),
});

export const GetSeriesListInputSchema = seriesListFiltersSchema
	.extend(CursorPaginationInputSchema.shape)
	.extend(seriesListSorting.inputSchema.shape)
	.extend(seriesListSearching.inputSchema.shape);

export const GetSeriesListOutputSchema = zod.object({
	items: zod.array(SeriesListItemSchema),
	metadata: zod.object({
		limit: zod.number().int().min(1),
		hasNextPage: zod.boolean(),
		hasPreviousPage: zod.boolean(),
		nextCursor: zod.string().nullable(),
		total: zod.number().int().min(0).optional(),
	}),
});

export type GetSeriesListInput = z.infer<typeof GetSeriesListInputSchema>;
export type GetSeriesListOutput = z.infer<typeof GetSeriesListOutputSchema>;

export const SeriesBookOnSeriesSchema = zod.object({
	position: zod.number().int().min(1),
	book: BookSchema.pick({
		slug: true,
		title: true,
		authors: true,
		coverId: true,
		publishedIn: true,
	}),
});

export const GetSeriesBySlugInputSchema = zod.object({
	slug: zod.string().min(1),
});

export const GetSeriesBySlugOutputSchema = SeriesListItemSchema.extend({
	books: zod.array(SeriesBookOnSeriesSchema),
});

export type GetSeriesBySlugOutput = z.infer<typeof GetSeriesBySlugOutputSchema>;

export const CreateSeriesInputSchema = zod.object({
	title: zod.string().trim().min(1).max(120),
	slug: BookSchema.shape.slug.optional(),
	description: zod.string().trim().max(2000).optional(),
});

export type CreateSeriesInput = z.infer<typeof CreateSeriesInputSchema>;

export const CreateSeriesOutputSchema = zod.object({
	slug: zod.string(),
});

export const UpdateSeriesInputSchema = zod.object({
	slug: zod.string().min(1),
	title: zod.string().trim().min(1).max(120).optional(),
	nextSlug: BookSchema.shape.slug.optional(),
	description: zod.string().trim().max(2000).nullable().optional(),
});

export type UpdateSeriesInput = z.infer<typeof UpdateSeriesInputSchema>;

export const UpdateSeriesOutputSchema = zod.object({
	slug: zod.string(),
});

export const DeleteSeriesInputSchema = zod.object({
	slug: zod.string().min(1),
});

export type DeleteSeriesInput = z.infer<typeof DeleteSeriesInputSchema>;

export const DeleteSeriesOutputSchema = zod.object({
	deleted: zod.literal(true),
});

export const AddBookToSeriesInputSchema = zod.object({
	seriesSlug: zod.string().min(1),
	bookSlug: zod.string().min(1),
});

export type AddBookToSeriesInput = z.infer<typeof AddBookToSeriesInputSchema>;

export const AddBookToSeriesOutputSchema = zod.object({
	added: zod.literal(true),
	position: zod.number().int().min(1),
});

export const RemoveBookFromSeriesInputSchema = zod.object({
	seriesSlug: zod.string().min(1),
	bookSlug: zod.string().min(1),
});

export type RemoveBookFromSeriesInput = z.infer<
	typeof RemoveBookFromSeriesInputSchema
>;

export const RemoveBookFromSeriesOutputSchema = zod.object({
	removed: zod.literal(true),
});

export const ReorderSeriesBooksInputSchema = zod.object({
	seriesSlug: zod.string().min(1),
	bookSlugs: zod.array(zod.string().min(1)),
});

export type ReorderSeriesBooksInput = z.infer<
	typeof ReorderSeriesBooksInputSchema
>;

export const ReorderSeriesBooksOutputSchema = zod.object({
	reordered: zod.literal(true),
});

export {
	seriesListFiltersSchema,
	seriesListSearching,
	seriesListSorting,
	seriesSearchableFields,
	seriesSortableFields,
} from "./series.listing";
