/** IANA timezone used for poll/sitting deadline slots (override with `CLUB_TIMEZONE` on the server). */
export const DEFAULT_CLUB_TIMEZONE = "Asia/Baku";

export function resolveClubTimeZone(explicit?: string): string {
	if (explicit) {
		return explicit;
	}

	if (typeof process !== "undefined" && process.env.CLUB_TIMEZONE?.trim()) {
		return process.env.CLUB_TIMEZONE.trim();
	}

	return DEFAULT_CLUB_TIMEZONE;
}

type ZonedParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
};

/** True when `date` falls on the given club-local clock hour (0–23). */
export function isClubLocalHour(
	date: Date,
	hour: number,
	timeZone = resolveClubTimeZone(),
): boolean {
	return getZonedParts(date, timeZone).hour === hour;
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	const parts = formatter.formatToParts(date);
	const read = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((part) => part.type === type)?.value ?? "0");

	return {
		year: read("year"),
		month: read("month"),
		day: read("day"),
		hour: read("hour"),
		minute: read("minute"),
	};
}

/** Wall-clock in `timeZone` → UTC instant. */
export function zonedTimeToUtc(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
	timeZone: string,
): Date {
	let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

	for (let attempt = 0; attempt < 4; attempt += 1) {
		const zoned = getZonedParts(new Date(utcMs), timeZone);
		const asUtc = Date.UTC(
			zoned.year,
			zoned.month - 1,
			zoned.day,
			zoned.hour,
			zoned.minute,
			0,
			0,
		);
		const desired = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
		const delta = desired - asUtc;
		if (delta === 0) {
			break;
		}
		utcMs += delta;
	}

	return new Date(utcMs);
}

export function addCalendarDays(
	year: number,
	month: number,
	day: number,
	days: number,
): { year: number; month: number; day: number } {
	const cursor = new Date(Date.UTC(year, month - 1, day + days));
	return {
		year: cursor.getUTCFullYear(),
		month: cursor.getUTCMonth() + 1,
		day: cursor.getUTCDate(),
	};
}
