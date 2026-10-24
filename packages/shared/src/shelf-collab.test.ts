import { describe, expect, test } from "bun:test";
import {
	canManageCollaborators,
	missingGrants,
	normalizeShelfPermissions,
	outranks,
	presetIdFor,
	reorderPermissionFor,
	resolveShelfPermissions,
	SHELF_PERMISSION_GROUPS,
	SHELF_PERMISSION_PRESETS,
	SHELF_PERMISSIONS,
} from "./shelf-collab";

describe("shelf permissions", () => {
	test("every permission is in exactly one group", () => {
		const grouped = SHELF_PERMISSION_GROUPS.flatMap((group) => [
			...group.permissions,
		]);
		expect([...grouped].sort()).toEqual([...SHELF_PERMISSIONS].sort());
	});

	test("owner holds everything, others only what was granted", () => {
		expect(resolveShelfPermissions(true, []).size).toBe(
			SHELF_PERMISSIONS.length,
		);
		const collaborator = resolveShelfPermissions(false, ["add_book", "nope"]);
		expect([...collaborator]).toEqual(["add_book"]);
	});

	test("normalizing dedupes and orders", () => {
		expect(
			normalizeShelfPermissions(["edit_notes", "add_book", "add_book", "x"]),
		).toEqual(["add_book", "edit_notes"]);
	});

	test("nobody can grant more than they hold", () => {
		const actor = resolveShelfPermissions(false, [
			"add_book",
			"add_collaborator",
		]);
		expect(missingGrants(actor, ["add_book"])).toEqual([]);
		expect(missingGrants(actor, ["add_book", "delete_shelf"])).toEqual([
			"delete_shelf",
		]);
	});

	test("nobody can touch someone who can do more", () => {
		const actor = resolveShelfPermissions(false, ["add_book", "remove_book"]);
		expect(outranks(actor, ["add_book"])).toBe(true);
		expect(outranks(actor, ["add_book", "edit_title"])).toBe(false);
	});

	test("managing people needs one of the three collaborator permissions", () => {
		expect(
			canManageCollaborators(resolveShelfPermissions(false, ["add_book"])),
		).toBe(false);
		expect(
			canManageCollaborators(
				resolveShelfPermissions(false, ["remove_collaborator"]),
			),
		).toBe(true);
	});

	test("presets nest and are recognised", () => {
		const sizes = SHELF_PERMISSION_PRESETS.map((p) => p.permissions.length);
		expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
		for (const preset of SHELF_PERMISSION_PRESETS) {
			expect(presetIdFor(preset.permissions)).toBe(preset.id);
		}
		expect(presetIdFor(["add_book", "edit_title"])).toBe("custom");
	});

	test("manager can manage people but not delete", () => {
		const manager = SHELF_PERMISSION_PRESETS.find((p) => p.id === "manager");
		expect(manager?.permissions).not.toContain("delete_shelf");
		expect(manager?.permissions).toContain("edit_permissions");
	});

	test("reordering depends on the shelf type", () => {
		expect(reorderPermissionFor("ordered")).toBe("edit_ordering_on_ranked");
		expect(reorderPermissionFor("unordered")).toBe("edit_ordering_on_simple");
	});
});
