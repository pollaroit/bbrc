import { describe, expect, it } from "bun:test";
import {
	authorRows,
	countryRows,
	popularRows,
	ratedSubjectRows,
	seriesRows,
	type TasteBook,
} from "./index";

const book = (id: string, over: Partial<TasteBook> = {}): TasteBook => ({
	id,
	slug: id,
	title: `Book ${id}`,
	authors: ["Ana Quill"],
	authorLinks: [
		{
			author: {
				id: "a1",
				slug: "ana-quill",
				name: "Ana Quill",
				photoUrl: "https://x/ana.webp",
			},
		},
	],
	coverId: null,
	countries: ["GB"],
	subjects: ["Fantasy"],
	seriesMembership: null,
	...over,
});

const other = (id: string) =>
	book(id, {
		authors: ["Bo Reed"],
		authorLinks: [
			{
				author: { id: "a2", slug: "bo-reed", name: "Bo Reed", photoUrl: null },
			},
		],
		countries: ["US", "CA"],
		subjects: ["Fiction, general"],
	});

const ratings = new Map([
	["b1", 5],
	["b2", 4],
	["b3", 2],
	["b4", 3],
]);

const books = [book("b1"), book("b2"), other("b3"), other("b4")];

describe("authorRows", () => {
	it("ranks authors by books, with photos and the member's average", () => {
		const { byCount } = authorRows(books, ratings);
		expect(byCount.map((row) => row.label)).toEqual(["Ana Quill", "Bo Reed"]);
		expect(byCount[0]).toMatchObject({
			count: 2,
			average: 4.5,
			photoUrl: "https://x/ana.webp",
			topBook: { id: "b1" },
		});
		expect(byCount[1]?.photoUrl).toBeNull();
	});

	it("ranks by rating only among authors with at least two books", () => {
		const { byRating } = authorRows(books, ratings);
		expect(byRating?.map((row) => row.label)).toEqual(["Ana Quill", "Bo Reed"]);
		const single = authorRows([book("b1")], ratings);
		expect(single.byRating).toEqual([]);
	});

	it("carries no rating at all when ratings are hidden", () => {
		const { byCount, byRating } = authorRows(books, null);
		expect(byRating).toBeNull();
		expect(
			byCount.every((row) => row.average === null && row.topBook === null),
		).toBe(true);
	});
});

describe("countryRows", () => {
	it("counts a country once per book and averages the member's ratings", () => {
		const rows = countryRows(books, ratings);
		// All three countries have two books, so ties fall back to the code.
		expect(rows.map((row) => row.code)).toEqual(["CA", "GB", "US"]);
		expect(rows.find((row) => row.code === "GB")).toMatchObject({
			count: 2,
			average: 4.5,
		});
		expect(rows.find((row) => row.code === "US")).toMatchObject({
			count: 2,
			average: 2.5,
		});
		expect(countryRows(books, null).every((row) => row.average === null)).toBe(
			true,
		);
	});
});

describe("seriesRows", () => {
	it("groups the books of a series and keeps its size", () => {
		const inSeries = (id: string) =>
			book(id, {
				seriesMembership: {
					series: { id: "s1", slug: "saga", title: "The Saga", bookCount: 7 },
				},
			});
		const rows = seriesRows([inSeries("x"), inSeries("y"), book("z")]);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ slug: "saga", read: 2, total: 7 });
		expect(rows[0]?.books.map((b) => b.id)).toEqual(["x", "y"]);
	});
});

describe("ratedSubjectRows", () => {
	it("lists subjects by the member's average, needing two rated books", () => {
		const rows = ratedSubjectRows(books, ratings);
		expect(rows.map((row) => row.subject)).toEqual(["Fantasy", "Fiction"]);
		expect(rows[0]).toMatchObject({ average: 4.5, count: 2 });
		expect(ratedSubjectRows([book("b1")], ratings)).toEqual([]);
	});
});

describe("popularRows", () => {
	it("orders the member's books by how many in the club read them", () => {
		const clubReads = new Map([
			["b1", 9],
			["b2", 1],
			["b3", 4],
		]);
		const { most, least } = popularRows(books, clubReads, 2);
		expect(most.map((row) => row.id)).toEqual(["b1", "b3"]);
		expect(least.map((row) => row.id)).toEqual(["b4", "b2"]);
		expect(least[0]?.clubReads).toBe(0);
	});
});
