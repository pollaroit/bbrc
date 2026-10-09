import type { ReadDatePart } from "@bbrc/schemas/read-dates";

export function formatReadDatePart(
	part: ReadDatePart | null | undefined,
): string {
	if (!part) {
		return "—";
	}

	if (part.month == null) {
		return String(part.year);
	}

	if (part.day == null) {
		return new Intl.DateTimeFormat(undefined, {
			month: "short",
			year: "numeric",
			timeZone: "UTC",
		}).format(new Date(Date.UTC(part.year, part.month - 1, 1)));
	}

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(part.year, part.month - 1, part.day)));
}

export function formatReadPeriod(
	start: ReadDatePart | null | undefined,
	end: ReadDatePart | null | undefined,
): string {
	if (!start && !end) {
		return "Dates not set";
	}
	if (start && end) {
		return `${formatReadDatePart(start)} – ${formatReadDatePart(end)}`;
	}
	if (end) {
		return `Finished ${formatReadDatePart(end)}`;
	}
	return `Started ${formatReadDatePart(start)}`;
}
