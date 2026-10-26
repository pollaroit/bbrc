import { describe, expect, test } from "bun:test";
import {
	compareSummaryLine,
	describeScoreBand,
	pairKey,
	RATING_FULL_WEIGHT_AT,
	scoreComparison,
	topKMean,
} from "./user-compare";

const reads = (...items: [string, number | null][]) =>
	items.map(([bookId, rating]) => ({ bookId, rating }));

describe("scoreComparison", () => {
	test("empty sets score 0", () => {
		const score = scoreComparison([], []);
		expect(score.overall).toBe(0);
		expect(score.sharedCount).toBe(0);
		expect(score.ratingAgreement).toBeNull();
	});

	test("no shared book is 0 even with reads", () => {
		const score = scoreComparison(reads(["a", 5]), reads(["b", 5]));
		expect(score.overall).toBe(0);
		expect(score.onlyACount).toBe(1);
		expect(score.onlyBCount).toBe(1);
	});

	test("identical books and ratings is 100", () => {
		const list = Array.from({ length: 10 }, (_, i) => `b${i}`).map((id, i) => ({
			bookId: id,
			rating: 3 + (i % 3),
		}));
		const score = scoreComparison(list, [...list]);
		expect(score.overall).toBe(100);
		expect(score.overlap).toBe(100);
		expect(score.ratingAgreement).toBe(100);
		expect(score.confidence).toBe("high");
	});

	test("identical books without any ratings is overlap only (100)", () => {
		const list = reads(["a", null], ["b", null]);
		const score = scoreComparison(list, list);
		expect(score.overall).toBe(100);
		expect(score.ratingAgreement).toBeNull();
		expect(score.perBook.every((book) => book.score === null)).toBe(true);
	});

	test("one-sided ratings do not count as co-rated", () => {
		const score = scoreComparison(
			reads(["a", 5], ["b", 4]),
			reads(["a", null], ["b", 4]),
		);
		expect(score.coRatedCount).toBe(1);
		expect(score.perBook.find((book) => book.bookId === "a")?.score).toBeNull();
	});

	test("same books but opposite ratings score lower than same ratings", () => {
		const ids = ["a", "b", "c", "d", "e"];
		const same = scoreComparison(
			ids.map((bookId) => ({ bookId, rating: 5 })),
			ids.map((bookId) => ({ bookId, rating: 5 })),
		);
		const opposite = scoreComparison(
			ids.map((bookId) => ({ bookId, rating: 5 })),
			ids.map((bookId) => ({ bookId, rating: 1 })),
		);
		expect(same.overall).toBe(100);
		expect(opposite.overall).toBeLessThan(same.overall);
		expect(opposite.ratingAgreement).toBe(20);
		expect(opposite.overall).toBe(68); // 60 + 0.4 * 20
	});

	test("rating part is shrunk toward neutral with few co-rated books", () => {
		const one = scoreComparison(reads(["a", 5]), reads(["a", 5]));
		// weight 1/5: 0.2 * 100 + 0.8 * 50 = 60; overall = 60 + 0.4 * 60 = 84
		expect(one.overall).toBe(84);
		expect(RATING_FULL_WEIGHT_AT).toBe(5);
		const poor = scoreComparison(reads(["a", 5]), reads(["a", 0]));
		// agreement 0, weight 0.2 -> shrunk 40; overall = 60 + 16 = 76
		expect(poor.overall).toBe(76);
		expect(one.confidence).toBe("low");
	});

	test("partial overlap uses the Jaccard share", () => {
		const score = scoreComparison(
			reads(["a", null], ["b", null]),
			reads(["b", null], ["c", null]),
		);
		expect(score.overlap).toBe(33);
		expect(score.overall).toBe(33);
	});

	test("order of the two members does not matter", () => {
		const a = reads(["a", 4], ["b", 3], ["c", 5]);
		const b = reads(["b", 5], ["c", 5], ["d", 2]);
		expect(scoreComparison(a, b).overall).toBe(scoreComparison(b, a).overall);
	});
});

describe("helpers", () => {
	test("pairKey is symmetric", () => {
		expect(pairKey("x", "y")).toBe(pairKey("y", "x"));
	});

	test("topKMean", () => {
		expect(topKMean([], 5)).toBe(0);
		expect(topKMean([10, 90, 50], 2)).toBe(70);
		expect(topKMean([10, 20], 5)).toBe(15);
	});

	test("describeScoreBand", () => {
		expect(describeScoreBand(0).label).toBe("Nothing in common");
		expect(describeScoreBand(20).key).toBe("different");
		expect(describeScoreBand(45).key).toBe("some_overlap");
		expect(describeScoreBand(70).key).toBe("very_similar");
		expect(describeScoreBand(95).key).toBe("twins");
	});

	test("summary line", () => {
		expect(compareSummaryLine(scoreComparison([], []))).toContain(
			"not read any",
		);
		const score = scoreComparison(
			reads(["a", 5], ["b", 2]),
			reads(["a", 5], ["b", 5]),
		);
		expect(compareSummaryLine(score)).toContain("1 of 2");
	});
});
