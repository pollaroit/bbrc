import {
	addCalendarDays,
	getZonedParts,
	resolveClubTimeZone,
	zonedTimeToUtc,
} from "./club-timezone";

const MS_PER_DAY = 86_400_000;

/** Club reading pace: pages the club is expected to read per calendar day. */
export const READING_PAGES_PER_WEEKDAY = 25;
export const READING_PAGES_PER_WEEKEND_DAY = 30;

const MAX_PLAN_DAYS = 366 * 10;

export type ReadingPlan = {
	/** Calendar days the reading spans, counting the start day and the last day in full. */
	calendarDays: number;
	/** Elapsed days with the last day counted only for the share of pages left on it. */
	elapsedDays: number;
	/** Club-local calendar day on which the last page is reached. */
	endDay: { year: number; month: number; day: number };
	/** Saturdays and Sundays inside the span. */
	weekendDays: number;
};

function isWeekend(year: number, month: number, day: number): boolean {
	const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
	return weekday === 0 || weekday === 6;
}

function pagesOnDay(year: number, month: number, day: number): number {
	return isWeekend(year, month, day)
		? READING_PAGES_PER_WEEKEND_DAY
		: READING_PAGES_PER_WEEKDAY;
}

/**
 * Walks the club calendar from the day containing `startDate`: weekdays count
 * {@link READING_PAGES_PER_WEEKDAY} pages, Saturdays and Sundays
 * {@link READING_PAGES_PER_WEEKEND_DAY}. The start day counts as a full day.
 */
export function planReading(
	pageCount: number,
	startDate: Date = new Date(),
	timeZone: string = resolveClubTimeZone(),
): ReadingPlan {
	if (!Number.isFinite(pageCount) || pageCount <= 0) {
		throw new Error("Page count must be a number greater than 0.");
	}

	let { year, month, day } = getZonedParts(startDate, timeZone);
	let remaining = pageCount;
	let calendarDays = 0;
	let weekendDays = 0;

	for (;;) {
		if (calendarDays >= MAX_PLAN_DAYS) {
			throw new Error("Could not reach the last page within 10 years.");
		}

		const capacity = pagesOnDay(year, month, day);
		calendarDays += 1;
		if (isWeekend(year, month, day)) {
			weekendDays += 1;
		}

		if (remaining <= capacity) {
			return {
				calendarDays,
				elapsedDays: calendarDays - 1 + remaining / capacity,
				endDay: { year, month, day },
				weekendDays,
			};
		}

		remaining -= capacity;
		({ year, month, day } = addCalendarDays(year, month, day, 1));
	}
}

/** Club reading deadline (the day, at midday club time) from page count. */
export function calculateSittingReadingDeadline(
	pageCount: number,
	startDate: Date = new Date(),
	timeZone: string = resolveClubTimeZone(),
): Date {
	const { endDay } = planReading(pageCount, startDate, timeZone);
	return zonedTimeToUtc(endDay.year, endDay.month, endDay.day, 12, 0, timeZone);
}

/** "~12 days 8 hours reading time"; the "~" marks it as an estimate. */
export function formatReadingEstimate(elapsedDays: number): string {
	const totalHours = Math.max(1, Math.round(elapsedDays * 24));
	const days = Math.floor(totalHours / 24);
	const hours = totalHours % 24;
	const parts = [
		days > 0 ? `${days} ${days === 1 ? "day" : "days"}` : null,
		hours > 0 ? `${hours} ${hours === 1 ? "hour" : "hours"}` : null,
	].filter((part): part is string => part != null);

	return `~${parts.join(" ")} reading time`;
}

/** @deprecated Use {@link defaultPollDeadline} from `./scheduled-deadlines.js`. */
export function legacyDefaultPollDeadline(from = new Date()): Date {
	const deadline = new Date(from.getTime() + 12 * 60 * 60 * 1000);
	deadline.setSeconds(0, 0);
	deadline.setMilliseconds(0);
	return deadline;
}

/** Placeholder until a book is chosen and the reading schedule is computed. */
export function sittingReadingDeadlinePlaceholder(from = new Date()): Date {
	return new Date(from.getTime() + 400 * MS_PER_DAY);
}
