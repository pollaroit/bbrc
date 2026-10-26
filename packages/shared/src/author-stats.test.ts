import { describe, expect, test } from "bun:test";
import {
	bucketPageCounts,
	bucketReadingDays,
	compareStat,
	cumulativeSeries,
	fillMonthSeries,
	mean,
	monthRange,
	previousRange,
	seasonality,
} from "./author-stats";

describe("author stats helpers", () => {
	test("monthRange crosses years", () => {
		expect(monthRange("2023-11", "2024-02")).toEqual([
			"2023-11",
			"2023-12",
			"2024-01",
			"2024-02",
		]);
		expect(monthRange("2024-05", "2024-03")).toEqual([]);
	});

	test("fillMonthSeries fills gaps with zeros", () => {
		const series = fillMonthSeries(
			new Map([
				["2024-01", 2],
				["2024-04", 1],
			]),
		);
		expect(series.map((point) => point.count)).toEqual([2, 0, 0, 1]);
		expect(fillMonthSeries(new Map())).toEqual([]);
	});

	test("cumulativeSeries keeps a running total", () => {
		const out = cumulativeSeries([{ count: 2 }, { count: 0 }, { count: 3 }]);
		expect(out.map((point) => point.total)).toEqual([2, 2, 5]);
	});

	test("seasonality counts calendar months and ignores bad values", () => {
		const out = seasonality([1, 1, 12, null, 13, 0]);
		expect(out[0]?.count).toBe(2);
		expect(out[11]?.count).toBe(1);
		expect(out.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(3);
	});

	test("reading day and page buckets", () => {
		const days = bucketReadingDays([1, 3, 10, 100, -1]);
		expect(days.map((bucket) => bucket.count)).toEqual([1, 1, 1, 0, 0, 0, 1]);
		const pages = bucketPageCounts([100, 350, 1200]);
		expect(pages.map((bucket) => bucket.count)).toEqual([1, 0, 1, 0, 0, 1]);
	});

	test("compareStat handles a missing or zero previous value", () => {
		expect(compareStat(5, null).delta).toBeNull();
		expect(compareStat(5, 0).deltaPercent).toBeNull();
		expect(compareStat(15, 10)).toEqual({
			value: 15,
			previous: 10,
			delta: 5,
			deltaPercent: 50,
		});
	});

	test("previousRange is the equal window right before", () => {
		const range = previousRange({
			from: new Date("2024-02-01T00:00:00Z"),
			to: new Date("2024-02-29T23:59:59Z"),
		});
		expect(range).not.toBeNull();
		expect(range?.to.getTime()).toBe(
			new Date("2024-02-01T00:00:00Z").getTime() - 1,
		);
		expect(previousRange({ from: new Date() })).toBeNull();
	});

	test("mean", () => {
		expect(mean([])).toBeNull();
		expect(mean([1, 2, 3])).toBe(2);
	});
});
