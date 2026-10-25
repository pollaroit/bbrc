import { describe, expect, test } from "bun:test";
import { findMergeSuggestions } from "./merge-suggestions";

const author = (
	id: string,
	name: string,
	extra: Partial<Parameters<typeof findMergeSuggestions>[0][number]> = {},
) => ({
	id,
	name,
	wikidataId: null,
	openLibraryId: null,
	verified: false,
	...extra,
});

describe("findMergeSuggestions", () => {
	test("spelling variants are suggested", () => {
		const out = findMergeSuggestions([
			author("a", "Fyodor Dostoyevsky"),
			author("b", "Fiodor Dostoevski"),
			author("c", "Leo Tolstoy"),
		]);
		expect(out.map((s) => [s.aId, s.bId, s.reason])).toEqual([
			["a", "b", "similar_name"],
		]);
	});

	test("the same Wikidata id is always suggested, even for unlike names", () => {
		const out = findMergeSuggestions([
			author("a", "Mark Twain", { wikidataId: "Q7245", verified: true }),
			author("b", "Samuel Clemens", { wikidataId: "Q7245", verified: true }),
		]);
		expect(out[0]?.reason).toBe("wikidata_id");
	});

	test("two confirmed authors are left alone", () => {
		const out = findMergeSuggestions([
			author("a", "Fyodor Dostoyevsky", { verified: true }),
			author("b", "Fiodor Dostoevski", { verified: true }),
		]);
		expect(out).toEqual([]);
	});

	test("aliases count", () => {
		const out = findMergeSuggestions([
			author("a", "Mark Twain", { aliases: ["Mark Twein"] }),
			author("b", "Mark Twein"),
		]);
		expect(out.length).toBe(1);
	});
});
