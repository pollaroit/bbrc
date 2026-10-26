import { describe, expect, test } from "bun:test";
import { scoreComparison } from "@bbrc/shared";
import {
	aggregateMembers,
	buildMatrix,
	buildPairs,
	eligibleMembers,
	filtersCacheKey,
	isListedPair,
	rankMembers,
	rankPairs,
	readInWindow,
	type StatsMember,
	scoreHistogram,
	selectMatrixMembers,
	TtlCache,
	topKMean,
} from "./compare-stats";

type U = { name: string };

function member(
	name: string,
	reads: [string, number | null][],
): StatsMember<U> {
	return {
		userId: name,
		user: { name },
		reads: reads.map(([bookId, rating]) => ({ bookId, rating })),
	};
}

const nameOf = (user: U) => user.name;
const books = (...ids: string[]) =>
	ids.map((id) => [id, 4] as [string, number | null]);

describe("thresholds", () => {
	test("a pair is listed with 3 shared books or when each has 5 reads", () => {
		expect(isListedPair(3, 3, 3)).toBe(true);
		expect(isListedPair(2, 4, 40)).toBe(false);
		expect(isListedPair(0, 5, 5)).toBe(true);
		expect(isListedPair(0, 5, 4)).toBe(false);
	});

	test("members need at least 3 reads", () => {
		const members = [
			member("a", books("1", "2")),
			member("b", books("1", "2", "3")),
		];
		expect(eligibleMembers(members).map((m) => m.userId)).toEqual(["b"]);
	});
});

describe("buildPairs", () => {
	const members = [
		member("ann", books("1", "2", "3", "4")),
		member("bob", books("1", "2", "3", "4")),
		member("cat", books("7", "8", "9")),
		member("dan", books("1")),
	];

	test("scores each pair of eligible members once", () => {
		const pairs = buildPairs(members, scoreComparison);
		expect(pairs).toHaveLength(3);
		const annBob = pairs.find(
			(p) => p.a.userId === "ann" && p.b.userId === "bob",
		);
		// Identical reads and ratings, but only 4 co-rated books: the rating part is shrunk a little.
		expect(annBob?.overall).toBeGreaterThan(90);
		const annCat = pairs.find(
			(p) => p.b.userId === "cat" && p.a.userId === "ann",
		);
		expect(annCat?.overall).toBe(0);
		expect(
			pairs.some((p) => p.a.userId === "dan" || p.b.userId === "dan"),
		).toBe(false);
	});

	test("lists only pairs that pass the thresholds", () => {
		const pairs = buildPairs(members, scoreComparison);
		const ranked = rankPairs(pairs, nameOf);
		// ann+bob share 4 books; the cat pairs share none and cat has 3 reads.
		expect(ranked.top).toHaveLength(1);
		expect(ranked.bottom).toHaveLength(1);
		expect(ranked.top[0]?.a.userId).toBe("ann");
	});
});

describe("ranking members", () => {
	const members = [
		member("ann", books("1", "2", "3", "4", "5")),
		member("bob", books("1", "2", "3", "4", "5")),
		member("cat", books("1", "2", "3", "9", "10")),
		member("dan", books("20", "21", "22", "23", "24")),
	];
	const pairs = buildPairs(members, scoreComparison);
	const aggregates = aggregateMembers(pairs);

	test("aggregates every member with their peers and closest peer", () => {
		expect(aggregates).toHaveLength(4);
		const ann = aggregates.find((a) => a.member.userId === "ann");
		expect(ann?.peers).toBe(3);
		expect(ann?.closest?.member.userId).toBe("bob");
	});

	test("the most unique member has the lowest mean score", () => {
		const { mostSimilar, mostUnique } = rankMembers(aggregates, nameOf, 2);
		expect(mostUnique[0]?.member.userId).toBe("dan");
		expect(["ann", "bob"]).toContain(mostSimilar[0]?.member.userId as string);
		expect(mostSimilar).toHaveLength(2);
	});
});

