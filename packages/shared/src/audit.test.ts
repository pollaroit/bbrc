import { describe, expect, test } from "bun:test";
import {
	AUDIT_ACTION_KEYS,
	AUDIT_ACTIONS,
	AUDIT_DOMAINS,
	auditActionLabel,
	clipAuditText,
	groupedAuditActions,
	isAuditActionKey,
	summarizeAudit,
} from "./audit";

describe("audit registry", () => {
	test("every key is `<domain>.<name>` for a known domain", () => {
		for (const key of AUDIT_ACTION_KEYS) {
			const [domain] = key.split(".");
			expect(Object.hasOwn(AUDIT_DOMAINS, domain ?? "")).toBe(true);
			expect(AUDIT_ACTIONS[key].domain === domain || domain === "request").toBe(
				true,
			);
		}
	});

	test("labels are unique and every action has text", () => {
		const labels = AUDIT_ACTION_KEYS.map((k) => AUDIT_ACTIONS[k].label);
		expect(new Set(labels).size).toBe(labels.length);
		for (const key of AUDIT_ACTION_KEYS) {
			expect(AUDIT_ACTIONS[key].description.length).toBeGreaterThan(5);
		}
	});

	test("every domain has at least one action and groups cover all keys", () => {
		const grouped = groupedAuditActions();
		expect(grouped.length).toBe(Object.keys(AUDIT_DOMAINS).length);
		expect(grouped.flatMap((g) => g.actions).length).toBe(
			AUDIT_ACTION_KEYS.length,
		);
	});

	test("metadata schemas accept an empty object only when they need nothing", () => {
		expect(
			AUDIT_ACTIONS["member.password_reset"].metadata.safeParse({}).success,
		).toBe(true);
		expect(
			AUDIT_ACTIONS["member.role_changed"].metadata.safeParse({}).success,
		).toBe(false);
		expect(
			AUDIT_ACTIONS["member.role_changed"].metadata.safeParse({
				from: "user",
				to: "moderator",
			}).success,
		).toBe(true);
	});

	test("unknown keys are handled", () => {
		expect(isAuditActionKey("nope")).toBe(false);
		expect(isAuditActionKey("toString")).toBe(false);
		expect(auditActionLabel("nope")).toBe("nope");
		expect(summarizeAudit("nope", {}, null)).toBe("Unknown action.");
	});
});

describe("summarizeAudit", () => {
	test("is specific when the metadata allows", () => {
		expect(
			summarizeAudit(
				"member.role_changed",
				{ from: "user", to: "admin" },
				"Ann",
			),
		).toBe("Changed Ann's role from user to admin.");
		expect(summarizeAudit("fact.batch_created", { count: 1 }, null)).toBe(
			"Created 1 fact at once.",
		);
	});

	test("falls back to the description on odd metadata", () => {
		expect(summarizeAudit("member.role_changed", null, "Ann")).toBe(
			AUDIT_ACTIONS["member.role_changed"].description,
		);
	});
});

describe("clipAuditText", () => {
	test("trims, clips and empties", () => {
		expect(clipAuditText("  hi ")).toBe("hi");
		expect(clipAuditText("   ")).toBeNull();
		expect(clipAuditText(null)).toBeNull();
		expect(clipAuditText("abcdef", 4)).toBe("abc…");
	});
});
