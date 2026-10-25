import { describe, expect, test } from "bun:test";
import {
	isDirectBookLookup,
	isValidIsbn,
	isValidIsbn10,
	isValidIsbn13,
	normalizeIsbn,
	parseBookLookup,
	parseTitleList,
} from "./book-lookup";

describe("isbn", () => {
	test("valid isbn-13", () => {
		expect(isValidIsbn13("9780743273565")).toBe(true);
		expect(isValidIsbn13("978-0-7432-7356-5")).toBe(true);
	});
	test("invalid isbn-13 checksum", () => {
		expect(isValidIsbn13("9780743273566")).toBe(false);
		expect(isValidIsbn13("978074327356")).toBe(false);
	});
	test("valid isbn-10 including X", () => {
		expect(isValidIsbn10("0743273567")).toBe(true);
		expect(isValidIsbn10("080442957X")).toBe(true);
		expect(isValidIsbn10("080442957x")).toBe(true);
	});
	test("invalid isbn-10", () => {
		expect(isValidIsbn10("0743273568")).toBe(false);
		expect(isValidIsbn10("123")).toBe(false);
	});
	test("either length", () => {
		expect(isValidIsbn("0-7432-7356-7")).toBe(true);
		expect(isValidIsbn("hello")).toBe(false);
	});
	test("normalizes separators and case", () => {
		expect(normalizeIsbn(" 978-0-7432 7356-5 ")).toBe("9780743273565");
		expect(normalizeIsbn("0-8044-2957-x")).toBe("080442957X");
	});
});

describe("parseBookLookup", () => {
	test("plain text stays a search", () => {
		expect(parseBookLookup("the great gatsby")).toEqual({
			kind: "text",
			query: "the great gatsby",
		});
		expect(parseBookLookup("   ")).toEqual({ kind: "text", query: "" });
	});
	test("a bare work id", () => {
		expect(parseBookLookup("ol82563w")).toEqual({
			kind: "olid",
			olid: "OL82563W",
		});
	});
	test("an Open Library work link, with or without a title", () => {
		expect(
			parseBookLookup(
				"https://openlibrary.org/works/OL468431W/The_Great_Gatsby",
			),
		).toEqual({ kind: "olid", olid: "OL468431W" });
		expect(parseBookLookup("openlibrary.org/works/OL468431W")).toEqual({
			kind: "olid",
			olid: "OL468431W",
		});
	});
	test("edition id and edition link", () => {
		expect(parseBookLookup("OL7353617M")).toEqual({
			kind: "edition",
			editionOlid: "OL7353617M",
		});
		expect(
			parseBookLookup(
				"https://openlibrary.org/books/OL7353617M/Fantastic_Mr._Fox",
			),
		).toEqual({ kind: "edition", editionOlid: "OL7353617M" });
	});
	test("isbn typed with separators or a prefix", () => {
		expect(parseBookLookup("978-0-7432-7356-5")).toEqual({
			kind: "isbn",
			isbn: "9780743273565",
		});
		expect(parseBookLookup("ISBN: 0743273567")).toEqual({
			kind: "isbn",
			isbn: "0743273567",
		});
	});
	test("an invalid isbn is just text", () => {
		expect(parseBookLookup("9780743273566").kind).toBe("text");
	});
	test("an Open Library isbn link", () => {
		expect(
			parseBookLookup("https://openlibrary.org/isbn/9780743273565"),
		).toEqual({ kind: "isbn", isbn: "9780743273565" });
	});
	test("goodreads links give a title to search", () => {
		expect(
			parseBookLookup(
				"https://www.goodreads.com/book/show/4671.The_Great_Gatsby",
			),
		).toEqual({ kind: "goodreads", query: "The Great Gatsby" });
		expect(
			parseBookLookup("https://www.goodreads.com/book/show/5470-1984?ref=x"),
		).toEqual({ kind: "goodreads", query: "1984" });
	});
	test("a goodreads link with no title falls back to text", () => {
		expect(
			parseBookLookup("https://www.goodreads.com/book/show/4671").kind,
		).toBe("text");
	});
	test("other links are text", () => {
		expect(parseBookLookup("https://example.com/book").kind).toBe("text");
	});
	test("which lookups point at one book", () => {
		expect(isDirectBookLookup(parseBookLookup("OL82563W"))).toBe(true);
		expect(isDirectBookLookup(parseBookLookup("9780743273565"))).toBe(true);
		expect(isDirectBookLookup(parseBookLookup("gatsby"))).toBe(false);
		expect(
			isDirectBookLookup(
				parseBookLookup("https://www.goodreads.com/book/show/5470-1984"),
			),
		).toBe(false);
	});
});

describe("parseTitleList", () => {
	test("one title per line, cleaned", () => {
		expect(
			parseTitleList("1. Dune\n- Emma  \n\n• The Trial\nDune\nx\n  "),
		).toEqual(["Dune", "Emma", "The Trial"]);
	});
	test("handles windows line breaks and the cap", () => {
		expect(parseTitleList("A book\r\nAnother book", 1)).toEqual(["A book"]);
	});
});
