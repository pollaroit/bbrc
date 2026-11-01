import {
	getZonedParts,
	resolveClubTimeZone,
	zonedTimeToUtc,
} from "./club-timezone";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Minimum lead time before a post may go live. */
export const POST_SCHEDULE_MIN_AHEAD_MS = MS_PER_HOUR;

/** A scheduled time cannot be more than this long after the first time it was scheduled. */
export const POST_SCHEDULE_MAX_FROM_FIRST_MS = 30 * MS_PER_DAY;

export type PostScheduleValidationInput = {
	scheduledAt: Date;
	now: Date;
	/** When the post was first scheduled; null on the first pick. */
	firstScheduledAt: Date | null;
};

/** Snap `at` to the start of the next whole hour in the club time zone (strictly after `now`). */
export function snapPostScheduleToWholeHour(
	at: Date,
	now: Date,
	timeZone = resolveClubTimeZone(),
): Date {
	const parts = getZonedParts(at, timeZone);
	let candidate = zonedTimeToUtc(
		parts.year,
		parts.month,
		parts.day,
		parts.hour,
		0,
		timeZone,
	);
	if (candidate.getTime() <= now.getTime()) {
		candidate = new Date(candidate.getTime() + MS_PER_HOUR);
	}
	return candidate;
}

/** Earliest allowed publish time: whole club hour at least one hour after `from`. */
export function earliestPostScheduleAt(
	from: Date,
	timeZone = resolveClubTimeZone(),
): Date {
	const minAt = new Date(from.getTime() + POST_SCHEDULE_MIN_AHEAD_MS);
	// Treat the minimum instant as still "inside" its hour so an exact whole hour counts.
	return snapPostScheduleToWholeHour(
		minAt,
		new Date(minAt.getTime() - 1),
		timeZone,
	);
}

/** Upcoming whole-hour slots in club time, each at least one hour after `from`. */
export function upcomingPostScheduleSlots(
	from: Date,
	timeZone = resolveClubTimeZone(),
	hourCount = 24 * 31,
): Date[] {
	const start = earliestPostScheduleAt(from, timeZone);
	const slots: Date[] = [];
	for (let index = 0; index < hourCount; index += 1) {
		slots.push(new Date(start.getTime() + index * MS_PER_HOUR));
	}
	return slots;
}

export type PostSchedulePickerBounds = {
	now: Date;
	firstScheduledAt: Date | null;
	timeZone?: string;
};

function dayKeyFromZonedParts(year: number, month: number, day: number) {
	return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function postScheduleDayKey(
	at: Date,
	timeZone = resolveClubTimeZone(),
): string {
	const parts = getZonedParts(at, timeZone);
	return dayKeyFromZonedParts(parts.year, parts.month, parts.day);
}

/** Club-local calendar days that have at least one valid hour (up to one month from first schedule). */
export function postScheduleSelectableDays(
	bounds: PostSchedulePickerBounds,
	maxDays = 31,
): string[] {
	const timeZone = bounds.timeZone ?? resolveClubTimeZone();
	const slots = upcomingPostScheduleSlots(bounds.now, timeZone, 24 * maxDays);
	const days: string[] = [];
	let lastKey: string | null = null;
	for (const slot of slots) {
		if (
			validatePostScheduleTime(
				{
					scheduledAt: slot,
					now: bounds.now,
					firstScheduledAt: bounds.firstScheduledAt,
				},
				timeZone,
			)
		) {
			continue;
		}
		const key = postScheduleDayKey(slot, timeZone);
		if (key !== lastKey) {
			days.push(key);
			lastKey = key;
		}
	}
	return days;
}

/** Whole-hour slots on a club-local day that pass validation. */
export function postScheduleHoursForDay(
	dayKey: string,
	bounds: PostSchedulePickerBounds,
): Date[] {
	const timeZone = bounds.timeZone ?? resolveClubTimeZone();
	const [year, month, day] = dayKey.split("-").map((part) => Number(part));
	if (!year || !month || !day) {
		return [];
	}
	const slots: Date[] = [];
	for (let hour = 0; hour < 24; hour += 1) {
		const slot = zonedTimeToUtc(year, month, day, hour, 0, timeZone);
		if (
			validatePostScheduleTime(
				{
					scheduledAt: slot,
					now: bounds.now,
					firstScheduledAt: bounds.firstScheduledAt,
				},
				timeZone,
			)
		) {
			continue;
		}
		slots.push(slot);
	}
	return slots;
}

export function isWholeHourClubLocal(
	at: Date,
	timeZone = resolveClubTimeZone(),
): boolean {
	const parts = getZonedParts(at, timeZone);
	if (parts.minute !== 0) {
		return false;
	}
	return (
		at.getTime() ===
		zonedTimeToUtc(
			parts.year,
			parts.month,
			parts.day,
			parts.hour,
			0,
			timeZone,
		).getTime()
	);
}

/** Returns a user-facing error, or null when the time is allowed. */
export function validatePostScheduleTime(
	input: PostScheduleValidationInput,
	timeZone = resolveClubTimeZone(),
): string | null {
	const { scheduledAt, now, firstScheduledAt } = input;

	if (!isWholeHourClubLocal(scheduledAt, timeZone)) {
		return "Pick a whole hour in club time (for example 14:00 or 20:00).";
	}

	const minAt = now.getTime() + POST_SCHEDULE_MIN_AHEAD_MS;
	if (scheduledAt.getTime() < minAt) {
		return "Schedule at least one hour from now.";
	}

	const anchor = firstScheduledAt ?? scheduledAt;
	const maxAt = anchor.getTime() + POST_SCHEDULE_MAX_FROM_FIRST_MS;
	if (scheduledAt.getTime() > maxAt) {
		return "You cannot schedule more than one month from when you first picked a time.";
	}

	return null;
}

/** QStash cron (UTC): once per hour on the hour. Used for scheduled posts and later event reminders. */
export const QSTASH_CRON_HOURLY_UTC = "0 * * * *" as const;
