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

/** Upcoming whole-hour slots in club time, strictly after `from`, for pickers. */
export function upcomingPostScheduleSlots(
	from: Date,
	timeZone = resolveClubTimeZone(),
	hourCount = 24 * 31,
): Date[] {
	const start = snapPostScheduleToWholeHour(from, from, timeZone);
	const slots: Date[] = [];
	for (let index = 0; index < hourCount; index += 1) {
		slots.push(new Date(start.getTime() + index * MS_PER_HOUR));
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
