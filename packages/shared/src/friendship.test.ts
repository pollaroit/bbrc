import { describe, expect, test } from "bun:test";
import {
	acceptsFriendsAutomatically,
	checkFriendRequest,
	declineCooldownEnds,
	FRIEND_LIMITS,
	type FriendRequestFacts,
	friendPair,
	pendingExpiryCutoff,
} from "./friendship";

const now = new Date("2026-11-12T12:00:00Z");
const base: FriendRequestFacts = {
	isSelf: false,
	unavailable: false,
	blocked: false,
	state: "none",
	lastDeclinedAt: null,
	requestsInLastDay: 0,
	pendingOutgoing: 0,
	now,
};

describe("friendPair", () => {
	test("the same pair in either order gives the same rows", () => {
		expect(friendPair("b", "a")).toEqual({ lowId: "a", highId: "b" });
		expect(friendPair("a", "b")).toEqual({ lowId: "a", highId: "b" });
	});
});

describe("checkFriendRequest", () => {
	test("a normal request is sent", () => {
		expect(checkFriendRequest(base)).toEqual({ ok: true, action: "send" });
	});

	test("you cannot add yourself, a blocked or unavailable member", () => {
		expect(checkFriendRequest({ ...base, isSelf: true })).toEqual({
			ok: false,
			reason: "self",
		});
		expect(checkFriendRequest({ ...base, blocked: true })).toEqual({
			ok: false,
			reason: "blocked",
		});
		expect(checkFriendRequest({ ...base, unavailable: true })).toEqual({
			ok: false,
			reason: "unavailable",
		});
	});

	test("friends and requests already sent are refused", () => {
		expect(checkFriendRequest({ ...base, state: "friends" })).toEqual({
			ok: false,
			reason: "already_friends",
		});
		expect(checkFriendRequest({ ...base, state: "request_sent" })).toEqual({
			ok: false,
			reason: "already_requested",
		});
	});

	test("asking someone who already asked you is saying yes", () => {
		expect(checkFriendRequest({ ...base, state: "request_received" })).toEqual({
			ok: true,
			action: "accept_theirs",
		});
	});

	test("a decline blocks a new request for 14 days, then not", () => {
		const declinedAt = new Date(now.getTime() - 13 * 24 * 3600_000);
		expect(checkFriendRequest({ ...base, lastDeclinedAt: declinedAt })).toEqual(
			{ ok: false, reason: "cooldown" },
		);
		const older = new Date(now.getTime() - 15 * 24 * 3600_000);
		expect(checkFriendRequest({ ...base, lastDeclinedAt: older })).toEqual({
			ok: true,
			action: "send",
		});
	});

	test("the daily and the pending limits", () => {
		expect(
			checkFriendRequest({
				...base,
				requestsInLastDay: FRIEND_LIMITS.maxRequestsPerDay,
			}),
		).toEqual({ ok: false, reason: "daily_limit" });
		expect(
			checkFriendRequest({
				...base,
				pendingOutgoing: FRIEND_LIMITS.maxPendingOutgoing,
			}),
		).toEqual({ ok: false, reason: "pending_limit" });
		expect(
			checkFriendRequest({
				...base,
				requestsInLastDay: FRIEND_LIMITS.maxRequestsPerDay - 1,
				pendingOutgoing: FRIEND_LIMITS.maxPendingOutgoing - 1,
			}),
		).toEqual({ ok: true, action: "send" });
	});

	test("a block hides behind the same wording as an unavailable member", async () => {
		const { FRIEND_REFUSAL_MESSAGES } = await import("./friendship");
		expect(FRIEND_REFUSAL_MESSAGES.blocked).toBe(
			FRIEND_REFUSAL_MESSAGES.unavailable,
		);
	});
});

describe("dates and auto-accept", () => {
	test("the cooldown ends 14 days after the decline", () => {
		const declined = new Date("2026-11-01T00:00:00Z");
		expect(declineCooldownEnds(declined).toISOString()).toBe(
			"2026-11-15T00:00:00.000Z",
		);
	});

	test("pending requests expire after 90 days", () => {
		expect(pendingExpiryCutoff(now).toISOString()).toBe(
			"2026-08-14T12:00:00.000Z",
		);
	});

	test("auto-accept needs the setting and a public profile", () => {
		expect(
			acceptsFriendsAutomatically({
				autoAcceptFriends: true,
				profileVisibility: "public",
			}),
		).toBe(true);
		expect(
			acceptsFriendsAutomatically({
				autoAcceptFriends: true,
				profileVisibility: "private",
			}),
		).toBe(false);
		expect(
			acceptsFriendsAutomatically({
				autoAcceptFriends: false,
				profileVisibility: "public",
			}),
		).toBe(false);
	});
});
