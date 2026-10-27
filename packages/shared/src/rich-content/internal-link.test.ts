import { describe, expect, test } from "bun:test";
import { internalLinkRefFromHref } from "./internal-link";

describe("internalLinkRefFromHref", () => {
	test("maps in-app paths to refs", () => {
		expect(internalLinkRefFromHref("/books/dune")).toEqual({
			kind: "book",
			slug: "dune",
		});
		expect(internalLinkRefFromHref("/books/dune?tab=a#x")).toEqual({
			kind: "book",
			slug: "dune",
		});
	});

	test("a link in another language points at the same thing", () => {
		expect(internalLinkRefFromHref("/az/books/dune")).toEqual({
			kind: "book",
			slug: "dune",
		});
	});

	test("outside links and protocol-relative addresses are not on-site", () => {
		expect(
			internalLinkRefFromHref("https://example.com/books/dune"),
		).toBeNull();
		expect(internalLinkRefFromHref("//evil.com/books/dune")).toBeNull();
		expect(internalLinkRefFromHref("/az//evil.com")).toBeNull();
	});
});
