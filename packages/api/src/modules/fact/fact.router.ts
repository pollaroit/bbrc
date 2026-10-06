import { notBannedProcedure, protectedProcedure } from "../../procedures";
import {
	ListFactReelsInputSchema,
	ListFactReelsOutputSchema,
	ListUserSeenFactsInputSchema,
	ListUserSeenFactsOutputSchema,
	MarkFactReelSeenInputSchema,
	MarkFactReelSeenOutputSchema,
	PullFactReelDeckInputSchema,
	PullFactReelDeckOutputSchema,
	PullUserSeenFactReelDeckInputSchema,
	PullUserSeenFactReelDeckOutputSchema,
	SetFactVoteInputSchema,
	SetFactVoteOutputSchema,
} from "./fact.schema";
import {
	listFactReels,
	listUserSeenFacts,
	markFactReelSeen,
	pullFactReelDeck,
	pullUserSeenFactReelDeck,
	setFactVote,
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
	listUserSeenFacts: protectedProcedure
		.input(ListUserSeenFactsInputSchema)
		.output(ListUserSeenFactsOutputSchema)
		.handler(async ({ input, context }) =>
			listUserSeenFacts(input, context.session.user.id, context.db),
		),
	pullSeenDeck: protectedProcedure
		.input(PullUserSeenFactReelDeckInputSchema)
		.output(PullUserSeenFactReelDeckOutputSchema)
		.handler(async ({ input, context }) =>
			pullUserSeenFactReelDeck(input, context.session.user.id, context.db),
		),
	markSeen: protectedProcedure
		.input(MarkFactReelSeenInputSchema)
		.output(MarkFactReelSeenOutputSchema)
		.handler(async ({ input, context }) =>
			markFactReelSeen(input, context.session.user.id, context.db),
		),
	setVote: notBannedProcedure
		.input(SetFactVoteInputSchema)
		.output(SetFactVoteOutputSchema)
		.handler(async ({ input, context }) =>
			setFactVote(input, context.session.user.id, context.db),
		),
};
