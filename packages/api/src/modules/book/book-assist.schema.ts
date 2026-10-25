import { z } from "zod";

export const FindSimilarBooksInputSchema = z.object({
	title: z.string().trim().min(1).max(500),
	authors: z.array(z.string().trim().min(1)).max(20).default([]),
	/** The work being added, so it is never reported as its own duplicate. */
	olid: z.string().optional(),
});

export const SimilarBookSchema = z.object({
	slug: z.string(),
	title: z.string(),
	authors: z.array(z.string()),
	coverId: z.number().int().nullable(),
	/** 0 to 100. */
	similarity: z.number().int().min(0).max(100),
});

export const FindSimilarBooksOutputSchema = z.object({
	items: z.array(SimilarBookSchema),
});
export type FindSimilarBooksOutput = z.infer<
	typeof FindSimilarBooksOutputSchema
>;

export const SuggestBookDetailsInputSchema = z.object({
	title: z.string().trim().min(1).max(500),
	authors: z.array(z.string().trim().min(1)).max(20),
	publishedIn: z.number().int().optional(),
	/** What Open Library already has, so the draft can build on it. */
	excerpt: z.string().trim().max(4000).optional(),
});

export const SuggestBookDetailsOutputSchema = z.object({
	excerpt: z.string().nullable(),
	subjects: z.array(z.string()),
});
export type SuggestBookDetailsInput = z.infer<
	typeof SuggestBookDetailsInputSchema
>;
export type SuggestBookDetailsOutput = z.infer<
	typeof SuggestBookDetailsOutputSchema
>;
