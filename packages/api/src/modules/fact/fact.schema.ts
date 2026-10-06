import { CursorPaginationInputSchema } from "@bbrc/schemas";
import { z } from "zod";
import {
	FactCategorySchema,
	FactConfidenceSchema,
} from "../admin/admin-fact.schema";

export const FactReelItemSchema = z.object({
	id: z.string().uuid(),
	body: z.string(),
	category: FactCategorySchema,
	source: z.string().url(),
	image: z.string().url().nullable(),
	confidence: FactConfidenceSchema,
	publishedAt: z.coerce.date(),
	likeCount: z.number().int().min(0),
	likedByViewer: z.boolean(),
});

export type FactReelItem = z.infer<typeof FactReelItemSchema>;

export const PullFactReelDeckInputSchema = z.object({
	limit: z.number().int().min(1).max(10).default(5),
	excludeFactIds: z.array(z.string().uuid()).max(200).default([]),
});

export type PullFactReelDeckInput = z.infer<typeof PullFactReelDeckInputSchema>;

export const PullFactReelDeckOutputSchema = z.object({
	items: z.array(FactReelItemSchema),
	exhausted: z.boolean(),
});

export type PullFactReelDeckOutput = z.infer<
	typeof PullFactReelDeckOutputSchema
>;

/** @deprecated Prefer `pullDeck` — kept for older clients still calling `listReels`. */
export const ListFactReelsInputSchema = CursorPaginationInputSchema;

export type ListFactReelsInput = z.infer<typeof ListFactReelsInputSchema>;

export const ListFactReelsOutputSchema = z.object({
	items: z.array(FactReelItemSchema),
	metadata: z.object({
		limit: z.number().int().min(1),
		hasNextPage: z.boolean(),
		hasPreviousPage: z.boolean(),
		nextCursor: z.string().nullable(),
	}),
});

export type ListFactReelsOutput = z.infer<typeof ListFactReelsOutputSchema>;

export const MarkFactReelSeenInputSchema = z.object({
	factId: z.string().uuid(),
});

export type MarkFactReelSeenInput = z.infer<typeof MarkFactReelSeenInputSchema>;

export const MarkFactReelSeenOutputSchema = z.object({ ok: z.literal(true) });

export const ToggleFactLikeInputSchema = z.object({
	factId: z.string().uuid(),
});

export type ToggleFactLikeInput = z.infer<typeof ToggleFactLikeInputSchema>;

export const ToggleFactLikeOutputSchema = z.object({
	liked: z.boolean(),
	likeCount: z.number().int().min(0),
});

export type ToggleFactLikeOutput = z.infer<typeof ToggleFactLikeOutputSchema>;
