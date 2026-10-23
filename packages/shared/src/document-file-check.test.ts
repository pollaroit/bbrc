import { describe, expect, test } from "bun:test";
import { fileMatchesDocumentFormat } from "./document-file-check";

const zip = (body: string) =>
	Buffer.concat([
		Buffer.from([0x50, 0x4b, 0x03, 0x04]),
		Buffer.from(body, "latin1"),
	]);

describe("fileMatchesDocumentFormat", () => {
	test("pdf needs the header", () => {
		expect(fileMatchesDocumentFormat(Buffer.from("%PDF-1.7\n..."), "pdf")).toBe(
			true,
		);
		expect(fileMatchesDocumentFormat(Buffer.from("hello"), "pdf")).toBe(false);
	});

	test("docx needs a zip with word parts", () => {
		expect(
			fileMatchesDocumentFormat(
				zip("[Content_Types].xml word/document.xml"),
				"docx",
			),
		).toBe(true);
		expect(fileMatchesDocumentFormat(zip("something else"), "docx")).toBe(
			false,
		);
		expect(
			fileMatchesDocumentFormat(
				Buffer.from("[Content_Types].xml word/"),
				"docx",
			),
		).toBe(false);
	});

	test("epub needs the mimetype entry first", () => {
		expect(
			fileMatchesDocumentFormat(zip("mimetypeapplication/epub+zip"), "epub"),
		).toBe(true);
		expect(fileMatchesDocumentFormat(zip("nope"), "epub")).toBe(false);
	});

	test("a PDF is not a docx", () => {
		expect(fileMatchesDocumentFormat(Buffer.from("%PDF-1.4"), "docx")).toBe(
			false,
		);
	});
});
