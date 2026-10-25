import { notBannedProcedure, publicProcedure } from "../../procedures";
import {
	MentionForContentBatchInputSchema,
	MentionForContentBatchOutputSchema,
	MentionForContentInputSchema,
	MentionForContentOutputSchema,
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
import {
	findViewerMentions,
	getMentionPreferences,
	listMyMentions,
	removeMyMention,
	resolveMentionProfiles,
	searchMentionCandidates,
	setMentionPreferences,
} from "./mention.service";

export const mentionRouter = {
	search: notBannedProcedure
		.input(MentionSearchInputSchema)
		.output(MentionSearchOutputSchema)
		.handler(async ({ input, context }) => ({
			items: await searchMentionCandidates(
				context.db,
				{ id: context.session.user.id },
				input,
			),
		})),
	resolve: publicProcedure
		.input(MentionResolveInputSchema)
		.output(MentionResolveOutputSchema)
		.handler(async ({ input, context }) => ({
			profiles: await resolveMentionProfiles(context.db, input.ids),
		})),
	mine: notBannedProcedure
		.input(MentionMineInputSchema)
		.output(MentionMineOutputSchema)
		.handler(({ input, context }) =>
			listMyMentions(context.db, context.session.user.id, input),
		),
	forContent: notBannedProcedure
		.input(MentionForContentInputSchema)
		.output(MentionForContentOutputSchema)
		.handler(async ({ input, context }) => {
			const found = await findViewerMentions(
				context.db,
				context.session.user.id,
				{
					postSlugs: input.postSlug ? [input.postSlug] : undefined,
					commentSlugs: input.commentSlug ? [input.commentSlug] : undefined,
					feedbackSlugs: input.feedbackSlug ? [input.feedbackSlug] : undefined,
				},
			);
			return { mentionId: found[0]?.mentionId ?? null };
		}),
	forContentBatch: notBannedProcedure
		.input(MentionForContentBatchInputSchema)
		.output(MentionForContentBatchOutputSchema)
		.handler(async ({ input, context }) => ({
			items: await findViewerMentions(
				context.db,
				context.session.user.id,
				input,
			),
		})),
	remove: notBannedProcedure
		.input(MentionRemoveInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await removeMyMention(
				context.db,
				{ id: context.session.user.id },
				input.id,
			);
			return { ok: true as const };
		}),
	preferences: notBannedProcedure
		.output(MentionPreferencesSchema)
		.handler(({ context }) =>
			getMentionPreferences(context.db, context.session.user.id),
		),
	setPreferences: notBannedProcedure
		.input(SetMentionPreferencesInputSchema)
		.output(MentionPreferencesSchema)
		.handler(({ input, context }) =>
			setMentionPreferences(context.db, context.session.user.id, input),
		),
};
