import { z } from "zod";

export const BookRecommendationItemSchema = z.object({
	olid: z.string(),
	title: z.string(),
	authors: z.array(z.string()),
	coverId: z.number().int().nullable(),
	publishedIn: z.number().int().nullable(),
	reasons: z.array(z.string()),
	confidenceScore: z.number().int().min(0).max(100),
});

export const RecommendOpenLibraryBooksOutputSchema = z.object({
	items: z.array(BookRecommendationItemSchema),
	cached: z.boolean(),
});

export type BookRecommendationItem = z.infer<
	typeof BookRecommendationItemSchema
>;

export type RecommendOpenLibraryBooksOutput = z.infer<
	typeof RecommendOpenLibraryBooksOutputSchema
>;

export const RecommendOpenLibraryReplaceInputSchema = z.object({
	rejectOlid: z.string().min(1),
	visibleOlids: z
		.array(z.string())
		.min(1, "Current recommendation list is required"),
	/** Every OLID shown in this recommend session (including swapped-out titles). */
	sessionExcludedOlids: z.array(z.string()),
});

export const RecommendOpenLibraryReplaceOutputSchema = z.object({
	item: BookRecommendationItemSchema.nullable(),
});

export type RecommendOpenLibraryReplaceInput = z.infer<
	typeof RecommendOpenLibraryReplaceInputSchema
>;

export const ListCatalogOlidsOutputSchema = z.object({
	olids: z.array(z.string()),
});

export type ListCatalogOlidsOutput = z.infer<
	typeof ListCatalogOlidsOutputSchema
>;

export type RecommendationStreamEvent =
	| { type: "meta"; catalogOlids: string[]; cached: boolean }
	| { type: "item"; item: BookRecommendationItem }
	| { type: "done" }
	| { type: "error"; message: string };
