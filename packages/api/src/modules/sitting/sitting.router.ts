import { SittingSchema } from "@bbrc/schemas";
import {
	adminProcedure,
	notBannedProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	revalidateBookIsr,
	revalidateBooksCatalogIsr,
	revalidateSittingIsr,
} from "../../revalidate-isr";
import { evaluateSittingMembersAchievements } from "../achievement/achievement.service";
import { checkAchievementsAfter } from "../achievement/achievement-middleware";
import {
	CreateSittingInputSchema,
	CreateSittingOutputSchema,
	GetMySittingStateOutputSchema,
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
	GetSittingPollPoolSizeInputSchema,
	GetSittingPollPoolSizeOutputSchema,
	GetSittingPollPreviewReadersInputSchema,
	PreviewSittingPollOptionsInputSchema,
	PreviewSittingPollOptionsOutputSchema,
	RemoveSittingParticipantInputSchema,
	ReplaceSittingPollPreviewOptionInputSchema,
	ReplaceSittingPollPreviewOptionOutputSchema,
	ShuffleSittingPollPreviewOptionsInputSchema,
	ShuffleSittingPollPreviewOptionsOutputSchema,
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
	getMySittingState,
	getOngoingSitting,
	getPollOptionReaders,
	getPollOptionVotes,
	getPollVotesByUser,
	getSittingBySlug,
	getSittingList,
	getSittingPollPoolSize,
	getSittingPollPreviewReaders,
	previewSittingPollOptions,
	removeSittingParticipant,
	replaceSittingPollPreviewOption,
	shuffleSittingPollPreviewOptions,
	submitPollVotes,
	transitionSitting,
	updateMyParticipationProgress,
	updateParticipation,
	updateSittingDeadlines,
} from "./sitting.service";
import { sittingJoinRouter } from "./sitting-join.router";
import {
	SearchPollNomineesInputSchema,
	SearchPollNomineesOutputSchema,
} from "./sitting-poll-nominees.schema";
import { searchPollNominees } from "./sitting-poll-nominees.service";
import {
	WishlistPollCandidatesInputSchema,
	WishlistPollCandidatesOutputSchema,
} from "./sitting-wishlist-candidates.schema";
import { wishlistPollCandidates } from "./sitting-wishlist-candidates.service";

export const sittingRouter = {
	getSittingList: publicProcedure
		.input(GetSittingListInputSchema)
		.output(GetSittingListOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getSittingList(input, context.db, context.session),
		),
	getSittingBySlug: publicProcedure
		.input(SittingSchema.shape.slug)
		.output(GetSittingBySlugOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getSittingBySlug(input, context.db, context.session),
		),
	getMySittingState: protectedProcedure
		.input(SittingSchema.shape.slug)
		.output(GetMySittingStateOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getMySittingState(input, context.session.user.id, context.db),
		),
	getOngoingSitting: publicProcedure
		.output(GetOngoingSittingOutputSchema)
		.handler(
			async ({ context }) =>
				await getOngoingSitting(context.db, context.session?.user.id),
		),
	getSittingPollPoolSize: adminProcedure
		.input(GetSittingPollPoolSizeInputSchema)
		.output(GetSittingPollPoolSizeOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getSittingPollPoolSize(input, context.db),
		),
	wishlistPollCandidates: adminProcedure
		.input(WishlistPollCandidatesInputSchema)
		.output(WishlistPollCandidatesOutputSchema)
		.handler(
			async ({ input, context }) =>
				await wishlistPollCandidates(input, context.db),
		),
	searchPollNominees: adminProcedure
		.input(SearchPollNomineesInputSchema)
		.output(SearchPollNomineesOutputSchema)
		.handler(
			async ({ input, context }) => await searchPollNominees(input, context.db),
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
	shuffleSittingPollPreviewOptions: adminProcedure
		.input(ShuffleSittingPollPreviewOptionsInputSchema)
		.output(ShuffleSittingPollPreviewOptionsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await shuffleSittingPollPreviewOptions(input, context.db),
		),
	join: sittingJoinRouter,
	createSitting: adminProcedure
		.input(CreateSittingInputSchema)
		.output(CreateSittingOutputSchema)
		.handler(async ({ input, context }) => {
			const sitting = await createSitting(
				input,
				context.db,
				context.session.user.id,
			);
			revalidateSittingIsr(context, sitting.slug);
			return sitting;
		}),
	submitPollVotes: notBannedProcedure
		.use(checkAchievementsAfter("votes"))
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
			await evaluateSittingMembersAchievements(context.db, result.slug);
			revalidateSittingIsr(context, result.slug);
			// The chosen book's status changes with the phase, so its pages and the
			// catalog need refreshing too.
			if (result.selectedBook) {
				revalidateBookIsr(context, result.selectedBook.slug);
			}
			revalidateBooksCatalogIsr(context);
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
		.use(checkAchievementsAfter("sittings"))
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
			const result = await addSittingParticipant(
				input,
				context.db,
				context.session.user.id,
			);
			revalidateSittingIsr(context, input.slug);
			return result;
		}),
	removeSittingParticipant: adminProcedure
		.input(RemoveSittingParticipantInputSchema)
		.output(SittingParticipantMutationOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await removeSittingParticipant(input, context.db);
			revalidateSittingIsr(context, input.slug);
			return result;
		}),
};
