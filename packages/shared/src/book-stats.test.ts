import { describe, expect, test } from "bun:test";
import {
	bookFinishDaysHistogram,
	bookRatingHistogram,
	bookRatingsByMonth,
	bookReadsByMonth,
	bookStatsMonthIndex,
	competitionRank,
	medianNumber,
} from "./book-stats";

const idx = (year: number, month: number) =>
	bookStatsMonthIndex({ year, month });

describe("bookReadsByMonth", () => {
	test("returns nothing without reads", () => {
		expect(bookReadsByMonth([], idx(2026, 10))).toEqual([]);
	});

	test("keeps undated reads apart and fills gaps through the end month", () => {
		const rows = bookReadsByMonth(
			[
				{ finish: { year: 2026, month: 1 }, marked: { year: 2026, month: 5 } },
				{ finish: null, marked: { year: 2026, month: 3 } },
				{ finish: { year: 2026, month: 1 }, marked: { year: 2026, month: 1 } },
			],
			idx(2026, 4),
		);
		expect(rows.map((row) => [row.month, row.dated, row.undated])).toEqual([
			[1, 2, 0],
			[2, 0, 0],
			[3, 0, 1],
			[4, 0, 0],
		]);
	});

	test("extends past the end month when a read finishes later", () => {
		const rows = bookReadsByMonth(
			[{ finish: { year: 2026, month: 12 }, marked: { year: 2026, month: 2 } }],
			idx(2026, 10),
		);
		expect(rows.at(-1)).toMatchObject({ year: 2026, month: 12, dated: 1 });
	});
});

describe("bookRatingHistogram", () => {
	test("counts every half-star step", () => {
		const histogram = bookRatingHistogram([4.5, 4.5, 3, 0]);
		expect(histogram).toHaveLength(11);
		expect(histogram.find((row) => row.step === 4.5)?.count).toBe(2);
		expect(histogram.find((row) => row.step === 0)?.count).toBe(1);
	});
});

describe("bookRatingsByMonth", () => {
	test("carries the running average through quiet months", () => {
		const rows = bookRatingsByMonth(
			[
				{ month: { year: 2026, month: 1 }, rating: 4 },
				{ month: { year: 2026, month: 3 }, rating: 2 },
			],
			idx(2026, 3),
		);
		expect(rows.map((row) => row.average)).toEqual([4, 4, 3]);
		expect(rows.map((row) => row.cumulativeCount)).toEqual([1, 1, 2]);
		expect(rows.map((row) => row.newCount)).toEqual([1, 0, 1]);
	});
});

describe("competitionRank", () => {
	test("ties share a place", () => {
		const all = [10, 10, 7, 3];
		expect(competitionRank(10, all)).toBe(1);
		expect(competitionRank(7, all)).toBe(3);
		expect(competitionRank(3, all)).toBe(4);
	});
});

describe("medianNumber", () => {
	test("handles empty, odd and even lists", () => {
		expect(medianNumber([])).toBeNull();
		expect(medianNumber([3, 1, 2])).toBe(2);
		expect(medianNumber([4, 1, 2, 3])).toBe(2.5);
	});
});

describe("bookFinishDaysHistogram", () => {
	test("buckets days and puts long reads in the last bucket", () => {
		const buckets = bookFinishDaysHistogram([1, 5, 20, 100]);
		expect(buckets[0]?.count).toBe(1);
		expect(buckets[1]?.count).toBe(1);
		expect(buckets[3]?.count).toBe(1);
		expect(buckets.at(-1)?.count).toBe(1);
	});
});
