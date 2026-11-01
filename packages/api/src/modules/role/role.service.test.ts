import { describe, expect, test } from "bun:test";
import type { Database } from "@bbrc/db";
import { ROLES, type Role } from "@bbrc/shared";
import { setMemberRole } from "./role.service";

type Row = { id: string; username: string; role: Role };

/** A database with the given members, recording role updates; `racing` makes the guarded update match nothing. */
function fakeDb(members: Row[], options: { racing?: boolean } = {}) {
	const updates: { id: string; from: Role; to: Role }[] = [];
	const db = {
		user: {
			findUnique: async ({ where }: { where: { username: string } }) =>
				members.find((m) => m.username === where.username) ?? null,
			updateMany: async ({
				where,
				data,
			}: {
				where: { id: string; role: Role };
				data: { role: Role };
			}) => {
				if (options.racing) return { count: 0 };
				const row = members.find(
					(m) => m.id === where.id && m.role === where.role,
				);
				if (!row) return { count: 0 };
				updates.push({ id: row.id, from: row.role, to: data.role });
				row.role = data.role;
				return { count: 1 };
			},
		},
	} as unknown as Database;
	return { db, updates };
}

const people = (): Row[] => [
	{ id: "s", username: "boss", role: "super_admin" },
	{ id: "a", username: "adam", role: "admin" },
	{ id: "a2", username: "adele", role: "admin" },
	{ id: "m", username: "mona", role: "moderator" },
	{ id: "u", username: "user_one", role: "user" },
];

const actorOf = (rows: Row[], username: string) => {
	const row = rows.find((r) => r.username === username) as Row;
	return { id: row.id, role: row.role };
};

async function run(actorName: string, username: string, role: Role) {
	const rows = people();
	const { db, updates } = fakeDb(rows);
	const result = await setMemberRole(db, actorOf(rows, actorName), {
		username,
		role,
	}).then(
		(value) => ({ ok: true as const, value }),
		(error: Error) => ({ ok: false as const, error }),
	);
	return { result, updates };
}

describe("role.set", () => {
	test("a super admin promotes a member to admin and demotes an admin to user", async () => {
		const up = await run("boss", "user_one", "admin");
		expect(up.result.ok).toBe(true);
		expect(up.updates).toEqual([{ id: "u", from: "user", to: "admin" }]);
		const down = await run("boss", "adam", "user");
		expect(down.result.ok).toBe(true);
	});

	test("an admin moves a member to moderator and back", async () => {
		expect((await run("adam", "user_one", "moderator")).result.ok).toBe(true);
		expect((await run("adam", "mona", "user")).result.ok).toBe(true);
	});

	test("an admin cannot make an admin, or touch another admin or a super admin", async () => {
		for (const [target, role] of [
			["user_one", "admin"],
			["adele", "user"],
			["boss", "user"],
		] as const) {
			const attempt = await run("adam", target, role);
			expect(attempt.result.ok).toBe(false);
			expect(attempt.updates).toEqual([]);
		}
	});

	test("nobody becomes a super admin through the app", async () => {
		for (const actor of ["boss", "adam"]) {
			const attempt = await run(actor, "user_one", "super_admin");
			expect(attempt.result.ok).toBe(false);
			expect(attempt.updates).toEqual([]);
		}
	});

	test("nobody changes their own role", async () => {
		for (const actor of ["boss", "adam"]) {
			const attempt = await run(
				actor,
				actor === "boss" ? "boss" : "adam",
				"user",
			);
			expect(attempt.result.ok).toBe(false);
		}
	});

	test("a moderator or a member cannot set roles", async () => {
		expect((await run("mona", "user_one", "moderator")).result.ok).toBe(false);
		expect((await run("user_one", "mona", "user")).result.ok).toBe(false);
	});

	test("an unknown member is not found", async () => {
		const attempt = await run("boss", "ghost", "user");
		expect(attempt.result.ok).toBe(false);
		if (!attempt.result.ok)
			expect(attempt.result.error.message).toMatch(/not found/i);
	});

	test("the reasons are plain", async () => {
		const self = await run("boss", "boss", "user");
		if (!self.result.ok) expect(self.result.error.message).toMatch(/own role/i);
		const adminOnAdmin = await run("adam", "adele", "user");
		if (!adminOnAdmin.result.ok) {
			expect(adminOnAdmin.result.error.message).toMatch(/only a super admin/i);
		}
	});

	test("a change that raced another is refused instead of overwriting", async () => {
		const rows = people();
		const { db, updates } = fakeDb(rows, { racing: true });
		await expect(
			setMemberRole(db, actorOf(rows, "boss"), {
				username: "user_one",
				role: "admin",
			}),
		).rejects.toThrow(/changed while/i);
		expect(updates).toEqual([]);
	});

	test("every role is a role the rules know", () => {
		expect(ROLES).toEqual(["user", "moderator", "admin", "super_admin"]);
	});
});
