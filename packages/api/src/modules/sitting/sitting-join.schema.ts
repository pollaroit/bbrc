import { UserSchema } from "@bbrc/schemas";
import {
	MAX_JOIN_UNTIL_PERCENT,
	MIN_JOIN_UNTIL_PERCENT,
	SITTING_JOIN_TYPES,
} from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

export const SittingJoinTypeSchema = zod.enum(SITTING_JOIN_TYPES);

export const SittingJoinConfigSchema = zod.object({
	joinType: SittingJoinTypeSchema,
	joinInVoting: zod.boolean(),
	joinInReading: zod.boolean(),
	joinReadingUntilPercent: zod
		.number()
		.int()
		.min(MIN_JOIN_UNTIL_PERCENT)
		.max(MAX_JOIN_UNTIL_PERCENT),
});

export type SittingJoinConfigInput = z.infer<typeof SittingJoinConfigSchema>;

/** Join settings for a new sitting; anything left out takes the default. */
export const CreateSittingJoinConfigSchema = SittingJoinConfigSchema.partial();

const slug = zod.string().min(1).max(160);

export const JoinWindowSchema = zod.object({
	open: zod.boolean(),
	reason: zod
		.enum([
			"finished",
			"voting_not_open_to_joins",
			"reading_not_open_to_joins",
			"reading_window_passed",
		])
		.nullable(),
	/** When self-joining stops, if it stops at a set time. */
	closesAt: zod.coerce.date().nullable(),
	message: zod.string().nullable(),
});

export const SittingMemberSchema = zod.object({
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: zod
		.string()
		.nullish()
		.transform((value) => value ?? null),
});

export const SittingJoinStateInputSchema = zod.object({ sittingSlug: slug });

export const SittingJoinStateOutputSchema = zod.object({
	sittingSlug: zod.string(),
	status: zod.enum(["voting", "reading", "finished"]),
	config: SittingJoinConfigSchema,
	window: JoinWindowSchema,
	participantCount: zod.number().int(),
	viewer: zod.object({
		signedIn: zod.boolean(),
		isParticipant: zod.boolean(),
		/** An organiser removed them, so they cannot rejoin by themselves. */
		removedByOrganiser: zod.boolean(),
		canManage: zod.boolean(),
		/** The Join button should show. */
		canJoin: zod.boolean(),
		/** Why they cannot join, in a sentence, when they cannot. */
		joinBlockedReason: zod.string().nullable(),
		/** Participants may leave while voting is open. */
		canLeave: zod.boolean(),
		pendingInvitationId: zod.string().nullable(),
	}),
});

export type SittingJoinState = z.infer<typeof SittingJoinStateOutputSchema>;

export const UpdateJoinConfigInputSchema = SittingJoinConfigSchema.extend({
	sittingSlug: slug,
});

export const JoinSittingInputSchema = zod.object({ sittingSlug: slug });

export const JoinSittingOutputSchema = zod.object({
	sittingSlug: zod.string(),
	alreadyParticipant: zod.boolean(),
});

export const OkSchema = zod.object({ ok: zod.literal(true) });

// ── Links ──────────────────────────────────────────────────────────────────

export const InviteLinkStateSchema = zod.enum([
	"active",
	"revoked",
	"expired",
	"exhausted",
]);

export const InviteLinkSchema = zod.object({
	id: zod.string(),
	token: zod.string(),
	label: zod.string().nullable(),
	createdAt: zod.coerce.date(),
	expiresAt: zod.coerce.date().nullable(),
	maxUses: zod.number().int().nullable(),
	uses: zod.number().int(),
	/** People who opened the link (once each), joined or not. */
	opens: zod.number().int(),
	revokedAt: zod.coerce.date().nullable(),
	state: InviteLinkStateSchema,
	createdBy: SittingMemberSchema.nullable(),
	/** Who joined with it, newest first. */
	joins: zod.array(SittingMemberSchema.extend({ joinedAt: zod.coerce.date() })),
});

export const ListInviteLinksInputSchema = zod.object({ sittingSlug: slug });
export const ListInviteLinksOutputSchema = zod.object({
	items: zod.array(InviteLinkSchema),
});

export const CreateInviteLinkInputSchema = zod.object({
	sittingSlug: slug,
	label: zod.string().trim().max(40).optional(),
	expiresAt: zod.coerce.date().nullish(),
	maxUses: zod.number().int().min(1).max(1000).nullish(),
});

export const RevokeInviteLinkInputSchema = zod.object({
	linkId: zod.string(),
});

