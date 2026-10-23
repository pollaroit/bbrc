import { describe, expect, test } from "bun:test";
import {
	documentFormatFromFilename,
	documentFormatLabel,
	resolveDocumentFormat,
} from "./documents";

describe("document formats", () => {
	test("resolves by extension even when the browser sends no MIME type", () => {
		expect(resolveDocumentFormat({ name: "book.EPUB", type: "" })).toBe("epub");
		expect(resolveDocumentFormat({ name: "notes.docx", type: "" })).toBe(
			"docx",
		);
	});

	test("falls back to the MIME type", () => {
		expect(
			resolveDocumentFormat({ name: "download", type: "application/pdf" }),
		).toBe("pdf");
	});

	test("rejects other files", () => {
		expect(
			resolveDocumentFormat({ name: "a.txt", type: "text/plain" }),
		).toBeNull();
		expect(documentFormatFromFilename("noextension")).toBeNull();
	});

	test("labels a stored URL by its extension", () => {
		expect(
			documentFormatLabel(
				"https://cdn.example.com/production/books/x/documents/y.epub",
			),
		).toBe("EPUB");
		expect(documentFormatLabel("https://cdn.example.com/a/b.pdf?x=1")).toBe(
			"PDF",
		);
		expect(documentFormatLabel("https://cdn.example.com/a/b")).toBe("file");
	});
});
