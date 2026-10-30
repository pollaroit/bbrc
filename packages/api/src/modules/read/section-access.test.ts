import { describe, expect, test } from "bun:test";
import { ANONYMOUS_VIEWER, memberViewer } from "@bbrc/shared";
import { type OwnerPrivacy, viewerMaySeeSection } from "./section-access";

const open: OwnerPrivacy = {
	profile: "public",
	sections: {
		reads: "public",
		reviews: "friends",
		favorites: "private",
		goals: "public",
		reading: "public",
	},
};
const privateProfile: OwnerPrivacy = { ...open, profile: "private" };

describe("viewerMaySeeSection", () => {
	const friend = memberViewer({
		userId: "f",
		isAdmin: false,
		friendIds: ["o"],
	});
	const stranger = memberViewer({ userId: "s", isAdmin: false });
	const blocked = memberViewer({
		userId: "b",
		isAdmin: false,
		blockedIds: ["o"],
	});
	test("public section is open to anonymous", () => {
		expect(viewerMaySeeSection(ANONYMOUS_VIEWER, "o", open, "reads")).toBe(
			true,
		);
	});
	test("friends section needs a friend", () => {
		expect(viewerMaySeeSection(stranger, "o", open, "reviews")).toBe(false);
		expect(viewerMaySeeSection(friend, "o", open, "reviews")).toBe(true);
	});
	test("private profile caps public sections at friends", () => {
		expect(viewerMaySeeSection(stranger, "o", privateProfile, "reads")).toBe(
			false,
		);
		expect(viewerMaySeeSection(friend, "o", privateProfile, "reads")).toBe(
			true,
		);
	});
	test("blocked never sees, owner always does", () => {
		expect(viewerMaySeeSection(blocked, "o", open, "reads")).toBe(false);
		const owner = memberViewer({ userId: "o", isAdmin: false });
		expect(viewerMaySeeSection(owner, "o", open, "favorites")).toBe(true);
	});
});
