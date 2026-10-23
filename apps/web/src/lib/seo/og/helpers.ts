import { clubTimeZone } from "@/lib/club-timezone";

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

/** "Oct 31, 8PM" (or "8:30PM") in club time, without the year. */
export function formatOgClubDateTime(date: Date): string {
	const parts = new Intl.DateTimeFormat("en", {
		timeZone: clubTimeZone,
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).formatToParts(date);
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? "";
	const minute = get("minute");
	const time = `${get("hour")}${minute === "00" ? "" : `:${minute}`}${get("dayPeriod").toUpperCase()}`;
	return `${get("month")} ${get("day")}, ${time}`;
}

/** Cuts at a word boundary and adds an ellipsis. */
export function truncateAtWord(text: string, max: number): string {
	const normalized = text.trim().replace(/\s+/g, " ");
	if (normalized.length <= max) {
		return normalized;
	}
	const cut = normalized.slice(0, max - 1);
	const lastSpace = cut.lastIndexOf(" ");
	return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