describe("topKMean", () => {
	test("averages the best k and copes with short lists", () => {
		expect(topKMean([10, 90, 50], 2)).toBe(70);
		expect(topKMean([40], 5)).toBe(40);
		expect(topKMean([], 5)).toBe(0);
	});
});

describe("matrix and histogram", () => {
	const members = [
		member("ann", books("1", "2", "3", "4")),
		member("bob", books("1", "2", "3")),
		member("cat", books("1", "2")),
		member("dan", books("1", "2", "3", "4", "5")),
	];

	test("selects the members with most reads, only eligible ones", () => {
		const selected = selectMatrixMembers(members, nameOf, 2);
		expect(selected.map((m) => m.userId)).toEqual(["dan", "ann"]);
	});

	test("the matrix is symmetric with an empty diagonal", () => {
		const selected = selectMatrixMembers(members, nameOf);
		const pairs = buildPairs(members, scoreComparison);
		const matrix = buildMatrix(selected, pairs);
		expect(matrix).toHaveLength(3);
		for (let i = 0; i < matrix.length; i++) {
			expect(matrix[i]?.[i]).toBeNull();
			for (let j = 0; j < matrix.length; j++) {
				expect(matrix[i]?.[j]).toBe(matrix[j]?.[i] ?? null);
			}
		}
	});

	test("the histogram has ten buckets and puts 100 in the last", () => {
		const histogram = scoreHistogram([0, 9, 10, 55, 99, 100]);
		expect(histogram).toHaveLength(10);
		expect(histogram[0]).toEqual({ from: 0, to: 9, count: 2 });
		expect(histogram[1]?.count).toBe(1);
		expect(histogram[5]?.count).toBe(1);
		expect(histogram[9]).toEqual({ from: 90, to: 100, count: 2 });
		expect(histogram.reduce((sum, b) => sum + b.count, 0)).toBe(6);
	});
});

describe("readInWindow", () => {
	const from = new Date(Date.UTC(2025, 2, 1));
	const to = new Date(Date.UTC(2025, 5, 30));

	test("everything counts without a window, including undated reads", () => {
		expect(readInWindow({ readEndYear: null, readEndMonth: null }, {})).toBe(
			true,
		);
	});

	test("undated reads are left out while a window is set", () => {
		expect(
			readInWindow({ readEndYear: null, readEndMonth: null }, { from }),
		).toBe(false);
	});

	test("a finish month counts when it overlaps the window", () => {
		expect(
			readInWindow({ readEndYear: 2025, readEndMonth: 3 }, { from, to }),
		).toBe(true);
		expect(
			readInWindow({ readEndYear: 2025, readEndMonth: 2 }, { from, to }),
		).toBe(false);
		expect(
			readInWindow({ readEndYear: 2025, readEndMonth: 7 }, { from, to }),
		).toBe(false);
		// A year-only read covers the whole year.
		expect(
			readInWindow({ readEndYear: 2025, readEndMonth: null }, { from, to }),
		).toBe(true);
	});
});

describe("cache", () => {
	test("the key ignores order, case and duplicates", () => {
		expect(filtersCacheKey({ users: ["B", "a", "a"], books: ["x"] })).toBe(
			filtersCacheKey({ users: ["a", "b"], books: ["X"] }),
		);
		expect(filtersCacheKey({ users: ["a"] })).not.toBe(
			filtersCacheKey({ users: ["b"] }),
		);
	});

	test("entries expire and the oldest are dropped past the limit", () => {
		const cache = new TtlCache<number>(1000, 2);
		cache.set("a", 1, 0);
		cache.set("b", 2, 0);
		cache.set("c", 3, 0);
		expect(cache.get("a", 10)).toBeUndefined();
		expect(cache.get("b", 10)).toBe(2);
		expect(cache.get("b", 2000)).toBeUndefined();
		expect(cache.size).toBe(1);
	});
});
