export function shareSnippet(text: string, max = 100): string {
	const line = text.trim().split(/\n/)[0]?.trim() ?? text.trim();
	if (line.length <= max) {
		return line;
	}
	return `${line.slice(0, max - 1).trimEnd()}…`;
}
