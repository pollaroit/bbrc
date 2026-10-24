import {
	notBannedProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	AddPollOptionInputSchema,
	ClosePollInputSchema,
	GetPollInputSchema,
	PollPreferenceSchema,
	PollStatsSchema,
	PostPollViewSchema,
	RemovePollOptionInputSchema,
	RetractVoteInputSchema,
	SearchPollTargetsInputSchema,
	SearchPollTargetsOutputSchema,
	UpdatePollSettingsInputSchema,
	VotePollInputSchema,
} from "./post-poll.schema";
import {
	addPollOption,
	closePoll,
	getPollPreference,
	getPollStats,
	getPollView,
	pollViewer,
	removePollOption,
	retractVote,
	searchPollTargets,
	setPollPreference,
	updatePollSettings,
	votePoll,
} from "./post-poll.service";

export const postPollRouter = {
	get: publicProcedure
		.input(GetPollInputSchema)
		.output(PostPollViewSchema)
		.handler(({ input, context }) =>
			getPollView(context.db, input.postSlug, context.session),
		),
	vote: notBannedProcedure
		.input(VotePollInputSchema)
		.output(PostPollViewSchema)
		.handler(({ input, context }) =>
			votePoll(
				context.db,
				input.postSlug,
				input.optionIds,
				context.session.user.id,
				context.session,
			),
		),
	retract: notBannedProcedure
		.input(RetractVoteInputSchema)
		.output(PostPollViewSchema)
		.handler(({ input, context }) =>
			retractVote(
				context.db,
				input.postSlug,
				context.session.user.id,
				context.session,
			),
		),
	addOption: notBannedProcedure
		.input(AddPollOptionInputSchema)
		.output(PostPollViewSchema)
		.handler(({ input, context }) =>
			addPollOption(
				context.db,
				input.postSlug,
				input.option,
				context.session.user.id,
				context.session,
			),
		),
	removeOption: notBannedProcedure
		.input(RemovePollOptionInputSchema)
		.output(PostPollViewSchema)
		.handler(({ input, context }) =>
			removePollOption(
				context.db,
				input.postSlug,
				input.optionId,
				pollViewer(context.session),
				context.session,
			),
		),
	updateSettings: notBannedProcedure
		.input(UpdatePollSettingsInputSchema)
		.output(PostPollViewSchema)
		.handler(({ input, context }) =>
			updatePollSettings(
				context.db,
				input,
				pollViewer(context.session),
				context.session,
			),
		),
	close: notBannedProcedure
		.input(ClosePollInputSchema)
		.output(PostPollViewSchema)
		.handler(({ input, context }) =>
			closePoll(
				context.db,
				input.postSlug,
				pollViewer(context.session),
				context.session,
			),
		),
	stats: protectedProcedure
		.input(GetPollInputSchema)
		.output(PollStatsSchema)
		.handler(({ input, context }) =>
			getPollStats(
				context.db,
				input.postSlug,
				pollViewer(context.session),
				context.session,
			),
		),
	searchTargets: protectedProcedure
		.input(SearchPollTargetsInputSchema)
		.output(SearchPollTargetsOutputSchema)
		.handler(async ({ input, context }) => ({
			items: await searchPollTargets(
				context.db,
				input.kind,
				input.query,
				context.session.user.id,
			),
		})),
	getPreference: protectedProcedure
		.output(PollPreferenceSchema)
		.handler(({ context }) =>
			getPollPreference(context.db, context.session.user.id),
		),
	setPreference: protectedProcedure
		.input(PollPreferenceSchema)
		.output(PollPreferenceSchema)
		.handler(({ input, context }) =>
			setPollPreference(
				context.db,
				context.session.user.id,
				input.allowPollOptions,
			),
		),
};
