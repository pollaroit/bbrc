import { POLL_NOMINEE_FILTERS, POLL_NOMINEE_REASONS } from "@bbrc/shared";
import { z } from "zod";
import {
	CreateSittingInputSchema,
	CreateSittingPollInputSchema,
	refinePollConfig,
	SittingPollPreviewOptionSchema,
} from "./sitting.schema";

/** An admin searches the whole library for a book to put on the poll. */
export const SearchPollNomineesInputSchema = z
	.object({
		participantUserIds: CreateSittingInputSchema.shape.participantUserIds,
		poll: CreateSittingPollInputSchema.default({}),
		/** The books now in the preview, so "already in the poll" can be told. */
		currentOptionBookIds: z.array(z.string()).max(40).default([]),
		query: z.string().trim().min(1).max(100),
		limit: z.number().int().min(1).max(12).default(8),
	})
	.superRefine((value, ctx) => {
		refinePollConfig(value.poll, ctx, ["poll"]);
	});

export const SearchPollNomineesOutputSchema = z.object({
	participantCount: z.number().int().min(0),
	items: z.array(
		z.object({
			option: SittingPollPreviewOptionSchema,
			/** Why the book cannot go on the poll; empty when it can. */
			reasons: z.array(z.enum(POLL_NOMINEE_REASONS)),
			/** Which filters it falls outside of, when known. */
			filters: z.array(z.enum(POLL_NOMINEE_FILTERS)),
		}),
	),
});

export type SearchPollNomineesInput = z.infer<
	typeof SearchPollNomineesInputSchema
>;
export type SearchPollNomineesOutput = z.infer<
	typeof SearchPollNomineesOutputSchema
>;
