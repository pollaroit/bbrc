import { describe, expect, test } from "bun:test";
import {
	ANONYMOUS_VIEWER,
	memberViewer,
	type ProfileVisibility,
	type Visibility,
	visibleStatsSections,
} from "@bbrc/shared";
import type { ActivityOwner } from "../reading-activity/reading-activity-access";
import { decideMemberStatsAccess } from "./member-stats-access";

function owner(over: Partial<ActivityOwner> = {}): ActivityOwner {
	return {
		id: "owner",
		profileVisibility: "public" as ProfileVisibility,
		readsVisibility: "public" as Visibility,
		reviewsVisibility: "public" as Visibility,
		favoritesVisibility: "public" as Visibility,
		goalsVisibility: "public" as Visibility,
		readingVisibility: "public" as Visibility,
		readingActivityVisibility: "public" as Visibility,
		bookmarksVisibility: "public" as Visibility,
		showReadingProgress: true,
		...over,
	};
}

const stranger = memberViewer({ userId: "stranger", role: "user" });
const friend = memberViewer({
	userId: "friend",
	role: "user",
	friendIds: ["owner"],
});
const self = memberViewer({ userId: "owner", role: "user" });
const admin = memberViewer({ userId: "admin", role: "super_admin" });

function accessOf(
	viewer: Parameters<typeof decideMemberStatsAccess>[0],
	o = owner(),
) {
	const decision = decideMemberStatsAccess(viewer, o);
	if (decision.kind !== "open")
		throw new Error(`expected open, got ${decision.kind}`);
	return decision.access;
}

describe("decideMemberStatsAccess", () => {
	test("a blocked viewer finds nobody", () => {
		const blocked = memberViewer({
			userId: "stranger",
			role: "user",
			blockedIds: ["owner"],
		});
		expect(decideMemberStatsAccess(blocked, owner()).kind).toBe("unavailable");
	});

	test("a private profile is closed to everyone who is not a friend", () => {
		const o = owner({ profileVisibility: "private" });
		expect(decideMemberStatsAccess(stranger, o).kind).toBe("closed");
		expect(decideMemberStatsAccess(ANONYMOUS_VIEWER, o).kind).toBe("closed");
		expect(decideMemberStatsAccess(friend, o).kind).toBe("open");
	});

	test("a public profile with everything public shows every section", () => {
		const access = accessOf(stranger);
		expect(access).toEqual({
			profile: true,
			reads: true,
			reviews: true,
			readingActivity: true,
			goals: true,
		});
		expect(visibleStatsSections(access).length).toBeGreaterThan(10);
	});

	test("closed reviews hide the rating sections but not the reads", () => {
		const access = accessOf(stranger, owner({ reviewsVisibility: "private" }));
		expect(access.reads).toBe(true);
		expect(access.reviews).toBe(false);
		const ids = visibleStatsSections(access).map((section) => section.id);
		// The rating sections are exactly where a rating used to leak.
		expect(ids).not.toContain("rated-vs-club");
		expect(ids).not.toContain("reviews");
		expect(ids).toContain("authors");
	});

	test("friends-only reads open for a friend and not for a stranger", () => {
		const o = owner({ readsVisibility: "friends" });
		expect(accessOf(friend, o).reads).toBe(true);
		expect(accessOf(stranger, o).reads).toBe(false);
		expect(accessOf(ANONYMOUS_VIEWER, o).reads).toBe(false);
	});

	test("goals follow the goals level", () => {
		const o = owner({ goalsVisibility: "private" });
		expect(accessOf(stranger, o).goals).toBe(false);
		expect(accessOf(self, o).goals).toBe(true);
	});

	test("reading activity keeps its five totals even when the section is closed", () => {
		const o = owner({ readingActivityVisibility: "private" });
		const decision = decideMemberStatsAccess(stranger, o);
		expect(decision.kind).toBe("open");
		if (decision.kind === "open") {
			expect(decision.activity.kind).toBe("numbers");
			expect(decision.access.readingActivity).toBe(true);
		}
	});

	test("the member and a super admin see every section", () => {
		const closed = owner({
			readsVisibility: "private",
			reviewsVisibility: "private",
			goalsVisibility: "private",
			readingActivityVisibility: "private",
		});
		for (const viewer of [self, admin]) {
			const access = accessOf(viewer, closed);
			expect(Object.values(access).every(Boolean)).toBe(true);
		}
	});
});
