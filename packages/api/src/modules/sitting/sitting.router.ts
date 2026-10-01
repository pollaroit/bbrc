import { SittingSchema } from "@bbrc/schemas";
import {
	adminProcedure,
	notBannedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	CreateSittingInputSchema,
	CreateSittingOutputSchema,
	GetOngoingSittingOutputSchema,
	GetSittingBySlugOutputSchema,
	GetSittingListInputSchema,
	GetSittingListOutputSchema,
	SittingParticipantMutationInputSchema,
	SittingParticipantMutationOutputSchema,
	SubmitPollVotesInputSchema,
	SubmitPollVotesOutputSchema,
	TransitionSittingInputSchema,
	TransitionSittingOutputSchema,
	UpdateMyParticipationProgressInputSchema,
	UpdateMyParticipationProgressOutputSchema,
	UpdateParticipationInputSchema,
	UpdateParticipationOutputSchema,
	UpdateSittingDeadlinesInputSchema,
	UpdateSittingDeadlinesOutputSchema,
} from "./sitting.schema";
import {
	addSittingParticipant,
	createSitting,
	getOngoingSitting,
	getSittingBySlug,
	getSittingList,
	removeSittingParticipant,
	submitPollVotes,
	transitionSitting,
	updateMyParticipationProgress,
	updateParticipation,
	updateSittingDeadlines,
} from "./sitting.service";

export const sittingRouter = {
	getSittingList: publicProcedure
		.input(GetSittingListInputSchema)
		.output(GetSittingListOutputSchema)
		.handler(
			async ({ input, context }) => await getSittingList(input, context.db),
		),
	getSittingBySlug: publicProcedure
		.input(SittingSchema.shape.slug)
		.output(GetSittingBySlugOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getSittingBySlug(input, context.db, context.session),
		),
	getOngoingSitting: publicProcedure
		.output(GetOngoingSittingOutputSchema)
		.handler(async ({ context }) => await getOngoingSitting(context.db)),
	createSitting: adminProcedure
		.input(CreateSittingInputSchema)
		.output(CreateSittingOutputSchema)
		.handler(
			async ({ input, context }) => await createSitting(input, context.db),
		),
	submitPollVotes: notBannedProcedure
		.input(SubmitPollVotesInputSchema)
		.output(SubmitPollVotesOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			return await submitPollVotes(input, userId, context.db);
		}),
	transitionSitting: adminProcedure
		.input(TransitionSittingInputSchema)
		.output(TransitionSittingOutputSchema)
		.handler(
			async ({ input, context }) => await transitionSitting(input, context.db),
		),
	updateSittingDeadlines: adminProcedure
		.input(UpdateSittingDeadlinesInputSchema)
		.output(UpdateSittingDeadlinesOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateSittingDeadlines(input, context.db),
		),
	updateMyParticipationProgress: notBannedProcedure
		.input(UpdateMyParticipationProgressInputSchema)
		.output(UpdateMyParticipationProgressOutputSchema)
		.handler(async ({ input, context }) =>
			updateMyParticipationProgress(input, context.session.user.id, context.db),
		),
	updateParticipation: adminProcedure
		.input(UpdateParticipationInputSchema)
		.output(UpdateParticipationOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateParticipation(input, context.db),
		),
	addSittingParticipant: adminProcedure
		.input(SittingParticipantMutationInputSchema)
		.output(SittingParticipantMutationOutputSchema)
		.handler(
			async ({ input, context }) =>
				await addSittingParticipant(input, context.db),
		),
	removeSittingParticipant: adminProcedure
		.input(SittingParticipantMutationInputSchema)
		.output(SittingParticipantMutationOutputSchema)
		.handler(
			async ({ input, context }) =>
				await removeSittingParticipant(input, context.db),
		),
};
