import { describe, expect, test } from "bun:test";
import {
	authorAgeLine,
	bucketByDecade,
	describeRelatedReasons,
	median,
	ratingDistribution,
	readProgress,
	scoreRelatedAuthor,
} from "./author-insights";

describe("authorAgeLine", () => {
	test("died aged, year precision", () => {
		const line = authorAgeLine({
			birth: { year: 1821 },
			death: { year: 1881 },
		});
		expect(line).toEqual({ kind: "died", age: 60, text: "died aged 60" });
	});

	test("month and day make it exact", () => {
		const line = authorAgeLine({
			birth: { year: 1821, month: 11, day: 11 },
			death: { year: 1881, month: 2, day: 9 },
		});
		expect(line.text).toBe("died aged 59");
	});

	test("living author", () => {
		const line = authorAgeLine({
			birth: { year: 1960, month: 1, day: 1 },
			death: { year: null },
			now: new Date("2026-06-01T00:00:00Z"),
		});
		expect(line).toEqual({ kind: "alive", age: 66, text: "aged 66" });
	});

	test("unknown birth or implausible age is unknown", () => {
		expect(
			authorAgeLine({ birth: { year: null }, death: { year: null } }).kind,
		).toBe("unknown");
		expect(
			authorAgeLine({
				birth: { year: 1700 },
				death: { year: null },
				now: new Date("2026-01-01T00:00:00Z"),
			}).kind,
		).toBe("unknown");
	});

	test("death without birth", () => {
		expect(
			authorAgeLine({ birth: { year: null }, death: { year: 1900 } }),
		).toEqual({ kind: "died", age: null, text: "died" });
	});
});

describe("readProgress", () => {
	test("counts and percent", () => {
		expect(readProgress(3, 7)).toEqual({ read: 3, total: 7, percent: 43 });
	});
	test("clamps and handles empty", () => {
		expect(readProgress(9, 7).read).toBe(7);
		expect(readProgress(0, 0)).toEqual({ read: 0, total: 0, percent: 0 });
	});
});

describe("bucketByDecade", () => {
	test("groups, sorts, skips unknown", () => {
		expect(bucketByDecade([1954, 1959, 1937, null, 0, 2001])).toEqual([
			{ decade: 1930, count: 1 },
			{ decade: 1950, count: 2 },
			{ decade: 2000, count: 1 },
		]);
	});
});

describe("ratingDistribution", () => {
	test("half-star buckets", () => {
		const buckets = ratingDistribution([5, 4.5, 4.5, 0.5, 3.4]);
		expect(buckets).toHaveLength(10);
		expect(buckets.find((b) => b.rating === 4.5)?.count).toBe(2);
		expect(buckets.find((b) => b.rating === 5)?.count).toBe(1);
		expect(buckets.find((b) => b.rating === 0.5)?.count).toBe(1);
		expect(buckets.find((b) => b.rating === 3.5)?.count).toBe(1);
	});
});

describe("scoreRelatedAuthor", () => {
	const source = { nationalities: ["RU"], birthYear: 1821 };
	test("nationality + era + co-readers", () => {
		const result = scoreRelatedAuthor({
			source,
			candidate: { nationalities: ["RU", "UA"], birthYear: 1828 },
			coReaders: 2,
		});
		expect(result.reasons.map((r) => r.kind)).toEqual([
			"nationality",
			"era",
			"co_read",
		]);
		expect(result.score).toBeGreaterThan(5);
	});
	test("unrelated scores zero", () => {
		const result = scoreRelatedAuthor({
			source,
			candidate: { nationalities: ["JP"], birthYear: 1950 },
			coReaders: 0,
		});
		expect(result).toEqual({ score: 0, reasons: [] });
	});
	test("era window is 40 years", () => {
		expect(
			scoreRelatedAuthor({
				source,
				candidate: { nationalities: [], birthYear: 1861 },
				coReaders: 0,
			}).reasons,
		).toHaveLength(1);
		expect(
			scoreRelatedAuthor({
				source,
				candidate: { nationalities: [], birthYear: 1862 },
				coReaders: 0,
			}).reasons,
		).toHaveLength(0);
	});
});

describe("describeRelatedReasons", () => {
	test("joins reasons", () => {
		expect(
			describeRelatedReasons(
				[
					{ kind: "nationality", countries: ["RU"] },
					{ kind: "era", yearsApart: 7 },
					{ kind: "co_read", members: 3 },
				],
				(code) => (code === "RU" ? "Russia" : code),
			),
		).toBe("Both from Russia · Born 7 years apart · 3 members read both");
	});
	test("singular and same year", () => {
		expect(
			describeRelatedReasons([
				{ kind: "era", yearsApart: 0 },
				{ kind: "co_read", members: 1 },
			]),
		).toBe("Born the same year · 1 member reads both");
	});
});

describe("median", () => {
	test("odd, even, empty", () => {
		expect(median([3, 1, 2])).toBe(2);
		expect(median([4, 1, 2, 3])).toBe(2.5);
		expect(median([])).toBeNull();
	});
});
