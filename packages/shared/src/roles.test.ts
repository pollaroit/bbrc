import { describe, expect, test } from "bun:test";
import {
	assignableRoles,
	canAssignRole,
	canManageBooks,
	canManageRoles,
	hasRoleAtLeast,
	isSuperAdmin,
	ROLES,
	roleOf,
} from "./roles";

const member = (id: string, role: string | null) => ({ id, role });

describe("roleOf", () => {
	test("anything that is not a real role counts as a plain member", () => {
		expect(roleOf(undefined)).toBe("user");
		expect(roleOf(null)).toBe("user");
		expect(roleOf("")).toBe("user");
		expect(roleOf("root")).toBe("user");
		expect(roleOf({ role: "owner" })).toBe("user");
		expect(roleOf({})).toBe("user");
	});

	test("real roles pass through, as a string or on an object", () => {
		for (const role of ROLES) {
			expect(roleOf(role)).toBe(role);
			expect(roleOf({ role })).toBe(role);
		}
	});
});

describe("isSuperAdmin and rank", () => {
	test("only a super admin is a super admin", () => {
		expect(isSuperAdmin({ role: "super_admin" })).toBe(true);
		expect(isSuperAdmin({ role: "admin" })).toBe(false);
		expect(isSuperAdmin({ role: "moderator" })).toBe(false);
		expect(isSuperAdmin({ role: "user" })).toBe(false);
		expect(isSuperAdmin(null)).toBe(false);
	});

	test("rank orders the roles", () => {
		expect(hasRoleAtLeast("admin", "moderator")).toBe(true);
		expect(hasRoleAtLeast("moderator", "admin")).toBe(false);
		expect(hasRoleAtLeast(undefined, "user")).toBe(true);
	});
});

describe("who may set whose role", () => {
	const superAdmin = member("s", "super_admin");
	const admin = member("a", "admin");
	const moderator = member("m", "moderator");
	const user = member("u", "user");
	const otherAdmin = member("a2", "admin");

	test("a super admin sets anyone but another super admin to user, moderator or admin", () => {
		expect(assignableRoles(superAdmin, user)).toEqual(["moderator", "admin"]);
		expect(assignableRoles(superAdmin, moderator)).toEqual(["user", "admin"]);
		expect(assignableRoles(superAdmin, admin)).toEqual(["user", "moderator"]);
		expect(assignableRoles(superAdmin, member("s2", "super_admin"))).toEqual(
			[],
		);
	});

	test("an admin moves members between user and moderator only", () => {
		expect(assignableRoles(admin, user)).toEqual(["moderator"]);
		expect(assignableRoles(admin, moderator)).toEqual(["user"]);
		expect(canAssignRole(admin, user, "admin")).toBe(false);
	});

	test("an admin cannot touch another admin or a super admin", () => {
		expect(assignableRoles(admin, otherAdmin)).toEqual([]);
		expect(assignableRoles(admin, superAdmin)).toEqual([]);
	});

	test("nobody changes their own role", () => {
		expect(assignableRoles(superAdmin, superAdmin)).toEqual([]);
		expect(assignableRoles(admin, admin)).toEqual([]);
	});

	test("a moderator or a member can set no one's role", () => {
		expect(assignableRoles(moderator, user)).toEqual([]);
		expect(assignableRoles(user, moderator)).toEqual([]);
		expect(assignableRoles(null, user)).toEqual([]);
	});

	test("super_admin is never assignable, by anyone", () => {
		for (const actor of [superAdmin, admin, moderator, user]) {
			for (const target of [user, moderator, admin]) {
				expect(canAssignRole(actor, target, "super_admin")).toBe(false);
			}
		}
	});

	test("assigning the role someone already has is not an option", () => {
		expect(canAssignRole(superAdmin, moderator, "moderator")).toBe(false);
	});

	test("who can manage roles at all", () => {
		expect(canManageRoles(superAdmin)).toBe(true);
		expect(canManageRoles(admin)).toBe(true);
		expect(canManageRoles(moderator)).toBe(false);
		expect(canManageRoles(user)).toBe(false);
		expect(canManageRoles(null)).toBe(false);
	});
});

describe("canManageBooks", () => {
	test("admins and super admins run the book catalogue; moderators and members do not", () => {
		expect(canManageBooks({ role: "super_admin" })).toBe(true);
		expect(canManageBooks({ role: "admin" })).toBe(true);
		expect(canManageBooks({ role: "moderator" })).toBe(false);
		expect(canManageBooks({ role: "user" })).toBe(false);
		expect(canManageBooks(null)).toBe(false);
		expect(canManageBooks({ role: "owner" })).toBe(false);
	});

	test("it grants nothing else: admins are still not super admins", () => {
		expect(isSuperAdmin({ role: "admin" })).toBe(false);
	});
});
