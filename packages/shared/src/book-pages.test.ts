import { describe, expect, test } from "bun:test";
import { pagesFromEditions } from "./book-pages";

describe("pagesFromEditions", () => {
	test("uses the suggested median", () => {
		expect(
			pagesFromEditions({ suggestedPages: 312, pageCountHints: [100] }),
		).toBe(312);
	});
	test("falls back to the median of the sample", () => {
		expect(
			pagesFromEditions({
				suggestedPages: null,
				pageCountHints: [200, 250, 400],
			}),
		).toBe(250);
		expect(pagesFromEditions({ pageCountHints: [200, 300] })).toBe(250);
	});
	test("ignores zero and absurd counts", () => {
		expect(
			pagesFromEditions({
				suggestedPages: 0,
				pageCountHints: [0, 1, 99999, 320],
			}),
		).toBe(320);
		expect(
			pagesFromEditions({ suggestedPages: 40000, pageCountHints: [] }),
		).toBeNull();
	});
	test("nothing to go on", () => {
		expect(pagesFromEditions({})).toBeNull();
	});
});
