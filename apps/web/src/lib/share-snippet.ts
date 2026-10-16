import { contentPlainText } from "@bbrc/shared";

/** Plain-text snippet from stored rich content or legacy plain strings. */
export function shareSnippet(storedOrPlain: string, max = 100): string {
	const text = contentPlainText(storedOrPlain);
	const line = text.trim().split(/\n/)[0]?.trim() ?? text.trim();
	if (line.length <= max) {
		return line;
	}
	return `${line.slice(0, max - 1).trimEnd()}…`;
}
