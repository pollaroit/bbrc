const ogDateFormatter = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric",
	year: "numeric",
});

export function formatOgDate(date: Date): string {
	return ogDateFormatter.format(date);
}

export function formatCount(label: string, count: number): string {
	return `${count.toLocaleString("en-US")} ${label}${count === 1 ? "" : "s"}`;
}

export function truncateOgTitle(text: string, max = 72): string {
	const line = text.trim().split(/\n/)[0]?.trim() ?? text.trim();
	if (line.length <= max) {
		return line;
	}
	return `${line.slice(0, max - 1).trimEnd()}…`;
}

export function truncateOgLine(text: string, max = 140): string {
	const normalized = text.trim().replace(/\s+/g, " ");
	if (normalized.length <= max) {
		return normalized;
	}
	return `${normalized.slice(0, max - 1).trimEnd()}…`;
}
