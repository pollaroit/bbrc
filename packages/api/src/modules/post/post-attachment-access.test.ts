import { describe, expect, test } from "bun:test";
import { ANONYMOUS_VIEWER, memberViewer } from "@bbrc/shared";
import { attachmentLocked } from "./post-attachment-access";

const owner = (extra = {}) => ({
	id: "owner",
	profileVisibility: "public" as const,
	...extra,
});

describe("attachmentLocked", () => {
	test("public things are open to everyone", () => {
		expect(attachmentLocked(ANONYMOUS_VIEWER, [owner()])).toBe(false);
	});
	test("a private profile locks strangers but not friends or the owner", () => {
		const o = owner({ profileVisibility: "private" });
		const stranger = memberViewer({ userId: "s", role: "user" });
		const friend = memberViewer({
			userId: "f",
			role: "user",
			friendIds: ["owner"],
		});
		expect(attachmentLocked(stranger, [o])).toBe(true);
		expect(attachmentLocked(friend, [o])).toBe(false);
		expect(
			attachmentLocked(memberViewer({ userId: "owner", role: "user" }), [o]),
		).toBe(false);
		expect(
			attachmentLocked(memberViewer({ userId: "a", role: "super_admin" }), [o]),
		).toBe(false);
	});
	test("a blocked pair is locked even for public things", () => {
		const blocked = memberViewer({
			userId: "b",
			role: "user",
			blockedIds: ["owner"],
		});
		expect(attachmentLocked(blocked, [owner()])).toBe(true);
	});
	test("every owner has to allow it", () => {
		const viewer = memberViewer({ userId: "s", role: "user" });
		expect(
			attachmentLocked(viewer, [owner(), owner({ id: "x", item: "friends" })]),
		).toBe(true);
	});
});
