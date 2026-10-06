import { notBannedProcedure, protectedProcedure } from "../../procedures";
import {
	ListFactReelsInputSchema,
	ListFactReelsOutputSchema,
	MarkFactReelSeenInputSchema,
	MarkFactReelSeenOutputSchema,
	PullFactReelDeckInputSchema,
	PullFactReelDeckOutputSchema,
	ToggleFactLikeInputSchema,
	ToggleFactLikeOutputSchema,
} from "./fact.schema";
import {
	listFactReels,
	markFactReelSeen,
	pullFactReelDeck,
	toggleFactLike,
} from "./fact.service";

export const factRouter = {
	listReels: protectedProcedure
		.input(ListFactReelsInputSchema)
		.output(ListFactReelsOutputSchema)
		.handler(async ({ input, context }) =>
			listFactReels(input, context.session.user.id, context.db),
		),
	pullDeck: protectedProcedure
		.input(PullFactReelDeckInputSchema)
		.output(PullFactReelDeckOutputSchema)
		.handler(async ({ input, context }) =>
			pullFactReelDeck(input, context.session.user.id, context.db),
		),
	markSeen: protectedProcedure
		.input(MarkFactReelSeenInputSchema)
		.output(MarkFactReelSeenOutputSchema)
		.handler(async ({ input, context }) =>
			markFactReelSeen(input, context.session.user.id, context.db),
		),
	toggleLike: notBannedProcedure
		.input(ToggleFactLikeInputSchema)
		.output(ToggleFactLikeOutputSchema)
		.handler(async ({ input, context }) =>
			toggleFactLike(input, context.session.user.id, context.db),
		),
};