const tokenInput = zod.object({ token: zod.string().min(10).max(200) });
export const InviteLinkPreviewInputSchema = tokenInput;
export const InviteLinkPreviewOutputSchema = zod.object({
	linkId: zod.string(),
	label: zod.string().nullable(),
	state: InviteLinkStateSchema,
	stateMessage: zod.string(),
	sitting: zod.object({
		slug: zod.string(),
		displayName: zod.string(),
		status: zod.enum(["voting", "reading", "finished"]),
		deadline: zod.coerce.date(),
		pollDeadline: zod.coerce.date().nullable(),
		participantCount: zod.number().int(),
		bookTitle: zod.string().nullable(),
		bookCoverId: zod.number().nullable(),
		bookAuthors: zod.array(zod.string()),
		bookPages: zod.number().int().nullable(),
		joinType: SittingJoinTypeSchema,
	}),
	window: JoinWindowSchema,
	/** Set once reading has started so the page can warn about the deadline. */
	readingWarning: zod.boolean(),
	viewer: zod.object({
		isParticipant: zod.boolean(),
		removedByOrganiser: zod.boolean(),
		banned: zod.boolean(),
	}),
	canJoin: zod.boolean(),
	joinBlockedReason: zod.string().nullable(),
});

export const InviteLinkOpenInputSchema = tokenInput;
export const InviteLinkJoinInputSchema = tokenInput;

// ── Invitations ────────────────────────────────────────────────────────────

export const SittingInvitationRowSchema = zod.object({
	id: zod.string(),
	createdAt: zod.coerce.date(),
	invitee: SittingMemberSchema,
	invitedBy: SittingMemberSchema.nullable(),
});

export const CreateSittingInvitationInputSchema = zod.object({
	sittingSlug: slug,
	username: UserSchema.shape.username,
});

export const CancelSittingInvitationInputSchema = zod.object({
	invitationId: zod.string(),
});

export const RespondSittingInvitationInputSchema = zod.object({
	invitationId: zod.string(),
	accept: zod.boolean(),
});

export const RespondSittingInvitationOutputSchema = zod.object({
	accepted: zod.boolean(),
	sittingSlug: zod.string(),
});

export const ListSittingInvitationsInputSchema = zod.object({
	sittingSlug: slug,
});
export const ListSittingInvitationsOutputSchema = zod.object({
	items: zod.array(SittingInvitationRowSchema),
});

export const MySittingInvitationsOutputSchema = zod.object({
	items: zod.array(
		zod.object({
			id: zod.string(),
			createdAt: zod.coerce.date(),
			sittingSlug: zod.string(),
			displayName: zod.string(),
			status: zod.enum(["voting", "reading", "finished"]),
			invitedBy: SittingMemberSchema.nullable(),
		}),
	),
});

// ── Finding members to add or invite ───────────────────────────────────────

export const SearchSittingMembersInputSchema = zod.object({
	sittingSlug: slug,
	query: zod.string().trim().min(1).max(60),
});

export const SittingMemberCandidateStateSchema = zod.enum([
	"can_add",
	"invite_only",
	"closed",
	"participant",
	"removed",
	"invited",
	"banned",
]);

export const SearchSittingMembersOutputSchema = zod.object({
	items: zod.array(
		SittingMemberSchema.extend({
			userId: zod.string(),
			state: SittingMemberCandidateStateSchema,
		}),
	),
});

// ── How people joined (participants page) ──────────────────────────────────

export const ParticipantJoinInfoInputSchema = zod.object({
	sittingSlug: slug,
});

export const ParticipantJoinInfoOutputSchema = zod.object({
	items: zod.array(
		zod.object({
			username: UserSchema.shape.username,
			joinedAt: zod.coerce.date(),
			source: zod.enum(["organiser", "button", "link", "invitation"]),
			linkLabel: zod.string().nullable(),
		}),
	),
});

// ── Preferences ────────────────────────────────────────────────────────────

export const SittingJoinPreferencesSchema = zod.object({
	allowAutoAdd: zod.boolean(),
	allowInvites: zod.boolean(),
});

export type InviteLinkPreview = z.infer<typeof InviteLinkPreviewOutputSchema>;
export type MySittingInvitations = z.infer<
	typeof MySittingInvitationsOutputSchema
>;
export type ParticipantJoinInfo = z.infer<
	typeof ParticipantJoinInfoOutputSchema
>;
export type InviteLinkList = z.infer<typeof ListInviteLinksOutputSchema>;
export type SearchSittingMembersOutput = z.infer<
	typeof SearchSittingMembersOutputSchema
>;
