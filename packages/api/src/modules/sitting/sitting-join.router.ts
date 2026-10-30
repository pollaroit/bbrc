import { protectedProcedure, publicProcedure } from "../../procedures";
import { revalidateSittingIsr } from "../../revalidate-isr";
import { loadViewer } from "../visibility/viewer";
import {
	CancelSittingInvitationInputSchema,
	CreateInviteLinkInputSchema,
	CreateSittingInvitationInputSchema,
	InviteLinkJoinInputSchema,
	InviteLinkOpenInputSchema,
	InviteLinkPreviewInputSchema,
	InviteLinkPreviewOutputSchema,
	JoinSittingInputSchema,
	JoinSittingOutputSchema,
	ListInviteLinksInputSchema,
	ListInviteLinksOutputSchema,
	ListSittingInvitationsInputSchema,
	ListSittingInvitationsOutputSchema,
	MySittingInvitationsOutputSchema,
	OkSchema,
	ParticipantJoinInfoInputSchema,
	ParticipantJoinInfoOutputSchema,
	RespondSittingInvitationInputSchema,
	RespondSittingInvitationOutputSchema,
	RevokeInviteLinkInputSchema,
	SearchSittingMembersInputSchema,
	SearchSittingMembersOutputSchema,
	SittingJoinPreferencesSchema,
	SittingJoinStateInputSchema,
	SittingJoinStateOutputSchema,
	UpdateJoinConfigInputSchema,
} from "./sitting-join.schema";
import {
	actorFromSession,
	cancelSittingInvitation,
	createInviteLink,
	createSittingInvitation,
	getJoinPreferences,
	getJoinState,
	joinSitting,
	joinWithInviteLink,
	leaveSitting,
	listInviteLinks,
	listSittingInvitations,
	mySittingInvitations,
	participantJoinInfo,
	previewInviteLink,
	recordInviteLinkOpen,
	respondToSittingInvitation,
	revokeInviteLink,
	searchSittingMembers,
	setJoinPreferences,
	updateJoinConfig,
} from "./sitting-join.service";

export const sittingJoinRouter = {
	state: publicProcedure
		.input(SittingJoinStateInputSchema)
		.output(SittingJoinStateOutputSchema)
		.handler(async ({ input, context }) =>
			getJoinState(
				context.db,
				input.sittingSlug,
				await loadViewer(context.db, context.session),
			),
		),
	updateConfig: protectedProcedure
		.input(UpdateJoinConfigInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			const { sittingSlug, ...config } = input;
			const result = await updateJoinConfig(
				context.db,
				sittingSlug,
				config,
				actorFromSession(context.session),
			);
			revalidateSittingIsr(context, sittingSlug);
			return result;
		}),
	join: protectedProcedure
		.input(JoinSittingInputSchema)
		.output(JoinSittingOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await joinSitting(
				context.db,
				input.sittingSlug,
				actorFromSession(context.session),
			);
			revalidateSittingIsr(context, input.sittingSlug);
			return result;
		}),
	leave: protectedProcedure
		.input(JoinSittingInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			const result = await leaveSitting(
				context.db,
				input.sittingSlug,
				actorFromSession(context.session),
			);
			revalidateSittingIsr(context, input.sittingSlug);
			return result;
		}),

	links: {
		list: protectedProcedure
			.input(ListInviteLinksInputSchema)
			.output(ListInviteLinksOutputSchema)
			.handler(({ input, context }) =>
				listInviteLinks(
					context.db,
					input.sittingSlug,
					actorFromSession(context.session),
				),
			),
		create: protectedProcedure
			.input(CreateInviteLinkInputSchema)
			.output(OkSchema)
			.handler(async ({ input, context }) => {
				await createInviteLink(
					context.db,
					input,
					actorFromSession(context.session),
				);
				return { ok: true as const };
			}),
		revoke: protectedProcedure
			.input(RevokeInviteLinkInputSchema)
			.output(OkSchema)
			.handler(({ input, context }) =>
				revokeInviteLink(
					context.db,
					input.linkId,
					actorFromSession(context.session),
				),
			),
		preview: protectedProcedure
			.input(InviteLinkPreviewInputSchema)
			.output(InviteLinkPreviewOutputSchema)
			.handler(({ input, context }) =>
				previewInviteLink(
					context.db,
					input.token,
					actorFromSession(context.session),
				),
			),
		open: protectedProcedure
			.input(InviteLinkOpenInputSchema)
			.output(OkSchema)
			.handler(({ input, context }) =>
				recordInviteLinkOpen(
					context.db,
					input.token,
					actorFromSession(context.session),
				),
			),
		join: protectedProcedure
			.input(InviteLinkJoinInputSchema)
			.output(JoinSittingOutputSchema)
			.handler(async ({ input, context }) => {
				const result = await joinWithInviteLink(
					context.db,
					input.token,
					actorFromSession(context.session),
				);
				revalidateSittingIsr(context, result.sittingSlug);
				return result;
			}),
	},

	invitations: {
		create: protectedProcedure
			.input(CreateSittingInvitationInputSchema)
			.output(OkSchema)
			.handler(async ({ input, context }) => {
				await createSittingInvitation(
					context.db,
					input,
					actorFromSession(context.session),
				);
				return { ok: true as const };
			}),
		cancel: protectedProcedure
			.input(CancelSittingInvitationInputSchema)
			.output(OkSchema)
			.handler(({ input, context }) =>
				cancelSittingInvitation(
					context.db,
					input.invitationId,
					actorFromSession(context.session),
				),
			),
		respond: protectedProcedure
			.input(RespondSittingInvitationInputSchema)
			.output(RespondSittingInvitationOutputSchema)
			.handler(async ({ input, context }) => {
				const result = await respondToSittingInvitation(
					context.db,
					input,
					actorFromSession(context.session),
				);
				revalidateSittingIsr(context, result.sittingSlug);
				return result;
			}),
		forSitting: protectedProcedure
			.input(ListSittingInvitationsInputSchema)
			.output(ListSittingInvitationsOutputSchema)
			.handler(({ input, context }) =>
				listSittingInvitations(
					context.db,
					input.sittingSlug,
					actorFromSession(context.session),
				),
			),
		mine: protectedProcedure
			.output(MySittingInvitationsOutputSchema)
			.handler(({ context }) =>
				mySittingInvitations(context.db, actorFromSession(context.session)),
			),
	},

	searchMembers: protectedProcedure
		.input(SearchSittingMembersInputSchema)
		.output(SearchSittingMembersOutputSchema)
		.handler(({ input, context }) =>
			searchSittingMembers(
				context.db,
				input,
				actorFromSession(context.session),
			),
		),
	participantJoinInfo: protectedProcedure
		.input(ParticipantJoinInfoInputSchema)
		.output(ParticipantJoinInfoOutputSchema)
		.handler(({ input, context }) =>
			participantJoinInfo(
				context.db,
				input.sittingSlug,
				actorFromSession(context.session),
			),
		),

	preferences: {
		get: protectedProcedure
			.output(SittingJoinPreferencesSchema)
			.handler(({ context }) =>
				getJoinPreferences(context.db, context.session.user.id),
			),
		set: protectedProcedure
			.input(SittingJoinPreferencesSchema)
			.output(SittingJoinPreferencesSchema)
			.handler(({ input, context }) =>
				setJoinPreferences(context.db, context.session.user.id, input),
			),
	},
};
