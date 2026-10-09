import { SittingSchema } from "@bbrc/schemas";
import {
	adminProcedure,
	notBannedProcedure,
	publicProcedure,
} from "../../procedures";
import { revalidateSittingIsr } from "../../revalidate-isr";
import {
	CreateSittingInputSchema,
	CreateSittingOutputSchema,
	GetOngoingSittingOutputSchema,
	GetPollOptionReadersInputSchema,
	GetPollOptionReadersOutputSchema,
	GetPollOptionVotesInputSchema,
	GetPollOptionVotesOutputSchema,
	GetPollVotesByUserInputSchema,
	GetPollVotesByUserOutputSchema,
	GetSittingBySlugOutputSchema,
	GetSittingListInputSchema,
	GetSittingListOutputSchema,
	GetSittingPollPreviewReadersInputSchema,
	PreviewSittingPollOptionsInputSchema,
	PreviewSittingPollOptionsOutputSchema,
	ReplaceSittingPollPreviewOptionInputSchema,
	ReplaceSittingPollPreviewOptionOutputSchema,
	ResendSittingTelegramPollOpenInputSchema,
	ResendSittingTelegramPollOpenOutputSchema,
	SendSittingTelegramProgressPollInputSchema,
	SendSittingTelegramProgressPollOutputSchema,
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
	getPollOptionReaders,
	getPollOptionVotes,
	getPollVotesByUser,
	getSittingBySlug,
	getSittingList,
	getSittingPollPreviewReaders,
	previewSittingPollOptions,
	removeSittingParticipant,
	replaceSittingPollPreviewOption,
	resendSittingTelegramPollOpen,
	sendSittingTelegramProgressPoll,
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
		.handler(
			async ({ context }) =>
				await getOngoingSitting(context.db, context.session?.user.id),
		),
	previewSittingPollOptions: adminProcedure
		.input(PreviewSittingPollOptionsInputSchema)
		.output(PreviewSittingPollOptionsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await previewSittingPollOptions(input, context.db),
		),
	replaceSittingPollPreviewOption: adminProcedure
		.input(ReplaceSittingPollPreviewOptionInputSchema)
		.output(ReplaceSittingPollPreviewOptionOutputSchema)
		.handler(
			async ({ input, context }) =>
				await replaceSittingPollPreviewOption(input, context.db),
		),
	createSitting: adminProcedure
		.input(CreateSittingInputSchema)
		.output(CreateSittingOutputSchema)
		.handler(async ({ input, context }) => {
			const sitting = await createSitting(input, context.db);
			revalidateSittingIsr(context, sitting.slug);
			return sitting;
		}),
	submitPollVotes: notBannedProcedure
		.input(SubmitPollVotesInputSchema)
		.output(SubmitPollVotesOutputSchema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const result = await submitPollVotes(input, userId, context.db);
			revalidateSittingIsr(context, input.sittingSlug);
			return result;
		}),
	getPollOptionVotes: adminProcedure
		.input(GetPollOptionVotesInputSchema)
		.output(GetPollOptionVotesOutputSchema)
		.handler(
			async ({ input, context }) => await getPollOptionVotes(input, context.db),
		),
	getPollOptionReaders: notBannedProcedure
		.input(GetPollOptionReadersInputSchema)
		.output(GetPollOptionReadersOutputSchema)
		.handler(async ({ input, context }) =>
			getPollOptionReaders(
				input,
				context.session.user.id,
				context.session.user.isAdmin === true,
				context.db,
			),
		),
	getSittingPollPreviewReaders: adminProcedure
		.input(GetSittingPollPreviewReadersInputSchema)
		.output(GetPollOptionReadersOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getSittingPollPreviewReaders(input, context.db),
		),
	getPollVotesByUser: adminProcedure
		.input(GetPollVotesByUserInputSchema)
		.output(GetPollVotesByUserOutputSchema)
		.handler(
			async ({ input, context }) => await getPollVotesByUser(input, context.db),
		),
	transitionSitting: adminProcedure
		.input(TransitionSittingInputSchema)
		.output(TransitionSittingOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await transitionSitting(input, context.db);
			revalidateSittingIsr(context, result.slug);
			return result;
		}),
	updateSittingDeadlines: adminProcedure
		.input(UpdateSittingDeadlinesInputSchema)
		.output(UpdateSittingDeadlinesOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await updateSittingDeadlines(input, context.db);
			revalidateSittingIsr(context, input.slug);
			return result;
		}),
	updateMyParticipationProgress: notBannedProcedure
		.input(UpdateMyParticipationProgressInputSchema)
		.output(UpdateMyParticipationProgressOutputSchema)
		.handler(async ({ input, context }) =>
			updateMyParticipationProgress(input, context.session.user.id, context.db),
		),
	updateParticipation: adminProcedure
		.input(UpdateParticipationInputSchema)
		.output(UpdateParticipationOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await updateParticipation(input, context.db);
			revalidateSittingIsr(context, input.slug);
			return result;
		}),
	addSittingParticipant: adminProcedure
		.input(SittingParticipantMutationInputSchema)
		.output(SittingParticipantMutationOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await addSittingParticipant(input, context.db);
			revalidateSittingIsr(context, input.slug);
			return result;
		}),
	removeSittingParticipant: adminProcedure
		.input(SittingParticipantMutationInputSchema)
		.output(SittingParticipantMutationOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await removeSittingParticipant(input, context.db);
			revalidateSittingIsr(context, input.slug);
			return result;
		}),
	sendSittingTelegramProgressPoll: adminProcedure
		.input(SendSittingTelegramProgressPollInputSchema)
		.output(SendSittingTelegramProgressPollOutputSchema)
		.handler(
			async ({ input, context }) =>
				await sendSittingTelegramProgressPoll(input, context.db),
		),
	resendSittingTelegramPollOpen: adminProcedure
		.input(ResendSittingTelegramPollOpenInputSchema)
		.output(ResendSittingTelegramPollOpenOutputSchema)
		.handler(
			async ({ input, context }) =>
				await resendSittingTelegramPollOpen(input, context.db),
		),
};
