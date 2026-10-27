import { describe, expect, test } from "bun:test";
import {
	getLocaleFromPath,
	stripLocalePrefix,
	withLocalePrefix,
} from "./paths";

describe("stripLocalePrefix", () => {
	test("removes a language prefix and keeps the rest", () => {
		expect(stripLocalePrefix("/az/books/x")).toBe("/books/x");
		expect(stripLocalePrefix("/az/books/x?tab=a#top")).toBe(
			"/books/x?tab=a#top",
		);
		expect(stripLocalePrefix("/az")).toBe("/");
		expect(stripLocalePrefix("/az?x=1")).toBe("/?x=1");
	});

	test("leaves other paths alone", () => {
		expect(stripLocalePrefix("/books/x")).toBe("/books/x");
		expect(stripLocalePrefix("/")).toBe("/");
		expect(stripLocalePrefix("/azerbaijan")).toBe("/azerbaijan");
		expect(stripLocalePrefix("/api/az/x")).toBe("/api/az/x");
	});
});

describe("withLocalePrefix", () => {
	test("English is unprefixed, other languages are prefixed", () => {
		expect(withLocalePrefix("/books", "en")).toBe("/books");
		expect(withLocalePrefix("/books", "az")).toBe("/az/books");
		expect(withLocalePrefix("/", "az")).toBe("/az");
		expect(withLocalePrefix("/?a=1", "az")).toBe("/az?a=1");
	});

	test("never doubles a prefix", () => {
		expect(withLocalePrefix("/az/books", "az")).toBe("/az/books");
		expect(withLocalePrefix("/az/books", "en")).toBe("/books");
	});
});

describe("getLocaleFromPath", () => {
	test("reads the language prefix", () => {
		expect(getLocaleFromPath("/az/books")).toBe("az");
		expect(getLocaleFromPath("/books")).toBeNull();
		expect(getLocaleFromPath("/azerbaijan")).toBeNull();
	});
});
