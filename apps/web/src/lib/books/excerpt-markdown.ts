const REFERENCE_LINK_IN_TEXT = /\]\[(\d+)\]/g;

/** Append `[n]: url` definitions from the full excerpt when the preview still references them. */
function appendReferenceDefinitions(full: string, preview: string): string {
	const ids = new Set<string>();
	for (const match of preview.matchAll(REFERENCE_LINK_IN_TEXT)) {
		const id = match[1];
		if (id) {
			ids.add(id);
		}
	}

	if (ids.size === 0) {
		return preview;
	}

	const definitions: string[] = [];
	for (const id of ids) {
		const def = full.match(new RegExp(`^\\[${id}\\]:\\s*.+$`, "m"));
		if (def) {
			definitions.push(def[0]);
		}
	}

	if (definitions.length === 0) {
		return preview;
	}

	return `${preview}\n\n${definitions.join("\n")}`;
}

function trimDanglingMarkdownTokens(text: string): string {
	return text
		.replace(/(\*{1,3}|_)+$/u, "")
		.replace(/\[\^?\d*$/u, "")
		.trimEnd();
}

export function truncateBookExcerptMarkdown(
	excerpt: string,
	maxChars: number,
): { content: string; isTruncated: boolean } {
	const trimmed = excerpt.trim();
	if (trimmed.length <= maxChars) {
		return { content: trimmed, isTruncated: false };
	}

	let slice = trimmed.slice(0, maxChars);
	slice = slice.replace(/\n(\[\d+\]:[^\n]*)?$/u, "");

	const paragraphBreak = slice.lastIndexOf("\n\n");
	const sentenceBreak = slice.lastIndexOf(". ");
	const preferBreak = Math.max(paragraphBreak, sentenceBreak);

	if (preferBreak > maxChars * 0.55) {
		slice =
			sentenceBreak === preferBreak && sentenceBreak >= 0
				? slice.slice(0, sentenceBreak + 1)
				: slice.slice(0, preferBreak);
	} else {
		const lastSpace = slice.lastIndexOf(" ");
		if (lastSpace > maxChars * 0.65) {
			slice = slice.slice(0, lastSpace);
		}
	}

	slice = trimDanglingMarkdownTokens(slice);
	const preview = `${slice}…`;
	const content = appendReferenceDefinitions(trimmed, preview);

	return { content, isTruncated: true };
}
