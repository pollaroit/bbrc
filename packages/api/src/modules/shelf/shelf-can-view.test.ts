import { describe, expect, test } from "bun:test";
import {
	ANONYMOUS_VIEWER,
	memberViewer,
	type ShelfPermission,
} from "@bbrc/shared";
import { canViewShelf } from "./shelf-can-view";

const OWNER = "owner";
const base = { status: "active", userId: OWNER } as const;
const stranger = memberViewer({ userId: "s", isAdmin: false });
const friend = memberViewer({
	userId: "f",
	isAdmin: false,
	friendIds: [OWNER],
});
const blocked = memberViewer({
	userId: "b",
	isAdmin: false,
	blockedIds: [OWNER],
});
const admin = memberViewer({ userId: "a", isAdmin: true });
const self = memberViewer({ userId: OWNER, isAdmin: false });

describe("canViewShelf", () => {
	test("public shelf of a public profile is open to everyone but blocked", () => {
		const shelf = { ...base, visibility: "public" as const };
		expect(canViewShelf(ANONYMOUS_VIEWER, shelf)).toBe(true);
		expect(canViewShelf(stranger, shelf)).toBe(true);
		expect(canViewShelf(friend, shelf)).toBe(true);
		expect(canViewShelf(blocked, shelf)).toBe(false);
	});

	test("private profile caps a public shelf at friends", () => {
		const shelf = {
			...base,
			visibility: "public" as const,
			ownerProfileVisibility: "private" as const,
		};
		expect(canViewShelf(ANONYMOUS_VIEWER, shelf)).toBe(false);
		expect(canViewShelf(stranger, shelf)).toBe(false);
		expect(canViewShelf(friend, shelf)).toBe(true);
	});

	test("friends and private levels", () => {
		const friends = { ...base, visibility: "friends" as const };
		expect(canViewShelf(stranger, friends)).toBe(false);
		expect(canViewShelf(friend, friends)).toBe(true);
		const priv = { ...base, visibility: "private" as const };
		expect(canViewShelf(friend, priv)).toBe(false);
		expect(canViewShelf(self, priv)).toBe(true);
		expect(canViewShelf(admin, priv)).toBe(true);
	});

	test("collaborators and invitees get past the level, even when blocked", () => {
		const priv = { ...base, visibility: "private" as const };
		expect(canViewShelf(stranger, priv, { isCollaborator: true })).toBe(true);
		expect(canViewShelf(blocked, priv, { isCollaborator: true })).toBe(true);
		expect(canViewShelf(stranger, priv, { hasPendingInvitation: true })).toBe(
			true,
		);
		expect(canViewShelf(ANONYMOUS_VIEWER, priv, { isCollaborator: true })).toBe(
			false,
		);
	});

	test("drafts need ownership, view_non_public or an invitation", () => {
		const draft = { ...base, status: "draft", visibility: "public" as const };
		expect(canViewShelf(stranger, draft)).toBe(false);
		expect(canViewShelf(self, draft)).toBe(true);
		const perms = new Set<ShelfPermission>(["view_non_public"]);
		expect(
			canViewShelf(stranger, draft, {
				isCollaborator: true,
				permissions: perms,
			}),
		).toBe(true);
		expect(canViewShelf(stranger, draft, { isCollaborator: true })).toBe(false);
		expect(canViewShelf(stranger, draft, { hasPendingInvitation: true })).toBe(
			true,
		);
		expect(canViewShelf(admin, draft)).toBe(true);
	});
});
