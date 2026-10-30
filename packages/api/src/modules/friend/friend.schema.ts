import type { z } from "zod";
import zod from "zod";

const Username = zod.string().min(3).max(20);

export const FriendUsernameInputSchema = zod.object({ username: Username });
export const OkSchema = zod.object({ ok: zod.literal(true) });

export const FriendMemberSchema = zod.object({
	username: zod.string(),
	name: zod.string(),
	image: zod.string().nullable(),
	/** A private profile: the name and avatar still show, the rest is closed. */
	isPrivate: zod.boolean(),
});

/** How the signed-in viewer stands to a member, for the friend button. */
export const FriendStateSchema = zod.enum([
	"self",
	"none",
	"friends",
	"request_sent",
	"request_received",
	"blocked",
	"unavailable",
]);

export const GetFriendStateOutputSchema = zod.object({
	state: FriendStateSchema,
	/** Always visible, even on a private profile. */
	friendCount: zod.number().int().min(0),
	/** The member accepts requests at once. */
	autoAccepts: zod.boolean(),
});

export const SendFriendRequestOutputSchema = zod.object({
	/** `friends` when it was accepted at once (auto-accept, or they had already asked). */
	state: zod.enum(["request_sent", "friends"]),
});

export const ListFriendsInputSchema = zod.object({
	username: Username.optional(),
	limit: zod.number().int().min(1).max(100).default(50),
	cursor: zod.string().optional(),
});

export const ListFriendsOutputSchema = zod.object({
	/** False when the viewer may only see the count. */
	visible: zod.boolean(),
	count: zod.number().int().min(0),
	items: zod.array(FriendMemberSchema.extend({ since: zod.coerce.date() })),
	nextCursor: zod.string().nullable(),
});

export const FriendRequestItemSchema = FriendMemberSchema.extend({
	sentAt: zod.coerce.date(),
});

export const ListFriendRequestsOutputSchema = zod.object({
	incoming: zod.array(FriendRequestItemSchema),
	outgoing: zod.array(FriendRequestItemSchema),
});

export const ListBlockedOutputSchema = zod.object({
	items: zod.array(FriendMemberSchema.extend({ blockedAt: zod.coerce.date() })),
});

export const FriendBadgeOutputSchema = zod.object({
	incoming: zod.number().int().min(0),
});

export type FriendState = z.infer<typeof FriendStateSchema>;
export type FriendMember = z.infer<typeof FriendMemberSchema>;
