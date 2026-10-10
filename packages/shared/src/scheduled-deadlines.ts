import {
	addCalendarDays,
	getZonedParts,
	resolveClubTimeZone,
	zonedTimeToUtc,
} from "./club-timezone";

export const DEFAULT_POLL_DURATION_MS = 12 * 60 * 60 * 1000;

/** Default reading-end hour when the UI picks a calendar day only. */
export const CLUB_DEADLINE_HOUR = 20;

/** @deprecated Use {@link CLUB_DEADLINE_HOUR}. */
export const SITTING_DEADLINE_HOUR = CLUB_DEADLINE_HOUR;

/** Club-local hours when polls may close and cron may run (ascending). */
export const POLL_DEADLINE_HOURS = [14, 17, 20, 23] as const;

const MS_PER_MINUTE = 60_000;

function clubDeadlineInstant(
	year: number,
	month: number,
	day: number,
	hour: number,
	timeZone: string,
): Date {
	return zonedTimeToUtc(year, month, day, hour, 0, timeZone);
}

/** Upcoming club-local deadline slots strictly after `from`. */
export function upcomingPollDeadlineSlots(
	from: Date,
	timeZone: string,
	dayCount = 10,
): Date[] {
	const start = getZonedParts(from, timeZone);
	const slots: Date[] = [];

	for (let dayOffset = 0; dayOffset <= dayCount; dayOffset += 1) {
		const ymd = addCalendarDays(start.year, start.month, start.day, dayOffset);
		for (const hour of POLL_DEADLINE_HOURS) {
			const slot = clubDeadlineInstant(
				ymd.year,
				ymd.month,
				ymd.day,
				hour,
				timeZone,
			);
			if (slot.getTime() > from.getTime()) {
				slots.push(slot);
			}
		}
	}

	slots.sort((a, b) => a.getTime() - b.getTime());
	return slots;
}

/** Default poll deadline: ~12h ahead, snapped to the nearest future hot-hour slot. */
export function defaultPollDeadline(
	from = new Date(),
	timeZone = resolveClubTimeZone(),
): Date {
	const target = new Date(from.getTime() + DEFAULT_POLL_DURATION_MS);
	const candidates = upcomingPollDeadlineSlots(from, timeZone);

	if (candidates.length === 0) {
		throw new Error("Could not compute a poll deadline slot");
	}

	let best = candidates[0];
	if (best === undefined) {
		throw new Error("Could not compute a poll deadline slot");
	}
	let bestDistance = Math.abs(best.getTime() - target.getTime());

	for (const candidate of candidates) {
		const distance = Math.abs(candidate.getTime() - target.getTime());
		if (distance < bestDistance) {
			best = candidate;
			bestDistance = distance;
		}
	}

	return best;
}

/** Poll deadline on a calendar day at a club-local hot hour (14/17/20/23). */
export function pollDeadlineAtClubLocal(
	referenceDay: Date,
	hour: (typeof POLL_DEADLINE_HOURS)[number],
	timeZone = resolveClubTimeZone(),
): Date {
	const { year, month, day } = getZonedParts(referenceDay, timeZone);
	return clubDeadlineInstant(year, month, day, hour, timeZone);
}

export function isPollDeadlineClubHour(
	hour: number,
): hour is (typeof POLL_DEADLINE_HOURS)[number] {
	return (POLL_DEADLINE_HOURS as readonly number[]).includes(hour);
}

/** Snap an admin-chosen time to the next hot hour club-local (same instant if already valid). */
export function snapPollDeadlineOnOrAfter(
	reference: Date,
	timeZone = resolveClubTimeZone(),
): Date {
	const slots = upcomingPollDeadlineSlots(
		new Date(reference.getTime() - MS_PER_MINUTE),
		timeZone,
	);

	const match = slots.find((slot) => slot.getTime() >= reference.getTime());
	if (match) {
		return match;
	}

	return defaultPollDeadline(reference, timeZone);
}

const MS_PER_HOUR = 60 * 60 * 1000;
const READING_END_WARNING_MS = 24 * MS_PER_HOUR;

/** Midpoint of reading window, snapped to the next club hot hour on or after the true midpoint. */
export function computeMidtermAt(
	readingStartedAt: Date,
	readingDeadlineAt: Date,
	timeZone = resolveClubTimeZone(),
): Date {
	const midpointMs =
		readingStartedAt.getTime() +
		(readingDeadlineAt.getTime() - readingStartedAt.getTime()) / 2;
	return snapPollDeadlineOnOrAfter(new Date(midpointMs), timeZone);
}

/** Instant for the “24 hours left” Telegram warning (exactly 24h before reading end). */
export function computeReadingEndWarningAt(readingDeadlineAt: Date): Date {
	return new Date(readingDeadlineAt.getTime() - READING_END_WARNING_MS);
}

/** Force a reading deadline to {@link CLUB_DEADLINE_HOUR}:00 club local on that calendar day. */
export function clampSittingDeadlineToClubEnd(
	raw: Date,
	timeZone = resolveClubTimeZone(),
): Date {
	const { year, month, day } = getZonedParts(raw, timeZone);
	return clubDeadlineInstant(year, month, day, CLUB_DEADLINE_HOUR, timeZone);
}

/**
 * QStash recurring schedule (UTC): club 14/17/20/23 in `Asia/Baku` or `Asia/Dubai` (UTC+4, no DST).
 * Adjust cron if `CLUB_TIMEZONE` uses a different offset.
 */
export const QSTASH_CRON_DEADLINES_UTC = "0 10,13,16,19 * * *" as const;

/** @deprecated Vercel Hobby cron removed; use {@link QSTASH_CRON_DEADLINES_UTC}. */
export const VERCEL_CRON_DEADLINES_UTC = "0 16 * * *" as const;

/** @deprecated Use {@link QSTASH_CRON_DEADLINES_UTC}. */
export const VERCEL_CRON_POLL_AND_SITTING_UTC = [
	VERCEL_CRON_DEADLINES_UTC,
] as const;
