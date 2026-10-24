import { notBannedProcedure, protectedProcedure } from "../../procedures";
import { revalidateUserShelvesIsr } from "../../revalidate-isr";
import {
	CancelInvitationInputSchema,
	GetInvitationInputSchema,
	GetInvitationOutputSchema,
	InviteCollaboratorInputSchema,
	InviteCollaboratorOutputSchema,
	LeaveShelfInputSchema,
	ListCollaboratorsInputSchema,
	ListCollaboratorsOutputSchema,
	ListMyInvitationsOutputSchema,
	ListShelfActivityInputSchema,
	ListShelfActivityOutputSchema,
	OkSchema,
	RemoveCollaboratorInputSchema,
	RespondToInvitationInputSchema,
	RespondToInvitationOutputSchema,
	SearchInvitableInputSchema,
	SearchInvitableOutputSchema,
	ShelfInvitePreferenceSchema,
	TransferShelfInputSchema,
	TransferShelfOutputSchema,
	UpdateCollaboratorInputSchema,
} from "./shelf-collab.schema";
import {
	cancelInvitation,
	getInvitationByToken,
	getShelfInvitePreference,
	inviteCollaborator,
	leaveShelf,
	listCollaborators,
	listMyInvitations,
	listShelfActivity,
	removeCollaborator,
	respondToInvitation,
	searchInvitableMembers,
	setShelfInvitePreference,
	transferShelfOwnership,
	updateCollaboratorPermissions,
} from "./shelf-collab.service";

export const shelfCollabRouter = {
	searchInvitable: notBannedProcedure
		.input(SearchInvitableInputSchema)
		.output(SearchInvitableOutputSchema)
		.handler(({ input, context }) =>
			searchInvitableMembers(input, context.session.user.id, context.db),
		),
	invite: notBannedProcedure
		.input(InviteCollaboratorInputSchema)
		.output(InviteCollaboratorOutputSchema)
		.handler(({ input, context }) =>
			inviteCollaborator(input, context.session.user.id, context.db),
		),
	getInvitation: protectedProcedure
		.input(GetInvitationInputSchema)
		.output(GetInvitationOutputSchema)
		.handler(({ input, context }) =>
			getInvitationByToken(input.token, context.session.user.id, context.db),
		),
	myInvitations: protectedProcedure
		.output(ListMyInvitationsOutputSchema)
		.handler(({ context }) =>
			listMyInvitations(context.session.user.id, context.db),
		),
	respond: notBannedProcedure
		.input(RespondToInvitationInputSchema)
		.output(RespondToInvitationOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await respondToInvitation(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(context, result.ownerUsername, result.shelfSlug);
			revalidateUserShelvesIsr(context, context.session.user.username);
			return result;
		}),
	cancelInvitation: notBannedProcedure
		.input(CancelInvitationInputSchema)
		.output(OkSchema)
		.handler(({ input, context }) =>
			cancelInvitation(input.invitationId, context.session.user.id, context.db),
		),
	list: protectedProcedure
		.input(ListCollaboratorsInputSchema)
		.output(ListCollaboratorsOutputSchema)
		.handler(({ input, context }) =>
			listCollaborators(input, context.session.user.id, context.db),
		),
	updatePermissions: notBannedProcedure
		.input(UpdateCollaboratorInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			const result = await updateCollaboratorPermissions(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				input.ownerUsername ?? context.session.user.username,
				input.shelfSlug,
			);
			return result;
		}),
	remove: notBannedProcedure
		.input(RemoveCollaboratorInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			const { ok } = await removeCollaborator(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				input.ownerUsername ?? context.session.user.username,
				input.shelfSlug,
			);
			revalidateUserShelvesIsr(context, input.username);
			return { ok };
		}),
	leave: notBannedProcedure
		.input(LeaveShelfInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			const result = await leaveShelf(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				input.ownerUsername ?? context.session.user.username,
				input.shelfSlug,
			);
			revalidateUserShelvesIsr(context, context.session.user.username);
			return result;
		}),
	transferOwnership: notBannedProcedure
		.input(TransferShelfInputSchema)
		.output(TransferShelfOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await transferShelfOwnership(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(context, context.session.user.username);
			revalidateUserShelvesIsr(context, result.ownerUsername, result.shelfSlug);
			return result;
		}),
	activity: protectedProcedure
		.input(ListShelfActivityInputSchema)
		.output(ListShelfActivityOutputSchema)
		.handler(({ input, context }) =>
			listShelfActivity(input, context.session.user.id, context.db),
		),
	getInvitePreference: protectedProcedure
		.output(ShelfInvitePreferenceSchema)
		.handler(({ context }) =>
			getShelfInvitePreference(context.session.user.id, context.db),
		),
	setInvitePreference: protectedProcedure
		.input(ShelfInvitePreferenceSchema)
		.output(ShelfInvitePreferenceSchema)
		.handler(({ input, context }) =>
			setShelfInvitePreference(
				input.allowInvites,
				context.session.user.id,
				context.db,
			),
		),
};
