import { describe, expect, test } from "bun:test";
import {
	DEFAULT_TIERLIST_TIERS,
	isTierlistColor,
	normalizeTierlistText,
	TIERLIST_COLORS,
	TIERLIST_MAX_ITEMS,
	TIERLIST_MAX_TIERS,
	type TierlistTierDraft,
	tierlistItemDedupeKey,
	tierlistSetupProblems,
} from "./post-tierlists";

const text = (label: string) => ({ kind: "text" as const, label });

function tiers(...sets: TierlistTierDraft["items"][]): TierlistTierDraft[] {
	return sets.map((items, index) => ({
		name: `T${index + 1}`,
		color: TIERLIST_COLORS[index] ?? "blue",
		items,
	}));
}

describe("tierlist colours", () => {
	test("there is one colour for every possible tier, all different", () => {
		expect(TIERLIST_COLORS.length).toBeGreaterThanOrEqual(TIERLIST_MAX_TIERS);
		expect(new Set(TIERLIST_COLORS).size).toBe(TIERLIST_COLORS.length);
	});

	test("the default tiers use known colours and all differ", () => {
		const colors = DEFAULT_TIERLIST_TIERS.map((tier) => tier.color);
		for (const color of colors) expect(isTierlistColor(color)).toBe(true);
		expect(new Set(colors).size).toBe(colors.length);
		expect(DEFAULT_TIERLIST_TIERS.map((tier) => tier.name)).toEqual([
			"S",
			"A",
			"B",
			"C",
			"D",
		]);
	});

	test("hex values and unknown names are not colours", () => {
		expect(isTierlistColor("#ff0000")).toBe(false);
		expect(isTierlistColor("destructive")).toBe(false);
		expect(isTierlistColor("crimson")).toBe(false);
	});
});

describe("tierlistItemDedupeKey", () => {
	test("text ignores case and extra spaces", () => {
		expect(tierlistItemDedupeKey(text("  Dune  "))).toBe(
			tierlistItemDedupeKey(text("dune")),
		);
		expect(tierlistItemDedupeKey(text("a   b"))).toBe("text:a b");
	});

	test("kinds never collide with each other", () => {
		const keys = [
			tierlistItemDedupeKey({ kind: "book", bookSlug: "dune" }),
			tierlistItemDedupeKey({ kind: "author", authorSlug: "dune" }),
			tierlistItemDedupeKey(text("dune")),
			tierlistItemDedupeKey({ kind: "image", imageUrl: "https://x/dune.webp" }),
		];
		expect(new Set(keys).size).toBe(4);
	});

	test("an item with nothing to point at has no key", () => {
		expect(tierlistItemDedupeKey(text("   "))).toBeNull();
		expect(tierlistItemDedupeKey({ kind: "book" })).toBeNull();
	});
});

describe("tierlistSetupProblems", () => {
	test("a small valid tierlist has no problems", () => {
		expect(
			tierlistSetupProblems(
				tiers([text("a"), { kind: "book", bookSlug: "dune" }], [text("b")]),
			),
		).toEqual([]);
	});

	test("an empty tier is fine, but at least one item must be placed", () => {
		expect(tierlistSetupProblems(tiers([text("a")], []))).toEqual([]);
		expect(tierlistSetupProblems(tiers([], []))).toEqual([
			"Place at least one item in a tier.",
		]);
	});

	test("two to eight tiers", () => {
		expect(tierlistSetupProblems(tiers([text("a")]))).toContain(
			"A tierlist has 2 to 8 tiers.",
		);
		const nine = tiers(...Array.from({ length: 9 }, () => [text("a")]));
		expect(tierlistSetupProblems(nine)).toContain(
			"A tierlist has 2 to 8 tiers.",
		);
	});

	test("eight tiers each with a different colour are allowed", () => {
		const eight = TIERLIST_COLORS.map((color, index) => ({
			name: `Tier ${index + 1}`,
			color,
			items: [text(`item ${index}`)],
		}));
		expect(tierlistSetupProblems(eight)).toEqual([]);
	});

	test("two tiers may share a colour", () => {
		const same = tiers([text("a")], [text("b")]).map((tier) => ({
			...tier,
			color: "blue",
		}));
		expect(tierlistSetupProblems(same)).toEqual([]);
	});

	test("tier names: required, short, unique", () => {
		const base = tiers([text("a")], [text("b")]);
		expect(
			tierlistSetupProblems([{ ...base[0], name: "  " }, base[1]] as never),
		).toContain("Every tier needs a name.");
		expect(
			tierlistSetupProblems([
				{ ...base[0], name: "x".repeat(21) },
				base[1],
			] as never),
		).toContain("Tier names can be up to 20 characters.");
		expect(
			tierlistSetupProblems([
				{ ...base[0], name: "Best" },
				{ ...base[1], name: " best " },
			] as never),
		).toContain('Two tiers are called "best".');
	});

	test("unknown colours are refused", () => {
		const base = tiers([text("a")], [text("b")]);
		expect(
			tierlistSetupProblems([{ ...base[0], color: "#fff" }, base[1]] as never)
				.length,
		).toBeGreaterThan(0);
	});

	test("the same item cannot be placed twice, even in different tiers", () => {
		expect(
			tierlistSetupProblems(
				tiers(
					[{ kind: "book", bookSlug: "dune" }],
					[{ kind: "book", bookSlug: "dune" }],
				),
			),
		).toContain("The same item is placed twice.");
		expect(
			tierlistSetupProblems(tiers([text("Dune")], [text(" dune ")])),
		).toContain("The same item is placed twice.");
	});

	test("each kind needs what it points at", () => {
		const problems = tierlistSetupProblems(
			tiers(
				[text(" "), { kind: "image" }, { kind: "book" }, { kind: "author" }],
				[text("ok")],
			),
		);
		expect(problems).toEqual(
			expect.arrayContaining([
				"A text item cannot be empty.",
				"An image item needs its picture.",
				"A book item needs a book.",
				"An author item needs an author.",
			]),
		);
	});

	test("an image caption is optional but short", () => {
		const image = { kind: "image" as const, imageUrl: "https://x/a.webp" };
		expect(tierlistSetupProblems(tiers([image], [text("b")]))).toEqual([]);
		expect(
			tierlistSetupProblems(
				tiers([{ ...image, label: "x".repeat(41) }], [text("b")]),
			),
		).toContain("Item text can be up to 40 characters.");
	});

	test("the item limit counts every tier", () => {
		const many = Array.from({ length: TIERLIST_MAX_ITEMS + 1 }, (_, index) =>
			text(`item ${index}`),
		);
		expect(
			tierlistSetupProblems(tiers(many.slice(0, 40), many.slice(40))),
		).toContain(`A tierlist can have up to ${TIERLIST_MAX_ITEMS} items.`);
		expect(
			tierlistSetupProblems(
				tiers(many.slice(0, 30), many.slice(30, TIERLIST_MAX_ITEMS)),
			),
		).toEqual([]);
	});
});

describe("normalizeTierlistText", () => {
	test("trims and collapses spaces", () => {
		expect(normalizeTierlistText("  a   b ")).toBe("a b");
		expect(normalizeTierlistText(null)).toBe("");
	});
});
