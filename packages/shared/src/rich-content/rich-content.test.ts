import { describe, expect, it } from "bun:test";
import { internalLinkRefFromHref } from "./internal-link";
import { parseMarkdownSubsetToRichDocument } from "./parse-markdown";
import {
	contentPlainText,
	normalizeContentForStorage,
	parseStoredContent,
} from "./stored";
import type { RichDocument } from "./types";
import { RICH_EMBED_LIMIT, validateRichDocument } from "./validate";

describe("rich content", () => {
	it("parses markdown subset", () => {
		const doc = parseMarkdownSubsetToRichDocument(
			"# Title\n\n**bold** and @alice\n\n> quote line",
		);
		expect(doc.blocks[0]?.t).toBe("h");
		expect(contentPlainText(normalizeContentForStorage("hello"))).toBe("hello");
	});

	it("stores canonical JSON", () => {
		const stored = normalizeContentForStorage("**Hi**");
		expect(stored.startsWith('{"v":1')).toBe(true);
		const roundTrip = parseStoredContent(stored);
		const first = roundTrip.blocks[0];
		expect(first?.t === "embed" ? null : first?.inline[0]?.t).toBe("text");
	});

	it("detects internal links", () => {
		expect(internalLinkRefFromHref("/books/war-and-peace")).toEqual({
			kind: "book",
			slug: "war-and-peace",
		});
	});

	it("detects author pages", () => {
		expect(internalLinkRefFromHref("/authors/ursula_k_le_guin")).toEqual({
			kind: "author",
			slug: "ursula_k_le_guin",
		});
	});

	it("ignores query strings and anchors on internal links", () => {
		expect(internalLinkRefFromHref("/posts/hello?x=1#comments")).toEqual({
			kind: "post",
			slug: "hello",
		});
		// A full URL could be any site, so it is never treated as on-site here.
		expect(
			internalLinkRefFromHref("https://evil.example/users/ann"),
		).toBeNull();
	});
});

describe("link cards", () => {
	const embed = (href: string) => ({
		t: "embed" as const,
		href,
		label: "A link",
	});

	it("keeps an internal card and works out what it points at", () => {
		const doc: RichDocument = { v: 1, blocks: [embed("/books/dune")] };
		const block = validateRichDocument(doc).blocks[0];
		expect(block?.t).toBe("embed");
		expect(block?.t === "embed" ? block.internal : null).toEqual({
			kind: "book",
			slug: "dune",
		});
	});

	it("keeps an https card and turns an unsafe one into plain text", () => {
		const safe = validateRichDocument({
			v: 1,
			blocks: [embed("https://example.com/a")],
		}).blocks[0];
		expect(safe?.t).toBe("embed");
		const unsafe = validateRichDocument({
			v: 1,
			blocks: [embed("http://example.com/a")],
		}).blocks[0];
		expect(unsafe?.t).toBe("p");
	});

	it("limits how many cards one document can have", () => {
		const blocks = Array.from({ length: RICH_EMBED_LIMIT + 2 }, (_, i) =>
			embed(`/books/book-${i}`),
		);
		const out = validateRichDocument({ v: 1, blocks }).blocks;
		expect(out.filter((b) => b.t === "embed")).toHaveLength(RICH_EMBED_LIMIT);
		expect(out.filter((b) => b.t === "p")).toHaveLength(2);
	});

	it("counts a card's label as text", () => {
		const stored = normalizeContentForStorage(
			JSON.stringify({ v: 1, blocks: [embed("/books/dune")] }),
		);
		expect(contentPlainText(stored)).toBe("A link");
	});
});
