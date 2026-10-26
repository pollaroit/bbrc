import { describe, expect, test } from "bun:test";
import {
	type AuthorFieldColumns,
	fieldsStillEmpty,
	planFieldPatch,
	resolveFields,
} from "./fields";

const empty: AuthorFieldColumns = {
	bio: null,
	bioSource: null,
	birthYear: null,
	birthMonth: null,
	birthDay: null,
	deathYear: null,
	deathMonth: null,
	deathDay: null,
	birthPlace: null,
	deathPlace: null,
	nationalities: [],
	gender: "unknown",
	wikipediaUrl: null,
	goodreadsUrl: null,
	websiteUrl: null,
};

const date = (
	year: number,
	month: number | null = null,
	day: number | null = null,
) => ({
	year,
	month,
	day,
});

describe("resolveFields", () => {
	test("first source that knows a field wins; empty values are skipped", () => {
		const resolved = resolveFields([
			{ source: "openlibrary", values: { bio: "OL bio", birth: date(1821) } },
			{
				source: "wikidata",
				values: {
					bio: "ignored",
					birth: date(1822),
					birthPlace: "Moscow",
					gender: "male",
					nationalities: [],
				},
			},
			{ source: "wikipedia", values: { bio: "wiki", nationalities: ["RU"] } },
		]);
		const by = Object.fromEntries(resolved.map((r) => [r.field, r]));
		expect(by.bio?.source).toBe("openlibrary");
		expect(by.birth?.source).toBe("openlibrary");
		expect(by.birthPlace?.source).toBe("wikidata");
		expect(by.nationalities?.source).toBe("wikipedia");
		expect(by.gender?.value).toBe("male");
		expect(by.death).toBeUndefined();
	});

	test("a Wikipedia bio keeps its source (the UI credits it)", () => {
		const resolved = resolveFields([
			{ source: "wikipedia", values: { bio: "text" } },
		]);
		const plan = planFieldPatch(empty, {}, resolved, { mode: "fill" });
		expect(plan.data.bioSource).toBe("wikipedia");
		expect(plan.meta.bio).toEqual({ source: "wikipedia" });
	});
});

describe("planFieldPatch", () => {
	const resolved = resolveFields([
		{
			source: "wikidata",
			values: {
				birth: date(1821, 11, 11),
				gender: "male",
				birthPlace: "Moscow",
			},
		},
	]);

	test("fills empty fields and records the source", () => {
		const plan = planFieldPatch(empty, {}, resolved, { mode: "fill" });
		expect(plan.data).toMatchObject({
			birthYear: 1821,
			birthMonth: 11,
			birthDay: 11,
			gender: "male",
			birthPlace: "Moscow",
		});
		expect(plan.meta.birth).toEqual({ source: "wikidata" });
		expect(plan.changed.sort()).toEqual(["birth", "birthPlace", "gender"]);
	});

	test("fill never replaces what is there", () => {
		const plan = planFieldPatch(
			{ ...empty, birthYear: 1800, birthPlace: "Elsewhere" },
			{ birth: { source: "openlibrary" } },
			resolved,
			{ mode: "fill" },
		);
		expect(plan.data.birthYear).toBeUndefined();
		expect(plan.data.birthPlace).toBeUndefined();
		expect(plan.data.gender).toBe("male");
	});

	test("a locked field is never touched, even when empty or on refresh", () => {
		const meta = {
			gender: { source: "admin" as const, locked: true },
			birth: { source: "openlibrary" as const, locked: true },
		};
		const plan = planFieldPatch({ ...empty, birthYear: 1800 }, meta, resolved, {
			mode: "refresh",
		});
		expect(plan.data.gender).toBeUndefined();
		expect(plan.data.birthYear).toBeUndefined();
		expect(plan.data.birthPlace).toBe("Moscow");
	});

	test("refresh replaces machine fields but not an admin's, unless named", () => {
		const current = { ...empty, birthYear: 1800, birthPlace: "Old" };
		const meta = {
			birth: { source: "openlibrary" as const },
			birthPlace: { source: "admin" as const },
		};
		const refresh = planFieldPatch(current, meta, resolved, {
			mode: "refresh",
		});
		expect(refresh.data.birthYear).toBe(1821);
		expect(refresh.data.birthPlace).toBeUndefined();
		const named = planFieldPatch(current, meta, resolved, {
			mode: "refresh",
			only: ["birthPlace"],
		});
		expect(named.data.birthPlace).toBe("Moscow");
		expect(named.data.birthYear).toBeUndefined();
	});

	test("a value with no recorded source is left alone on refresh", () => {
		const plan = planFieldPatch({ ...empty, birthYear: 1800 }, {}, resolved, {
			mode: "refresh",
		});
		expect(plan.data.birthYear).toBeUndefined();
	});

	test("fields still empty exclude locked ones", () => {
		const still = fieldsStillEmpty(
			empty,
			{ gender: "male" },
			{ bio: { source: "admin", locked: true } },
		);
		expect(still).not.toContain("bio");
		expect(still).not.toContain("gender");
		expect(still).toContain("birth");
	});
});

describe("nationalities are always modern", () => {
	test("retired and invalid codes are mapped or dropped", () => {
		const resolved = resolveFields([
			{ source: "ai", values: { nationalities: ["SU", "ZZ", "ru"] } },
		]);
		expect(resolved).toEqual([
			{ field: "nationalities", source: "ai", value: ["RU"] },
		]);
		expect(
			resolveFields([{ source: "ai", values: { nationalities: ["ZZ"] } }]),
		).toEqual([]);
	});
});
