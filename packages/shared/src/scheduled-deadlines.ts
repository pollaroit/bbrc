import {
	addCalendarDays,
	getZonedParts,
	resolveClubTimeZone,
	zonedTimeToUtc,
} from "./club-timezone";

export const DEFAULT_POLL_DURATION_MS = 12 * 60 * 60 * 1000;

/** Daily poll close times in club local time (00:00 = midnight). */
export const POLL_DEADLINE_HOURS = [0, 12, 16, 20] as const;

/** Reading phase always ends at this local hour. */
export const SITTING_DEADLINE_HOUR = 20;

const MS_PER_MINUTE = 60_000;

function pollSlotInstant(
	year: number,
	month: number,
	day: number,
	hour: number,
	timeZone: string,
): Date {
	return zonedTimeToUtc(year, month, day, hour, 0, timeZone);
}

/** Upcoming poll slots strictly after `from` (within `dayCount` calendar days). */
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
			const slot = pollSlotInstant(
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

/** Default poll deadline: ~12h ahead, snapped to the nearest future poll slot. */
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

/** Snap an admin-chosen time to the next valid poll slot (same instant if already valid). */
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
	return zonedTimeToUtc(year, month, day, SITTING_DEADLINE_HOUR, 0, timeZone);
}

/** Vercel cron schedules (UTC) that fire at poll/sitting slot times in `Asia/Baku` (UTC+4, no DST). */
export const VERCEL_CRON_POLL_AND_SITTING_UTC = [
	"0 8 * * *",
	"0 12 * * *",
	"0 16 * * *",
	"0 20 * * *",
] as const;
