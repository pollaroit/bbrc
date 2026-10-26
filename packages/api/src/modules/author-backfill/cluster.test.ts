import { describe, expect, test } from "bun:test";
import {
	chunk,
	clusterAuthorNames,
	mostCommon,
	olidsToLookUp,
	pickOlidForName,
	startOfUtcDay,
} from "./cluster";

describe("clusterAuthorNames", () => {
	const books = [
		{ id: "b1", authors: ["J. R. R. Tolkien"] },
		{ id: "b2", authors: ["J.R.R. Tolkien"] },
		{ id: "b3", authors: ["Tolkien, J. R. R."] },
		{ id: "b4", authors: ["Fyodor Dostoyevsky"] },
		{ id: "b5", authors: ["Fiodor Dostoevski", "Fyodor Dostoyevsky"] },
		{ id: "b6", authors: ["  "] },
	];

	test("one cluster per normalised name; spelling variants stay apart", () => {
		const clusters = clusterAuthorNames(books);
		const keys = clusters.map((cluster) => cluster.key);
		expect(keys.length).toBe(3);
		const tolkien = clusters.find((cluster) => cluster.key === "j r r tolkien");
		expect(tolkien?.bookIds.sort()).toEqual(["b1", "b2", "b3"]);
		expect(tolkien?.variants.length).toBe(3);
		// Alike but not identical (Dostoyevsky / Dostoevski) are suggestions, not one cluster.
		expect(clusters.filter((c) => /dosto/.test(c.key)).length).toBe(2);
	});

	test("the most used spelling is the name; biggest cluster first", () => {
		const clusters = clusterAuthorNames(books);
		expect(clusters[0]?.name).toBe("J. R. R. Tolkien");
		const dosto = clusters.find((c) => c.key.includes("dostoyevsky"));
		expect(dosto?.name).toBe("Fyodor Dostoyevsky");
		expect(dosto?.bookIds.sort()).toEqual(["b4", "b5"]);
	});
});

describe("pickOlidForName", () => {
	const names = new Map([
		["OL1A", ["Fyodor Dostoyevsky", "Fiodor Dostoevski"]],
		["OL2A", ["Constance Garnett"]],
	]);

	test("same count: the id at the same place, if the name resembles", () => {
		expect(
			pickOlidForName({
				bookNames: ["Fiodor Dostoevski", "Constance Garnett"],
				name: "Fiodor Dostoevski",
				workOlids: ["OL1A", "OL2A"],
				namesByOlid: names,
			}),
		).toBe("OL1A");
	});

	test("a reordered list never links the wrong person", () => {
		expect(
			pickOlidForName({
				bookNames: ["Constance Garnett", "Fiodor Dostoevski"],
				name: "Constance Garnett",
				workOlids: ["OL1A", "OL2A"],
				namesByOlid: names,
			}),
		).toBeNull();
	});

	test("different count: only a clearly matching record counts", () => {
		expect(
			pickOlidForName({
				bookNames: ["Fyodor Dostoyevsky"],
				name: "Fyodor Dostoyevsky",
				workOlids: ["OL2A", "OL1A", "OL3A"],
				namesByOlid: names,
			}),
		).toBe("OL1A");
		expect(
			pickOlidForName({
				bookNames: ["Someone Else"],
				name: "Someone Else",
				workOlids: ["OL2A", "OL1A", "OL3A"],
				namesByOlid: names,
			}),
		).toBeNull();
	});

	test("which ids need a lookup", () => {
		expect(
			olidsToLookUp({
				bookNames: ["A B", "C D"],
				name: "C D",
				workOlids: ["OL1A", "OL2A"],
			}),
		).toEqual(["OL2A"]);
		expect(
			olidsToLookUp({ bookNames: ["A B"], name: "A B", workOlids: [] }),
		).toEqual([]);
	});
});

describe("small helpers", () => {
	test("mostCommon, chunk, startOfUtcDay", () => {
		expect(mostCommon(["a", "b", "b"])).toBe("b");
		expect(mostCommon([])).toBeNull();
		expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
		expect(startOfUtcDay(new Date("2026-10-26T15:30:00Z"))).toBe(
			"2026-10-26T00:00:00.000Z",
		);
	});
});
