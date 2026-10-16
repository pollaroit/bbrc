import { describe, expect, it } from "bun:test";
import { internalLinkRefFromHref } from "./internal-link";
import { parseMarkdownSubsetToRichDocument } from "./parse-markdown";
import {
	contentPlainText,
	normalizeContentForStorage,
	parseStoredContent,
} from "./stored";

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
		expect(roundTrip.blocks[0]?.inline[0]?.t).toBe("text");
	});

	it("detects internal links", () => {
		expect(internalLinkRefFromHref("/books/war-and-peace")).toEqual({
			kind: "book",
			slug: "war-and-peace",
		});
	});
});
