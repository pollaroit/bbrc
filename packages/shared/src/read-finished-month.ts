import { getZonedParts, resolveClubTimeZone } from "./club-timezone";

export type ReadFinishedMonth = {
	year: number;
	month: number;
};

/** Sort key for descending “most recently finished” (YYYYMM). */
export function readFinishedMonthSortKey(
	readEndYear: number | null,
	readEndMonth: number | null,
): number | null {
	if (readEndYear == null || readEndMonth == null) {
		return null;
	}
	return readEndYear * 100 + readEndMonth;
}

export function readFinishedMonthFromClubNow(
	now = new Date(),
	timeZone = resolveClubTimeZone(),
): ReadFinishedMonth {
	const parts = getZonedParts(now, timeZone);
	return { year: parts.year, month: parts.month };
}

export function readFinishedMonthInClubYear(
	month: ReadFinishedMonth,
	year: number,
): boolean {
	return month.year === year;
}

export function readFinishedMonthInClubMonth(
	month: ReadFinishedMonth,
	reference: Date,
	timeZone = resolveClubTimeZone(),
): boolean {
	const parts = getZonedParts(reference, timeZone);
	return month.year === parts.year && month.month === parts.month;
}

export function formatReadFinishedMonth(
	month: ReadFinishedMonth | null | undefined,
	locale?: string,
): string {
	if (!month) {
		return "—";
	}
	return new Intl.DateTimeFormat(locale, {
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(month.year, month.month - 1, 1)));
}
