import { describe, expect, test } from "bun:test";
import { buildPageLanguageUrls } from "./seo";

describe("buildPageLanguageUrls", () => {
	test("app text pages are their own canonical and list every language", () => {
		expect(buildPageLanguageUrls("/books/x", "az")).toEqual({
			canonical: "/az/books/x",
			languages: { en: "/books/x", az: "/az/books/x", "x-default": "/books/x" },
		});
		expect(buildPageLanguageUrls("/az/books/x", "en").canonical).toBe(
			"/books/x",
		);
	});

	test("the home page has no empty path", () => {
		expect(buildPageLanguageUrls("/", "az")).toEqual({
			canonical: "/az",
			languages: { en: "/", az: "/az", "x-default": "/" },
		});
	});

	test("member content points every language at the English page and offers no alternates", () => {
		expect(
			buildPageLanguageUrls("/az/posts/x", "az", { memberContent: true }),
		).toEqual({
			canonical: "/posts/x",
		});
	});
});
