import { describe, expect, test } from "bun:test";
import type { Database } from "@bbrc/db";
import { listAuditLog, recordAudit } from "./audit.service";

const baseInput = {
	page: 1,
	limit: 25,
	sortBy: "createdAt" as const,
	sortDirection: "desc" as const,
};

function fakeDb(rows: Record<string, unknown>[] = []) {
	const calls: { where?: unknown; orderBy?: unknown; skip?: number }[] = [];
	const created: Record<string, unknown>[] = [];
	const empty = async () => [];
	const db = {
		auditLog: {
			count: async () => rows.length,
			findMany: async (args: {
				where: unknown;
				orderBy: unknown;
				skip: number;
			}) => {
				calls.push(args);
				return rows;
			},
			create: async ({ data }: { data: Record<string, unknown> }) => {
				created.push(data);
			},
		},
		user: {
			findMany: async () => [{ id: "u1", username: "ann" }],
		},
		author: { findMany: empty },
		book: { findMany: empty },
		series: { findMany: empty },
		sitting: { findMany: empty },
	} as unknown as Database;
	return { db, calls, created };
}

describe("recordAudit", () => {
	test("stores the actor name, a clipped label and checked metadata", async () => {
		const { db, created } = fakeDb();
		await recordAudit(db, {
			actor: { id: "a", name: "Boss" },
			action: "member.role_changed",
			target: { type: "member", id: "u1", label: "  Ann  " },
			metadata: { from: "user", to: "admin" },
		});
		expect(created[0]).toMatchObject({
			actorId: "a",
			actorName: "Boss",
			action: "member.role_changed",
			targetType: "member",
			targetId: "u1",
			targetLabel: "Ann",
			metadata: { from: "user", to: "admin" },
		});
	});

	test("keeps the entry with empty details when metadata is wrong", async () => {
		const { db, created } = fakeDb();
		const original = console.error;
		console.error = () => {};
		try {
			await recordAudit(db, {
				actor: { id: "a", name: "Boss" },
				action: "member.role_changed",
				target: { type: "member" },
				// @ts-expect-error missing `to`
				metadata: { from: "user" },
			});
		} finally {
			console.error = original;
		}
		expect(created).toHaveLength(1);
		expect(created[0]?.metadata).toEqual({});
	});
});

describe("listAuditLog", () => {
	test("builds filters, paging and a link for targets that still exist", async () => {
		const row = {
			id: "r1",
			createdAt: new Date(),
			actorId: "a",
			actorName: "Boss",
			action: "member.role_changed",
			targetType: "member",
			targetId: "u1",
			targetLabel: "Ann",
			metadata: {},
			actor: { username: "boss", image: null },
		};
		const { db, calls } = fakeDb([row]);
		const result = await listAuditLog(db, {
			...baseInput,
			page: 2,
			limit: 10,
			actions: ["member.role_changed"],
			actorUsernames: ["boss"],
			search: "ann",
			sortBy: "actor",
			sortDirection: "asc",
		});
		const call = calls[0] as {
			where: Record<string, unknown>;
			orderBy: unknown;
			skip: number;
		};
		expect(call.skip).toBe(10);
		expect(call.where.action).toEqual({ in: ["member.role_changed"] });
		expect(call.where.actor).toEqual({ username: { in: ["boss"] } });
		expect(call.orderBy).toEqual([{ actorName: "asc" }, { createdAt: "desc" }]);
		expect(result.items[0]?.targetHref).toBe("/users/ann");
		expect(result.metadata.page).toBe(2);
	});

	test("a deleted target has no link", async () => {
		const { db } = fakeDb([
			{
				id: "r2",
				createdAt: new Date(),
				actorId: null,
				actorName: "Gone",
				action: "member.deleted",
				targetType: "member",
				targetId: "missing",
				targetLabel: "Old",
				metadata: {},
				actor: null,
			},
		]);
		const result = await listAuditLog(db, baseInput);
		expect(result.items[0]?.targetHref).toBeNull();
		expect(result.items[0]?.actor.id).toBeNull();
	});
});
