import {
	CursorPaginationInputSchema,
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
} from "@bbrc/schemas";
import { z } from "zod";
import {
	FactCategorySchema,
	FactConfidenceSchema,
} from "../admin/admin-fact.schema";

export const FactVoteValueSchema = z.enum(["up", "down"]);

export type FactVoteValue = z.infer<typeof FactVoteValueSchema>;

export const FactReelItemSchema = z.object({
	id: z.string().uuid(),
	body: z.string(),
	category: FactCategorySchema,
	source: z.string().url(),
	image: z.string().url().nullable(),
	confidence: FactConfidenceSchema,
	publishedAt: z.coerce.date(),
	viewerVote: FactVoteValueSchema.nullable(),
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

export const PullUserSeenFactReelDeckInputSchema = z.object({
	username: z.string().trim().min(1).max(64),
	limit: z.number().int().min(1).max(10).default(5),
	excludeFactIds: z.array(z.string().uuid()).max(200).default([]),
	anchorFactId: z.string().uuid().optional(),
});

export const UserSeenFactGridItemSchema = z.object({
	id: z.string().uuid(),
	body: z.string(),
	category: FactCategorySchema,
	image: z.string().url().nullable(),
	seenAt: z.coerce.date(),
	viewerVote: FactVoteValueSchema.nullable(),
});

export type UserSeenFactGridItem = z.infer<typeof UserSeenFactGridItemSchema>;

export const ListUserSeenFactsInputSchema = OffsetPaginationInputSchema.extend({
	username: z.string().trim().min(1).max(64),
});

export type ListUserSeenFactsInput = z.infer<
	typeof ListUserSeenFactsInputSchema
>;

export const ListUserSeenFactsOutputSchema = OffsetPaginationOutputSchema(
	UserSeenFactGridItemSchema,
);

export type ListUserSeenFactsOutput = z.infer<
	typeof ListUserSeenFactsOutputSchema
>;

export type PullUserSeenFactReelDeckInput = z.infer<
	typeof PullUserSeenFactReelDeckInputSchema
>;

export const PullUserSeenFactReelDeckOutputSchema =
	PullFactReelDeckOutputSchema.extend({
		username: z.string(),
	});

export type PullUserSeenFactReelDeckOutput = z.infer<
	typeof PullUserSeenFactReelDeckOutputSchema
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

export const SetFactVoteInputSchema = z.object({
	factId: z.string().uuid(),
	direction: FactVoteValueSchema,
});

export type SetFactVoteInput = z.infer<typeof SetFactVoteInputSchema>;

export const SetFactVoteOutputSchema = z.object({
	viewerVote: FactVoteValueSchema.nullable(),
});

export type SetFactVoteOutput = z.infer<typeof SetFactVoteOutputSchema>;
