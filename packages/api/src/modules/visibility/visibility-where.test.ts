import { describe, expect, test } from "bun:test";
import {
	ANONYMOUS_VIEWER,
	canView,
	memberViewer,
	PROFILE_VISIBILITIES,
	relationTo,
	VISIBILITY_LEVELS,
	type Viewer,
	type Visibility,
} from "@bbrc/shared";
import { type Clause, visibleWhere } from "./visibility-where";

/* A tiny matcher for the subset of Prisma `where` the builders emit, so the
 * generated clauses can be run against rows without a database. */
type Row = Record<string, unknown>;

function matchesCondition(value: unknown, condition: unknown): boolean {
	if (condition !== null && typeof condition === "object") {
		const cond = condition as Record<string, unknown>;
		if ("equals" in cond) return value === cond.equals;
		if ("in" in cond) return (cond.in as unknown[]).includes(value);
		if ("notIn" in cond) return !(cond.notIn as unknown[]).includes(value);
		throw new Error(`unsupported condition ${JSON.stringify(cond)}`);
	}
	return value === condition;
}

function matches(row: Row, where: Clause): boolean {
	for (const [key, condition] of Object.entries(where)) {
		if (key === "AND") {
			if (!(condition as Clause[]).every((part) => matches(row, part)))
				return false;
		} else if (key === "OR") {
			if (!(condition as Clause[]).some((part) => matches(row, part)))
				return false;
		} else if (key === "NOT") {
			if (matches(row, condition as Clause)) return false;
		} else if (
			condition !== null &&
			typeof condition === "object" &&
			!("equals" in condition) &&
			!("in" in condition) &&
			!("notIn" in condition)
		) {
			// A relation: match the nested clause against the nested row.
			if (!matches((row[key] ?? {}) as Row, condition as Clause)) return false;
		} else if (!matchesCondition(row[key], condition)) {
			return false;
		}
	}
	return true;
}

const OWNER = "owner";
type Fixture = {
	profile: "public" | "private";
	section: Visibility;
	item: Visibility;
};

function row(f: Fixture): Row {
	return {
		authorId: OWNER,
		visibility: f.item,
		author: {
			id: OWNER,
			profileVisibility: f.profile,
			reviewsVisibility: f.section,
		},
	};
}

const viewers: { name: string; viewer: Viewer }[] = [
	{ name: "anonymous", viewer: ANONYMOUS_VIEWER },
	{ name: "stranger", viewer: memberViewer({ userId: "v", isAdmin: false }) },
	{
		name: "friend",
		viewer: memberViewer({ userId: "v", isAdmin: false, friendIds: [OWNER] }),
	},
	{
		name: "blocked",
		viewer: memberViewer({
			userId: "v",
			isAdmin: false,
			friendIds: [OWNER],
			blockedIds: [OWNER],
		}),
	},
	{ name: "owner", viewer: memberViewer({ userId: OWNER, isAdmin: false }) },
	{ name: "admin", viewer: memberViewer({ userId: "a", isAdmin: true }) },
];

describe("visibleWhere agrees with canView over the whole matrix", () => {
	for (const { name, viewer } of viewers) {
		test(`viewer: ${name}`, () => {
			for (const profile of PROFILE_VISIBILITIES) {
				for (const section of VISIBILITY_LEVELS) {
					for (const item of VISIBILITY_LEVELS) {
						const where = visibleWhere(viewer, {
							ownerIdField: "authorId",
							ownerRelation: "author",
							itemField: "visibility",
							section: "reviews",
						});
						const fixture = { profile, section, item };
						const expected = canView(relationTo(viewer, OWNER), {
							profile,
							section,
							item,
						});
						expect(matches(row(fixture), where)).toBe(expected);
					}
				}
			}
		});
	}

	test("public space ignores the owner's profile level", () => {
		const stranger = memberViewer({ userId: "v", isAdmin: false });
		const where = visibleWhere(stranger, {
			ownerIdField: "authorId",
			ownerRelation: "author",
			profile: false,
		});
		expect(
			matches(
				row({ profile: "private", section: "private", item: "private" }),
				where,
			),
		).toBe(true);
	});

	test("public space still hides a blocked author", () => {
		const blocked = memberViewer({
			userId: "v",
			isAdmin: false,
			blockedIds: [OWNER],
		});
		const where = visibleWhere(blocked, {
			ownerIdField: "authorId",
			ownerRelation: "author",
			profile: false,
		});
		expect(
			matches(
				row({ profile: "public", section: "public", item: "public" }),
				where,
			),
		).toBe(false);
	});

	test("an item-level-only resource (no profile, no section) follows its own level", () => {
		const stranger = memberViewer({ userId: "v", isAdmin: false });
		const where = visibleWhere(stranger, {
			ownerIdField: "authorId",
			ownerRelation: "author",
			itemField: "visibility",
			profile: false,
		});
		expect(
			matches(
				row({ profile: "private", section: "public", item: "public" }),
				where,
			),
		).toBe(true);
		expect(
			matches(
				row({ profile: "public", section: "public", item: "friends" }),
				where,
			),
		).toBe(false);
	});
});
