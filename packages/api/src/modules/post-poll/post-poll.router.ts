import {
	notBannedProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import { loadViewer } from "../visibility/viewer";
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
		.handler(async ({ input, context }) =>
			getPollView(
				context.db,
				input.postSlug,
				await loadViewer(context.db, context.session),
			),
		),
	vote: notBannedProcedure
		.input(VotePollInputSchema)
		.output(PostPollViewSchema)
		.handler(async ({ input, context }) => {
			const viewer = await loadViewer(context.db, context.session);
			return votePoll(
				context.db,
				input.postSlug,
				input.optionIds,
				context.session.user.id,
				viewer,
			);
		}),
	retract: notBannedProcedure
		.input(RetractVoteInputSchema)
		.output(PostPollViewSchema)
		.handler(async ({ input, context }) => {
			const viewer = await loadViewer(context.db, context.session);
			return retractVote(
				context.db,
				input.postSlug,
				context.session.user.id,
				viewer,
			);
		}),
	addOption: notBannedProcedure
		.input(AddPollOptionInputSchema)
		.output(PostPollViewSchema)
		.handler(async ({ input, context }) => {
			const viewer = await loadViewer(context.db, context.session);
			return addPollOption(
				context.db,
				input.postSlug,
				input.option,
				context.session.user.id,
				viewer,
			);
		}),
	removeOption: notBannedProcedure
		.input(RemovePollOptionInputSchema)
		.output(PostPollViewSchema)
		.handler(async ({ input, context }) => {
			const viewer = await loadViewer(context.db, context.session);
			return removePollOption(
				context.db,
				input.postSlug,
				input.optionId,
				pollViewer(viewer),
				viewer,
			);
		}),
	updateSettings: notBannedProcedure
		.input(UpdatePollSettingsInputSchema)
		.output(PostPollViewSchema)
		.handler(async ({ input, context }) => {
			const viewer = await loadViewer(context.db, context.session);
			return updatePollSettings(context.db, input, pollViewer(viewer), viewer);
		}),
	close: notBannedProcedure
		.input(ClosePollInputSchema)
		.output(PostPollViewSchema)
		.handler(async ({ input, context }) => {
			const viewer = await loadViewer(context.db, context.session);
			return closePoll(context.db, input.postSlug, pollViewer(viewer), viewer);
		}),
	stats: protectedProcedure
		.input(GetPollInputSchema)
		.output(PollStatsSchema)
		.handler(async ({ input, context }) => {
			const viewer = await loadViewer(context.db, context.session);
			return getPollStats(
				context.db,
				input.postSlug,
				pollViewer(viewer),
				viewer,
			);
		}),
	searchTargets: protectedProcedure
		.input(SearchPollTargetsInputSchema)
		.output(SearchPollTargetsOutputSchema)
		.handler(async ({ input, context }) => ({
			items: await searchPollTargets(
				context.db,
				input.kind,
				input.query,
				await loadViewer(context.db, context.session),
				input.purpose,
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
		.handler(async ({ input, context }) =>
			setPollPreference(
				context.db,
				context.session.user.id,
				input.allowPollOptions,
			),
		),
};
