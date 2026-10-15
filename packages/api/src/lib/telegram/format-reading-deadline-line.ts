import { resolveClubTimeZone } from "@bbrc/shared";

/** e.g. `20:00, 12 October` (club local, no year). */
export function formatClubReadingDeadlineShort(
	deadline: Date,
	timeZone = resolveClubTimeZone(),
): string {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone,
		hour: "2-digit",
		minute: "2-digit",
		day: "numeric",
		month: "long",
		hour12: false,
	}).formatToParts(deadline);

	const read = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? "";

	const hour = read("hour");
	const minute = read("minute");
	const day = read("day");
	const month = read("month");

	return `${hour}:${minute}, ${day} ${month}`;
}

/** e.g. `in 3 days, 12 hours` or `in 5 hours`. */
export function formatApproxDurationUntil(
	target: Date,
	now = new Date(),
): string {
	const ms = target.getTime() - now.getTime();
	if (ms <= 0) {
		return "past due";
	}

	const totalHours = Math.floor(ms / (60 * 60 * 1000));
	const days = Math.floor(totalHours / 24);
	const hours = totalHours % 24;

	if (days === 0 && hours === 0) {
		return "in less than an hour";
	}
	if (days === 0) {
		return hours === 1 ? "in 1 hour" : `in ${hours} hours`;
	}
	if (hours === 0) {
		return days === 1 ? "in 1 day" : `in ${days} days`;
	}
	const dayLabel = days === 1 ? "1 day" : `${days} days`;
	const hourLabel = hours === 1 ? "1 hour" : `${hours} hours`;
	return `in ${dayLabel}, ${hourLabel}`;
}

export function formatReadingDeadlineTelegramLine(
	deadline: Date,
	now = new Date(),
): string {
	const when = formatClubReadingDeadlineShort(deadline);
	const relative = formatApproxDurationUntil(deadline, now);
	return `${when} - ${relative}`;
}

const MS_PER_DAY = 86_400_000;

/** Whole days until deadline (minimum 1 when still in the future). */
export function wholeDaysUntilDeadline(
	deadline: Date,
	now = new Date(),
): number {
	const ms = deadline.getTime() - now.getTime();
	if (ms <= 0) {
		return 0;
	}
	return Math.max(1, Math.ceil(ms / MS_PER_DAY));
}

export function formatPagesPerDayLine(
	pageCount: number,
	deadline: Date,
	mode: "start_today" | "stay_on_pace",
	now = new Date(),
): string | null {
	if (!Number.isFinite(pageCount) || pageCount < 1) {
		return null;
	}

	const days = wholeDaysUntilDeadline(deadline, now);
	if (days === 0) {
		return null;
	}

	const pagesPerDay = Math.ceil(pageCount / days);
	const pagesLabel =
		pagesPerDay === 1
			? "1 page"
			: `${pagesPerDay.toLocaleString("en-US")} pages`;

	if (mode === "start_today") {
		return `If you start today, plan for about ${pagesLabel} per day.`;
	}

	return `To finish by the deadline, aim for about ${pagesLabel} per day.`;
}

export function isWithinHoursOfDeadline(
	deadline: Date,
	hours: number,
	now = new Date(),
): boolean {
	const ms = deadline.getTime() - now.getTime();
	return ms > 0 && ms <= hours * 60 * 60 * 1000;
}
