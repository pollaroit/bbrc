/*
 * The rules of friend requests, pure so they are tested without a database.
 * The service gathers the facts and asks `checkFriendRequest` what to do.
 */

export const FRIEND_LIMITS = {
	maxPendingOutgoing: 20,
	maxRequestsPerDay: 30,
	declineCooldownDays: 14,
	/** Pending requests nobody answered are removed after this long (daily sweep). */
	pendingExpiryDays: 90,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A pair of members in a fixed order: one friendship row per pair. Compared by
 * UTF-16 code units, which for ids is the same as the database's byte order (`COLLATE "C"`).
 */
export function friendPair(
	a: string,
	b: string,
): { lowId: string; highId: string } {
	return a < b ? { lowId: a, highId: b } : { lowId: b, highId: a };
}

export type FriendRelationState =
	| "none"
	| "friends"
	| "request_sent"
	| "request_received";

export type FriendRequestRefusal =
	| "self"
	| "unavailable"
	| "blocked"
	| "already_friends"
	| "already_requested"
	| "cooldown"
	| "daily_limit"
	| "pending_limit";

export type FriendRequestFacts = {
	isSelf: boolean;
	/** The other member is banned, missing, or the sender is banned. */
	unavailable: boolean;
	/** Either of them blocked the other. */
	blocked: boolean;
	state: FriendRelationState;
	/** When the other member last declined this sender; null if never. */
	lastDeclinedAt: Date | null;
	requestsInLastDay: number;
	pendingOutgoing: number;
	now: Date;
};

export type FriendRequestDecision =
	| { ok: true; action: "send" | "accept_theirs" }
	| { ok: false; reason: FriendRequestRefusal };

export function declineCooldownEnds(declinedAt: Date): Date {
	return new Date(
		declinedAt.getTime() + FRIEND_LIMITS.declineCooldownDays * DAY_MS,
	);
}

/** What happens when a member asks to be friends. The order of the checks is the order of the messages. */
export function checkFriendRequest(
	facts: FriendRequestFacts,
): FriendRequestDecision {
	if (facts.isSelf) return { ok: false, reason: "self" };
	if (facts.unavailable) return { ok: false, reason: "unavailable" };
	if (facts.blocked) return { ok: false, reason: "blocked" };
	if (facts.state === "friends")
		return { ok: false, reason: "already_friends" };
	if (facts.state === "request_sent") {
		return { ok: false, reason: "already_requested" };
	}
	// They already asked us: asking back is saying yes.
	if (facts.state === "request_received") {
		return { ok: true, action: "accept_theirs" };
	}
	if (
		facts.lastDeclinedAt &&
		declineCooldownEnds(facts.lastDeclinedAt).getTime() > facts.now.getTime()
	) {
		return { ok: false, reason: "cooldown" };
	}
	if (facts.requestsInLastDay >= FRIEND_LIMITS.maxRequestsPerDay) {
		return { ok: false, reason: "daily_limit" };
	}
	if (facts.pendingOutgoing >= FRIEND_LIMITS.maxPendingOutgoing) {
		return { ok: false, reason: "pending_limit" };
	}
	return { ok: true, action: "send" };
}

/**
 * What the sender is told. Deliberately vague about blocks and unavailable
 * members, so nobody can tell that they were blocked.
 */
export const FRIEND_REFUSAL_MESSAGES: Record<FriendRequestRefusal, string> = {
	self: "You cannot add yourself.",
	unavailable: "This member cannot receive friend requests.",
	blocked: "This member cannot receive friend requests.",
	already_friends: "You are already friends.",
	already_requested: "You already sent a request. Wait for them to answer.",
	cooldown: "You cannot ask this member again yet. Try again later.",
	daily_limit: "You have sent a lot of requests today. Try again tomorrow.",
	pending_limit: `You have ${FRIEND_LIMITS.maxPendingOutgoing} requests waiting. Cancel one or wait for an answer.`,
};

/** A request nobody answered for long enough is removed. */
export function pendingExpiryCutoff(now: Date): Date {
	return new Date(now.getTime() - FRIEND_LIMITS.pendingExpiryDays * DAY_MS);
}

/** Auto-accept only ever applies to a public profile. */
export function acceptsFriendsAutomatically(input: {
	autoAcceptFriends: boolean;
	profileVisibility: "public" | "private";
}): boolean {
	return input.autoAcceptFriends && input.profileVisibility === "public";
}
