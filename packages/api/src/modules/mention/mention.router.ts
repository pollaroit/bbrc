import { ORPCError } from "@orpc/server";
import { notBannedProcedure, publicProcedure } from "../../procedures";
import {
	MentionMineInputSchema,
	MentionMineOutputSchema,
	MentionPreferencesSchema,
	MentionRemoveInputSchema,
	MentionResolveInputSchema,
	MentionResolveOutputSchema,
	MentionSearchInputSchema,
	MentionSearchOutputSchema,
	OkSchema,
	SetMentionPreferencesInputSchema,
} from "./mention.schema";

const notBuilt = () => {
	throw new ORPCError("NOT_IMPLEMENTED", {
		message: "Mentions are not built yet.",
	});
};

export const mentionRouter = {
	search: notBannedProcedure
		.input(MentionSearchInputSchema)
		.output(MentionSearchOutputSchema)
		.handler(notBuilt),
	resolve: publicProcedure
		.input(MentionResolveInputSchema)
		.output(MentionResolveOutputSchema)
		.handler(notBuilt),
	mine: notBannedProcedure
		.input(MentionMineInputSchema)
		.output(MentionMineOutputSchema)
		.handler(notBuilt),
	remove: notBannedProcedure
		.input(MentionRemoveInputSchema)
		.output(OkSchema)
		.handler(notBuilt),
	preferences: notBannedProcedure
		.output(MentionPreferencesSchema)
		.handler(notBuilt),
	setPreferences: notBannedProcedure
		.input(SetMentionPreferencesInputSchema)
		.output(MentionPreferencesSchema)
		.handler(notBuilt),
};
