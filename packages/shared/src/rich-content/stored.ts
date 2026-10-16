import { parseMarkdownSubsetToRichDocument } from "./parse-markdown";
import { plainTextToRichDocument, richDocumentPlainText } from "./plain-text";
import type { RichDocument } from "./types";
import { enrichDocumentLinks, validateRichDocument } from "./validate";

export function isRichContentStored(value: string): boolean {
	const trimmed = value.trimStart();
	return trimmed.startsWith('{"v":1');
}

export function parseRichDocumentJson(value: string): RichDocument | null {
	try {
		const parsed: unknown = JSON.parse(value);
		if (
			typeof parsed === "object" &&
			parsed != null &&
			"v" in parsed &&
			(parsed as RichDocument).v === 1 &&
			"blocks" in parsed
		) {
			return validateRichDocument(parsed as RichDocument);
		}
	} catch {
		return null;
	}
	return null;
}

/** Parse DB/API content for rendering (legacy plain, markdown, or JSON v1). */
export function parseStoredContent(raw: string): RichDocument {
	const trimmed = raw.trim();
	if (!trimmed) {
		return plainTextToRichDocument("");
	}

	let json = parseRichDocumentJson(trimmed);
	if (!json && trimmed.startsWith('"') && trimmed.endsWith('"')) {
		try {
			const inner = JSON.parse(trimmed);
			if (typeof inner === "string") {
				json = parseRichDocumentJson(inner.trim());
			}
		} catch {
			// fall through
		}
	}
	if (json) {
		return json;
	}

	if (looksLikeMarkdownSubset(trimmed)) {
		return parseMarkdownSubsetToRichDocument(trimmed);
	}

	return plainTextToRichDocument(raw);
}

function looksLikeMarkdownSubset(text: string): boolean {
	return (
		/(^|\n)# /.test(text) ||
		/(^|\n)> /.test(text) ||
		/\*\*.+\*\*/.test(text) ||
		/\*.+\*/.test(text) ||
		/__.+__/.test(text) ||
		/\[[^\]]+\]\([^)]+\)/.test(text) ||
		/@[a-z0-9_]{3,30}/i.test(text)
	);
}

export function serializeRichDocument(doc: RichDocument): string {
	const normalized = enrichDocumentLinks(validateRichDocument(doc));
	return JSON.stringify(normalized);
}

/** Normalize author input before persistence (canonical JSON v1). */
export function normalizeContentForStorage(input: string): string {
	const trimmed = input.trim();
	if (!trimmed) {
		return serializeRichDocument(plainTextToRichDocument(""));
	}

	const existing = parseRichDocumentJson(trimmed);
	const doc =
		existing ??
		(looksLikeMarkdownSubset(trimmed)
			? parseMarkdownSubsetToRichDocument(trimmed)
			: plainTextToRichDocument(trimmed));

	return serializeRichDocument(doc);
}

export function contentPlainText(raw: string): string {
	return richDocumentPlainText(parseStoredContent(raw));
}

/** Single-line preview for admin lists, search, and attachments. */
export function richContentPreview(raw: string, maxLength = 120): string {
	const normalized = contentPlainText(raw).replace(/\s+/g, " ").trim();
	if (normalized.length <= maxLength) {
		return normalized;
	}
	return `${normalized.slice(0, maxLength - 1)}…`;
}

export const RICH_CONTENT_MAX_PLAIN_CHARS = 5000;

export function assertContentWithinLimit(raw: string): void {
	const plain = contentPlainText(raw);
	if (plain.length > RICH_CONTENT_MAX_PLAIN_CHARS) {
		throw new Error(
			`Content must be at most ${RICH_CONTENT_MAX_PLAIN_CHARS} characters`,
		);
	}
}
