import { describe, expect, test } from "bun:test";
import { aiWorthAsking, buildAuthorAiPrompt, parseAiAuthorFacts } from "./ai";

const items = [
	{
		id: "a1",
		name: "Fyodor Dostoyevsky",
		wanted: ["bio", "birth", "nationalities", "gender", "birthPlace"] as const,
		sourceText:
			"Wikipedia summary: Russian novelist born in Moscow in 1821, he wrote many novels.",
	},
	{ id: "a2", name: "X", wanted: ["gender"] as const, sourceText: "" },
];

describe("parseAiAuthorFacts", () => {
	test("keeps valid wanted values and drops the rest", () => {
		const facts = parseAiAuthorFacts(
			{
				authors: [
					{
						id: "a1",
						bio: "A Russian novelist.",
						birthDate: "1821-11-11",
						deathDate: "1881-02-09", // not wanted
						birthPlace: "Moscow",
						nationalities: ["ru", "ZZ", "UK"],
						gender: "male",
					},
					{ id: "unknown", bio: "ignored" },
				],
			},
			items,
		);
		expect([...facts.keys()]).toEqual(["a1"]);
		const a1 = facts.get("a1");
		expect(a1?.birth).toEqual({ year: 1821, month: 11, day: 11 });
		expect(a1?.death).toBeUndefined();
		expect(a1?.nationalities).toEqual(["RU", "GB"]);
		expect(a1?.gender).toBe("male");
		expect(a1?.birthPlace).toBe("Moscow");
	});

	test("rejects guesses: bad dates, 'unknown', invalid gender", () => {
		const facts = parseAiAuthorFacts(
			{
				authors: [
					{
						id: "a1",
						birthDate: "around 1820",
						birthPlace: "unknown",
						gender: "robot",
						nationalities: [],
					},
				],
			},
			items,
		);
		expect(facts.size).toBe(0);
	});

	test("a death before the birth drops both", () => {
		const both = [
			{
				id: "a1",
				name: "N",
				wanted: ["birth", "death"] as const,
				sourceText: "x".repeat(50),
			},
		];
		const facts = parseAiAuthorFacts(
			{ authors: [{ id: "a1", birthDate: "1900", deathDate: "1850" }] },
			both,
		);
		expect(facts.size).toBe(0);
	});

	test("long bios are cut", () => {
		const facts = parseAiAuthorFacts(
			{ authors: [{ id: "a1", bio: `${"Sentence here. ".repeat(400)}` }] },
			items,
		);
		expect((facts.get("a1")?.bio ?? "").length).toBeLessThanOrEqual(2001);
	});
});

describe("prompt", () => {
	test("lists the wanted fields and the source text only", () => {
		const prompt = buildAuthorAiPrompt(items);
		expect(prompt).toContain("id=a1");
		expect(prompt).toContain(
			"WANTED: bio, birth, nationalities, gender, birthPlace",
		);
		expect(prompt).toContain("Russian novelist born in Moscow");
		expect(prompt).toContain("(none)");
	});

	test("no source text, no question", () => {
		const [first, second] = items;
		expect(aiWorthAsking(first as never)).toBe(true);
		expect(aiWorthAsking(second as never)).toBe(false);
	});
});
