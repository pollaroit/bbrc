import { describe, expect, test } from "bun:test";
import {
	dayRangeWhere,
	endOfDay,
	readEndRangeWhere,
	readFinishedOrderBy,
} from "./author-activity";
import { rangesOf } from "./author-books.service";
import { sortFollowers } from "./author-followers.service";

describe("date bounds", () => {
	test("endOfDay is the last millisecond of the UTC day", () => {
		expect(endOfDay(new Date("2025-03-04T00:00:00Z")).toISOString()).toBe(
			"2025-03-04T23:59:59.999Z",
		);
	});

	test("dayRangeWhere includes the whole 'to' day and is empty without bounds", () => {
		expect(dayRangeWhere(undefined, undefined)).toBeUndefined();
		const range = dayRangeWhere(
			new Date("2025-01-01T00:00:00Z"),
			new Date("2025-01-31T00:00:00Z"),
		);
		expect(range?.gte).toEqual(new Date("2025-01-01T00:00:00Z"));
		expect(range?.lte).toEqual(new Date("2025-01-31T23:59:59.999Z"));
	});

	test("readEndRangeWhere keeps year-only reads and never matches reads without a year", () => {
		expect(readEndRangeWhere(undefined, undefined)).toBeUndefined();
		const where = readEndRangeWhere(
			new Date("2024-06-10T00:00:00Z"),
			undefined,
		);
		expect(where).toEqual({
			AND: [
				{
					OR: [
						{ readEndYear: { gt: 2024 } },
						{ readEndYear: 2024, readEndMonth: { gte: 6 } },
						{ readEndYear: 2024, readEndMonth: null },
					],
				},
			],
		});
	});

	test("readEndRangeWhere combines from and to", () => {
		const where = readEndRangeWhere(
			new Date("2023-02-01T00:00:00Z"),
			new Date("2024-11-30T00:00:00Z"),
		);
		expect(where?.AND).toHaveLength(2);
	});
});

describe("ordering", () => {
	test("finish date sorts put unknown dates last in both directions", () => {
		for (const direction of ["asc", "desc"] as const) {
			expect(readFinishedOrderBy(direction)).toEqual([
				{ readEndYear: { sort: direction, nulls: "last" } },
				{ readEndMonth: { sort: direction, nulls: "last" } },
			]);
		}
	});
});

describe("followers sorting", () => {
	const rows = [
		{
			userId: "a",
			username: "ann",
			name: "Ann",
			joinedAt: 3,
			followedAt: 10,
			reads: 5,
			reviews: 1,
			authorReads: 2,
		},
		{
			userId: "b",
			username: "bob",
			name: "bob",
			joinedAt: 1,
			followedAt: 30,
			reads: 5,
			reviews: 4,
			authorReads: 0,
		},
		{
			userId: "c",
			username: "cat",
			name: "Cat",
			joinedAt: 2,
			followedAt: 20,
			reads: 9,
			reviews: 0,
			authorReads: 7,
		},
	];

	test("newest follow first by default order", () => {
		expect(
			sortFollowers(rows, "followedAt", "desc").map((r) => r.userId),
		).toEqual(["b", "c", "a"]);
	});

	test("name is case-insensitive", () => {
		expect(sortFollowers(rows, "name", "asc").map((r) => r.userId)).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	test("ties fall back to the username", () => {
		expect(sortFollowers(rows, "reads", "desc").map((r) => r.userId)).toEqual([
			"c",
			"a",
			"b",
		]);
	});

	test("author reads sort", () => {
		expect(
			sortFollowers(rows, "authorReads", "desc").map((r) => r.userId),
		).toEqual(["c", "a", "b"]);
	});
});

describe("book ranges", () => {
	test("min and max of pages and years, null without books", () => {
		expect(rangesOf([])).toEqual({ pages: null, publishedIn: null });
		expect(
			rangesOf([
				{ pages: 300, publishedIn: 1866 },
				{ pages: 120, publishedIn: 1880 },
			]),
		).toEqual({
			pages: { min: 120, max: 300 },
			publishedIn: { min: 1866, max: 1880 },
		});
	});
});
