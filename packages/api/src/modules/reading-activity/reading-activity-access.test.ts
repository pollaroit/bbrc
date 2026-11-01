import { describe, expect, test } from "bun:test";
import {
	ANONYMOUS_VIEWER,
	memberViewer,
	type ProfileVisibility,
	type Visibility,
} from "@bbrc/shared";
import {
	type ActivityOwner,
	decideActivityAccess,
} from "./reading-activity-access";

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
		showReadingProgress: true,
		...over,
	};
}

const stranger = memberViewer({ userId: "stranger", isAdmin: false });
const friend = memberViewer({
	userId: "friend",
	isAdmin: false,
	friendIds: ["owner"],
});
const admin = memberViewer({ userId: "admin", isAdmin: true });
const self = memberViewer({ userId: "owner", isAdmin: false });

describe("reading activity access", () => {
	test("blocked reads as unavailable", () => {
		const blocked = memberViewer({
			userId: "stranger",
			isAdmin: false,
			blockedIds: ["owner"],
		});
		expect(decideActivityAccess(blocked, owner()).kind).toBe("unavailable");
	});

	test("a private profile is closed to non-friends, whatever the section says", () => {
		const o = owner({ profileVisibility: "private" });
		expect(decideActivityAccess(stranger, o).kind).toBe("closed");
		expect(decideActivityAccess(ANONYMOUS_VIEWER, o).kind).toBe("closed");
	});

	test("a closed section on a public profile gives numbers only", () => {
		const o = owner({ readingActivityVisibility: "private" });
		expect(decideActivityAccess(stranger, o).kind).toBe("numbers");
		expect(decideActivityAccess(ANONYMOUS_VIEWER, o).kind).toBe("numbers");
	});

	test("friends level opens it to friends only", () => {
		const o = owner({ readingActivityVisibility: "friends" });
		expect(decideActivityAccess(friend, o).kind).toBe("full");
		expect(decideActivityAccess(stranger, o).kind).toBe("numbers");
	});

	test("a private profile still opens to a friend", () => {
		const o = owner({
			profileVisibility: "private",
			readingActivityVisibility: "friends",
		});
		expect(decideActivityAccess(friend, o).kind).toBe("full");
	});

	test("the member and admins get everything, even when it is Only me", () => {
		const o = owner({ readingActivityVisibility: "private" });
		const mine = decideActivityAccess(self, o);
		expect(mine).toMatchObject({ kind: "full", isOwner: true });
		const theirs = decideActivityAccess(admin, o);
		expect(theirs).toMatchObject({ kind: "full", isOwner: false });
		if (mine.kind === "full") {
			expect(mine.scope).toEqual({ progress: true, clock: true, finish: true });
		}
		if (theirs.kind === "full") {
			expect(theirs.scope).toEqual({
				progress: true,
				clock: true,
				finish: true,
			});
		}
	});

	test("others never get clock times", () => {
		const a = decideActivityAccess(stranger, owner());
		expect(a.kind === "full" && a.scope.clock).toBe(false);
	});

	test("progress follows the member's switch", () => {
		const off = decideActivityAccess(
			stranger,
			owner({ showReadingProgress: false }),
		);
		expect(off.kind === "full" && off.scope.progress).toBe(false);
		const on = decideActivityAccess(stranger, owner());
		expect(on.kind === "full" && on.scope.progress).toBe(true);
	});

	test("a finished book is shown only to someone who may see Reads", () => {
		const hidden = decideActivityAccess(
			stranger,
			owner({ readsVisibility: "private" }),
		);
		expect(hidden.kind === "full" && hidden.scope.finish).toBe(false);
		const shown = decideActivityAccess(stranger, owner());
		expect(shown.kind === "full" && shown.scope.finish).toBe(true);
		const friendsReads = owner({ readsVisibility: "friends" });
		const asFriend = decideActivityAccess(friend, friendsReads);
		expect(asFriend.kind === "full" && asFriend.scope.finish).toBe(true);
	});
});
