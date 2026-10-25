import { z } from "zod";
import {
	CreateSittingInputSchema,
	CreateSittingPollInputSchema,
	refinePollConfig,
	SittingPollPreviewOptionSchema,
} from "./sitting.schema";

/** Books the chosen participants have on their wishlists that could go on this poll. */
export const WishlistPollCandidatesInputSchema = z
	.object({
		participantUserIds: CreateSittingInputSchema.shape.participantUserIds,
		poll: CreateSittingPollInputSchema.default({}),
		limit: z.number().int().min(1).max(12).default(8),
	})
	.superRefine((value, ctx) => {
		refinePollConfig(value.poll, ctx, ["poll"]);
	});

export const WishlistPollCandidatesOutputSchema = z.object({
	items: z.array(
		z.object({
			/** Same shape as a drawn poll option, so it can be dropped straight into the poll. */
			option: SittingPollPreviewOptionSchema,
			/** How many of the participants have it on their wishlist (never who). */
			wishlisted: z.number().int().min(1),
		}),
	),
	participantCount: z.number().int().min(0),
});

export type WishlistPollCandidatesInput = z.infer<
	typeof WishlistPollCandidatesInputSchema
>;
export type WishlistPollCandidatesOutput = z.infer<
	typeof WishlistPollCandidatesOutputSchema
>;
