import { describe, expect, test } from "bun:test";
import {
	ANONYMOUS_VIEWER,
	canView,
	memberViewer,
	PROFILE_VISIBILITIES,
	relationTo,
	VISIBILITY_LEVELS,
	type Viewer,
} from "@bbrc/shared";
import { memberVisibleWhere } from "./member-access";

type Row = Record<string, unknown>;
type Clause = Record<string, unknown>;

function cond(value: unknown, c: unknown): boolean {
	if (c !== null && typeof c === "object") {
		const o = c as Record<string, unknown>;
		if ("equals" in o) return value === o.equals;
		if ("in" in o) return (o.in as unknown[]).includes(value);
		if ("notIn" in o) return !(o.notIn as unknown[]).includes(value);
		throw new Error("unsupported");
	}
	return value === c;
}

function matches(row: Row, where: Clause): boolean {
	for (const [key, c] of Object.entries(where)) {
		if (key === "AND") {
			if (!(c as Clause[]).every((part) => matches(row, part))) return false;
		} else if (key === "OR") {
			if (!(c as Clause[]).some((part) => matches(row, part))) return false;
		} else if (
			c !== null &&
			typeof c === "object" &&
			!("equals" in c) &&
			!("in" in c) &&
			!("notIn" in c)
		) {
			if (!matches((row[key] ?? {}) as Row, c as Clause)) return false;
		} else if (!cond(row[key], c)) return false;
	}
	return true;
}

const viewers: Array<[string, Viewer, string]> = [
	["anonymous", ANONYMOUS_VIEWER, "owner"],
	["self", memberViewer({ userId: "owner", isAdmin: false }), "owner"],
	[
		"friend",
		memberViewer({ userId: "me", isAdmin: false, friendIds: ["owner"] }),
		"owner",
	],
	["member", memberViewer({ userId: "me", isAdmin: false }), "owner"],
	[
		"blocked",
		memberViewer({ userId: "me", isAdmin: false, blockedIds: ["owner"] }),
		"owner",
	],
	["admin", memberViewer({ userId: "me", isAdmin: true }), "owner"],
];

describe("memberVisibleWhere agrees with canView", () => {
	for (const [name, viewer, ownerId] of viewers) {
		for (const profile of PROFILE_VISIBILITIES) {
			for (const reads of VISIBILITY_LEVELS) {
				for (const location of VISIBILITY_LEVELS) {
					test(`${name} / profile ${profile} / reads ${reads} / location ${location}`, () => {
						const row = {
							id: ownerId,
							profileVisibility: profile,
							readsVisibility: reads,
							profile: { locationVisibility: location },
						};
						const relation = relationTo(viewer, ownerId);
						expect(matches(row, memberVisibleWhere(viewer) as Clause)).toBe(
							canView(relation, { profile }),
						);
						expect(
							matches(
								row,
								memberVisibleWhere(viewer, { section: "reads" }) as Clause,
							),
						).toBe(canView(relation, { profile, section: reads }));
						expect(
							matches(
								row,
								memberVisibleWhere(viewer, { detail: "location" }) as Clause,
							),
						).toBe(canView(relation, { profile, section: location }));
					});
				}
			}
		}
	}
});
