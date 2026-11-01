import { describe, expect, test } from "bun:test";
import { isAuditActionKey } from "@bbrc/shared";
import { AUDITED, NO_AUDIT } from "./modules/audit/audit-middleware";
import { ROLE_GATED } from "./procedures";
import { appRouter } from "./router";

/**
 * Every mutation behind a role guard must say what it logs (`audited(...)`) or why it does not
 * (`noAudit("reason")`). A procedure counts as a read, and needs neither, when its name starts
 * with one of these words; give a new read a name like that, or mark it `noAudit("read only")`.
 */
const READ_NAME =
	/^(get|list|search|preview|find|count|stats|overview|suggest|check|resolve|generate|shuffle|replace|wishlist|review|status|plan|aliases?|openCount|presence)/i;

type Marked = ((...args: never[]) => unknown) & Record<symbol, unknown>;

interface Found {
	path: string;
	gated: boolean;
	audited: string[];
	noAudit: string[];
}

function walk(node: unknown, path: string[], out: Found[]) {
	if (!node || (typeof node !== "object" && typeof node !== "function")) return;
	const def = (node as { "~orpc"?: { middlewares?: Marked[] } })["~orpc"];
	if (def) {
		const middlewares = def.middlewares ?? [];
		out.push({
			path: path.join("."),
			gated: middlewares.some((m) => m[ROLE_GATED] === true),
			audited: middlewares
				.map((m) => m[AUDITED])
				.filter((v): v is string => typeof v === "string"),
			noAudit: middlewares
				.map((m) => m[NO_AUDIT])
				.filter((v): v is string => typeof v === "string"),
		});
		return;
	}
	for (const [key, value] of Object.entries(node)) {
		walk(value, [...path, key], out);
	}
}

const procedures: Found[] = [];
walk(appRouter, [], procedures);

describe("audit coverage", () => {
	test("finds the router's procedures", () => {
		expect(procedures.length).toBeGreaterThan(100);
		expect(procedures.filter((p) => p.gated).length).toBeGreaterThan(40);
	});

	test("every role-gated mutation is audited or explicitly exempt", () => {
		const missing = procedures
			.filter((p) => p.gated)
			.filter((p) => !READ_NAME.test(p.path.split(".").at(-1) ?? ""))
			.filter((p) => p.audited.length === 0 && p.noAudit.length === 0)
			.map((p) => p.path);
		expect(missing).toEqual([]);
	});

	test("audited actions exist in the registry", () => {
		for (const p of procedures) {
			for (const key of p.audited) expect(isAuditActionKey(key)).toBe(true);
		}
	});

	test("reads are not audited, and exemptions give a reason", () => {
		for (const p of procedures) {
			if (p.audited.length > 0) {
				expect(READ_NAME.test(p.path.split(".").at(-1) ?? "")).toBe(false);
			}
			for (const reason of p.noAudit) {
				expect(reason.trim().length).toBeGreaterThan(3);
			}
		}
	});

	test("no two procedures share an action unless intended", () => {
		const shared = new Map<string, string[]>();
		for (const p of procedures) {
			for (const key of p.audited) {
				shared.set(key, [...(shared.get(key) ?? []), p.path]);
			}
		}
		// Photo changes are one action written by three procedures.
		const allowed = new Set(["author.photo_changed"]);
		const dup = [...shared].filter(([k, v]) => v.length > 1 && !allowed.has(k));
		expect(dup).toEqual([]);
	});

	test("every registry action is written by some procedure", () => {
		const used = new Set(procedures.flatMap((p) => p.audited));
		// Written outside a procedure middleware (in the role change's transaction).
		const elsewhere = new Set(["member.role_changed"]);
		const unused = Object.keys(
			require("@bbrc/shared").AUDIT_ACTIONS as Record<string, unknown>,
		).filter((k) => !used.has(k) && !elsewhere.has(k));
		expect(unused).toEqual([]);
	});
});
