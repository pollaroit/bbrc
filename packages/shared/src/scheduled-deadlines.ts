import {
	addCalendarDays,
	getZonedParts,
	resolveClubTimeZone,
	zonedTimeToUtc,
} from "./club-timezone";

export const DEFAULT_POLL_DURATION_MS = 12 * 60 * 60 * 1000;

/** Poll close and reading end — same club-local time every day. */
export const CLUB_DEADLINE_HOUR = 20;

/** @deprecated Use {@link CLUB_DEADLINE_HOUR}. */
export const SITTING_DEADLINE_HOUR = CLUB_DEADLINE_HOUR;

/** Valid poll deadline hours (only {@link CLUB_DEADLINE_HOUR}). */
export const POLL_DEADLINE_HOURS = [CLUB_DEADLINE_HOUR] as const;

const MS_PER_MINUTE = 60_000;

function clubDeadlineInstant(
	year: number,
	month: number,
	day: number,
	timeZone: string,
): Date {
	return zonedTimeToUtc(year, month, day, CLUB_DEADLINE_HOUR, 0, timeZone);
}

/** Upcoming 20:00 club-local deadlines strictly after `from`. */
export function upcomingPollDeadlineSlots(
	from: Date,
	timeZone: string,
	dayCount = 10,
): Date[] {
	const start = getZonedParts(from, timeZone);
	const slots: Date[] = [];

	for (let dayOffset = 0; dayOffset <= dayCount; dayOffset += 1) {
		const ymd = addCalendarDays(start.year, start.month, start.day, dayOffset);
		const slot = clubDeadlineInstant(ymd.year, ymd.month, ymd.day, timeZone);
		if (slot.getTime() > from.getTime()) {
			slots.push(slot);
		}
	}

	slots.sort((a, b) => a.getTime() - b.getTime());
	return slots;
}

/** Default poll deadline: ~12h ahead, snapped to the nearest future 20:00 slot. */
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

/** Snap an admin-chosen time to the next 20:00 club-local (same instant if already valid). */
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

/** Force a reading deadline to 20:00 club local on that calendar day. */
export function clampSittingDeadlineToClubEnd(
	raw: Date,
	timeZone = resolveClubTimeZone(),
): Date {
	const { year, month, day } = getZonedParts(raw, timeZone);
	return clubDeadlineInstant(year, month, day, timeZone);
}

/** Vercel Hobby cron (UTC): 20:00 in `Asia/Baku` (UTC+4, no DST). Closes polls and finishes sittings. */
export const VERCEL_CRON_DEADLINES_UTC = "0 16 * * *" as const;

/** @deprecated Use {@link VERCEL_CRON_DEADLINES_UTC}. */
export const VERCEL_CRON_POLL_AND_SITTING_UTC = [
	VERCEL_CRON_DEADLINES_UTC,
] as const;
