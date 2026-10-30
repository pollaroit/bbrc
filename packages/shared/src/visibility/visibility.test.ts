import { describe, expect, test } from "bun:test";
import {
	ANONYMOUS_VIEWER,
	canView,
	effectiveVisibility,
	LEVEL_REACH,
	memberViewer,
	PROFILE_SECTIONS,
	RESOURCE_KINDS,
	relationReaches,
	relationTo,
	stricterVisibility,
	VIEWER_RELATIONS,
	VISIBILITY_LEVELS,
	VISIBILITY_REGISTRY,
	visibilityRank,
} from "./index";

describe("levels", () => {
	test("the levels are ordered widest first", () => {
		expect(VISIBILITY_LEVELS).toEqual(["public", "friends", "private"]);
		expect(visibilityRank("public")).toBeLessThan(visibilityRank("friends"));
		expect(visibilityRank("friends")).toBeLessThan(visibilityRank("private"));
	});

	test("the stricter of two levels", () => {
		expect(stricterVisibility("public", "friends")).toBe("friends");
		expect(stricterVisibility("private", "friends")).toBe("private");
		expect(stricterVisibility("public", "public")).toBe("public");
	});

	test("every level lists who reaches it, and a narrower level never reaches more", () => {
		for (const level of VISIBILITY_LEVELS) {
			expect(LEVEL_REACH[level].length).toBeGreaterThan(0);
		}
		for (let index = 1; index < VISIBILITY_LEVELS.length; index += 1) {
			const wider = LEVEL_REACH[VISIBILITY_LEVELS[index - 1] ?? "public"];
			const narrower = LEVEL_REACH[VISIBILITY_LEVELS[index] ?? "public"];
			for (const relation of narrower) expect(wider).toContain(relation);
		}
	});

	test("nobody who is blocked reaches any level", () => {
		for (const level of VISIBILITY_LEVELS) {
			expect(LEVEL_REACH[level]).not.toContain("blocked");
		}
	});
});

describe("effectiveVisibility", () => {
	test("a public profile with nothing else is public", () => {
		expect(effectiveVisibility({ profile: "public" })).toBe("public");
	});

	test("a private profile caps everything at friends", () => {
		expect(effectiveVisibility({ profile: "private" })).toBe("friends");
		expect(effectiveVisibility({ profile: "private", item: "public" })).toBe(
			"friends",
		);
	});

	test("the stricter of profile, section and item wins", () => {
		expect(effectiveVisibility({ profile: "public", section: "friends" })).toBe(
			"friends",
		);
		expect(
			effectiveVisibility({
				profile: "public",
				section: "friends",
				item: "private",
			}),
		).toBe("private");
		expect(
			effectiveVisibility({ profile: "private", section: "private" }),
		).toBe("private");
	});
});

describe("canView: viewer relation by profile by section by item", () => {
	const profiles = ["public", "private"] as const;
	const levels = [undefined, ...VISIBILITY_LEVELS] as const;

	test("admins and the owner see everything", () => {
		for (const relation of ["admin", "self"] as const) {
			for (const profile of profiles) {
				for (const section of levels) {
					for (const item of levels) {
						expect(canView(relation, { profile, section, item })).toBe(true);
					}
				}
			}
		}
	});

	test("a blocked viewer sees nothing, not even public things", () => {
		for (const profile of profiles) {
			for (const section of levels) {
				for (const item of levels) {
					expect(canView("blocked", { profile, section, item })).toBe(false);
				}
			}
		}
	});

	test("friends reach friends-level things but not only-me things", () => {
		expect(canView("friend", { profile: "public", item: "friends" })).toBe(
			true,
		);
		expect(canView("friend", { profile: "private" })).toBe(true);
		expect(canView("friend", { profile: "public", item: "private" })).toBe(
			false,
		);
		expect(canView("friend", { profile: "public", section: "private" })).toBe(
			false,
		);
	});

	test("members and anonymous visitors reach only public things", () => {
		for (const relation of ["member", "anonymous"] as const) {
			expect(canView(relation, { profile: "public" })).toBe(true);
			expect(canView(relation, { profile: "private" })).toBe(false);
			expect(canView(relation, { profile: "public", item: "friends" })).toBe(
				false,
			);
			expect(canView(relation, { profile: "public", section: "friends" })).toBe(
				false,
			);
		}
	});

	test("the whole matrix agrees with the reach table", () => {
		for (const relation of VIEWER_RELATIONS) {
			for (const profile of profiles) {
				for (const section of levels) {
					for (const item of levels) {
						const level = effectiveVisibility({ profile, section, item });
						expect(canView(relation, { profile, section, item })).toBe(
							relationReaches(relation, level),
						);
					}
				}
			}
		}
	});
});

describe("relationTo", () => {
	const viewer = memberViewer({
		userId: "me",
		isAdmin: false,
		friendIds: ["pal"],
		blockedIds: ["foe"],
	});

	test("anonymous, self, friend, blocked and member", () => {
		expect(relationTo(ANONYMOUS_VIEWER, "x")).toBe("anonymous");
		expect(relationTo(viewer, "me")).toBe("self");
		expect(relationTo(viewer, "pal")).toBe("friend");
		expect(relationTo(viewer, "foe")).toBe("blocked");
		expect(relationTo(viewer, "stranger")).toBe("member");
		expect(relationTo(viewer, null)).toBe("member");
	});

	test("an admin is an admin to everyone, even someone who blocked them", () => {
		const admin = memberViewer({
			userId: "boss",
			isAdmin: true,
			blockedIds: ["foe"],
		});
		expect(relationTo(admin, "foe")).toBe("admin");
		expect(relationTo(admin, "boss")).toBe("admin");
	});

	test("being blocked beats being a friend", () => {
		const both = memberViewer({
			userId: "me",
			isAdmin: false,
			friendIds: ["x"],
			blockedIds: ["x"],
		});
		expect(relationTo(both, "x")).toBe("blocked");
	});
});

describe("registry", () => {
	test("every resource kind has a policy, and no policy is unknown", () => {
		expect(Object.keys(VISIBILITY_REGISTRY).sort()).toEqual(
			[...RESOURCE_KINDS].sort(),
		);
	});

	test("a parent is a real resource, and never itself", () => {
		for (const kind of RESOURCE_KINDS) {
			const policy = VISIBILITY_REGISTRY[kind];
			if (policy.parent) {
				expect(RESOURCE_KINDS).toContain(policy.parent);
				expect(policy.parent).not.toBe(kind);
			}
		}
	});

	test("a section named by a policy exists", () => {
		for (const kind of RESOURCE_KINDS) {
			const section = VISIBILITY_REGISTRY[kind].section;
			if (section) expect(PROFILE_SECTIONS).toContain(section);
		}
	});

	test("a resource that follows a parent or ignores the profile says so", () => {
		for (const kind of RESOURCE_KINDS) {
			const policy = VISIBILITY_REGISTRY[kind];
			if (policy.ignoresOwnerProfile) expect(policy.parent).toBeDefined();
			expect(policy.note.length).toBeGreaterThan(10);
		}
	});
});
