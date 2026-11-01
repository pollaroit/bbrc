import { describe, expect, test } from "bun:test";
import { ANONYMOUS_VIEWER, memberViewer } from "@bbrc/shared";
import { entryForViewer } from "./leaderboard.service";

const row = {
	id: "p",
	profileVisibility: "private",
	rank: 3,
	username: "secret",
	name: "Secret Reader",
	image: "x.png",
	role: "user",
	metric: 42,
	anonymous: false,
	isPrivate: true,
	isViewer: false,
};

describe("entryForViewer", () => {
	test("strangers get rank and points but no identity", () => {
		for (const viewer of [
			ANONYMOUS_VIEWER,
			memberViewer({ userId: "me", role: "user" }),
		]) {
			const entry = entryForViewer(row, viewer);
			expect(entry.rank).toBe(3);
			expect(entry.metric).toBe(42);
			expect(entry.anonymous).toBe(true);
			expect(entry.name).toBe("");
			expect(entry.username).toBe("");
			expect(entry.image).toBeNull();
		}
	});

	test("friends, self and admins get the named row", () => {
		const friend = memberViewer({
			userId: "me",
			role: "user",
			friendIds: ["p"],
		});
		expect(entryForViewer(row, friend).name).toBe("Secret Reader");
		const self = entryForViewer(
			row,
			memberViewer({ userId: "p", role: "user" }),
		);
		expect(self.name).toBe("Secret Reader");
		expect(self.isViewer).toBe(true);
		expect(
			entryForViewer(row, memberViewer({ userId: "a", role: "super_admin" }))
				.anonymous,
		).toBe(false);
	});

	test("public members are always named", () => {
		const entry = entryForViewer(
			{ ...row, profileVisibility: "public", isPrivate: false },
			ANONYMOUS_VIEWER,
		);
		expect(entry.anonymous).toBe(false);
	});
});
