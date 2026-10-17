import { getZonedParts, resolveClubTimeZone } from "../club-timezone";

export type UserStatsPeriodType = "life" | "none" | "year" | "month" | "custom";

export type UserStatsMonth = { year: number; month: number };

export type UserStatsPeriod =
	| { type: "life" }
	| { type: "none" }
	| { type: "year"; year: number }
	| { type: "month"; year: number; month: number }
	| {
			type: "custom";
			start: UserStatsMonth;
			end: UserStatsMonth;
	  };

export type UserStatsPeriodBounds = {
	/** Inclusive first month in period. */
	start: UserStatsMonth;
	/** Inclusive last month in period. */
	end: UserStatsMonth;
};

const MONTH_PERIOD_RE = /^(\d{4})-(\d{2})$/;
const YEAR_PERIOD_RE = /^(\d{4})$/;

export function parseUserStatsMonth(value: string): UserStatsMonth | null {
	const match = MONTH_PERIOD_RE.exec(value.trim());
	if (!match) {
		return null;
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	if (month < 1 || month > 12) {
		return null;
	}
	return { year, month };
}

export function monthSortKey(month: UserStatsMonth): number {
	return month.year * 12 + (month.month - 1);
}

export function compareMonths(a: UserStatsMonth, b: UserStatsMonth): number {
	return monthSortKey(a) - monthSortKey(b);
}

export function isMonthInRange(
	month: UserStatsMonth,
	start: UserStatsMonth,
	end: UserStatsMonth,
): boolean {
	const key = monthSortKey(month);
	return key >= monthSortKey(start) && key <= monthSortKey(end);
}

export function parseUserStatsPeriod(input: {
	periodType?: string | null;
	period?: string | null;
	periodStart?: string | null;
	periodEnd?: string | null;
}): UserStatsPeriod {
	const type = input.periodType?.trim() || "life";

	if (type === "life") {
		return { type: "life" };
	}

	if (type === "none") {
		return { type: "none" };
	}

	if (type === "year") {
		const raw = input.period?.trim() ?? "";
		const match = YEAR_PERIOD_RE.exec(raw);
		if (!match) {
			throw new Error("Invalid year period");
		}
		return { type: "year", year: Number(match[1]) };
	}

	if (type === "month") {
		const parsed = parseUserStatsMonth(input.period?.trim() ?? "");
		if (!parsed) {
			throw new Error("Invalid month period");
		}
		return { type: "month", year: parsed.year, month: parsed.month };
	}

	if (type === "custom") {
		const start = parseUserStatsMonth(input.periodStart?.trim() ?? "");
		const end = parseUserStatsMonth(input.periodEnd?.trim() ?? "");
		if (!start || !end || compareMonths(start, end) > 0) {
			throw new Error("Invalid custom period");
		}
		return { type: "custom", start, end };
	}

	throw new Error("Invalid period type");
}

export function resolveUserStatsPeriodBounds(
	period: UserStatsPeriod,
	options: {
		firstDatedRead?: UserStatsMonth | null;
		now?: Date;
		timeZone?: string;
	},
): UserStatsPeriodBounds {
	const timeZone = options.timeZone ?? resolveClubTimeZone();
	const nowParts = getZonedParts(options.now ?? new Date(), timeZone);
	const nowMonth: UserStatsMonth = {
		year: nowParts.year,
		month: nowParts.month,
	};

	switch (period.type) {
		case "life":
		case "none": {
			const start = options.firstDatedRead ?? nowMonth;
			return { start, end: nowMonth };
		}
		case "year":
			return {
				start: { year: period.year, month: 1 },
				end: { year: period.year, month: 12 },
			};
		case "month":
			return {
				start: { year: period.year, month: period.month },
				end: { year: period.year, month: period.month },
			};
		case "custom":
			return { start: period.start, end: period.end };
	}
}

export function formatUserStatsPeriodTitle(
	displayName: string,
	period: UserStatsPeriod,
	locale?: string,
): string {
	const possessive = displayName.endsWith("s")
		? `${displayName}'`
		: `${displayName}'s`;

	if (period.type === "life") {
		return `${possessive} Life in Books`;
	}

	if (period.type === "none") {
		return `${possessive} Books Read`;
	}

	if (period.type === "year") {
		return `${possessive} ${period.year} in Books`;
	}

	if (period.type === "month") {
		const label = new Intl.DateTimeFormat(locale, {
			month: "long",
			year: "numeric",
			timeZone: "UTC",
		}).format(new Date(Date.UTC(period.year, period.month - 1, 1)));
		return `${possessive} ${label} in Books`;
	}

	const startLabel = formatShortMonth(period.start, locale);
	const endLabel = formatShortMonth(period.end, locale);
	return `${possessive} ${startLabel} to ${endLabel} in Books`;
}

function formatShortMonth(month: UserStatsMonth, locale?: string): string {
	return new Intl.DateTimeFormat(locale, {
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(month.year, month.month - 1, 1)));
}

export function readHasFinishMonth(read: {
	readEndYear: number | null;
	readEndMonth: number | null;
}): read is { readEndYear: number; readEndMonth: number } {
	return read.readEndYear != null && read.readEndMonth != null;
}

export function readFinishMonth(read: {
	readEndYear: number | null;
	readEndMonth: number | null;
}): UserStatsMonth | null {
	if (!readHasFinishMonth(read)) {
		return null;
	}
	return { year: read.readEndYear, month: read.readEndMonth };
}

/** Dated reads in period; undated reads for life/none (library-wide totals). */
export function readCountsForPeriod(
	read: {
		readEndYear: number | null;
		readEndMonth: number | null;
	},
	period: UserStatsPeriod,
	bounds: UserStatsPeriodBounds,
): { inPeriod: boolean; includeUndatedInTotals: boolean } {
	if (period.type === "none") {
		return { inPeriod: true, includeUndatedInTotals: true };
	}

	const finish = readFinishMonth(read);
	if (!finish) {
		return {
			inPeriod: period.type === "life",
			includeUndatedInTotals: period.type === "life",
		};
	}
	const inPeriod = isMonthInRange(finish, bounds.start, bounds.end);
	return { inPeriod, includeUndatedInTotals: false };
}

export function activityCreatedInPeriod(
	createdAt: Date,
	period: UserStatsPeriod,
	bounds: UserStatsPeriodBounds,
): boolean {
	if (period.type === "life" || period.type === "none") {
		return true;
	}
	const month = monthFromDateUtc(createdAt);
	return isMonthInRange(month, bounds.start, bounds.end);
}

function monthFromDateUtc(date: Date): UserStatsMonth {
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
	};
}

export function enumerateMonthsInBounds(
	bounds: UserStatsPeriodBounds,
): UserStatsMonth[] {
	const out: UserStatsMonth[] = [];
	let { year, month } = bounds.start;
	const endKey = monthSortKey(bounds.end);
	while (monthSortKey({ year, month }) <= endKey) {
		out.push({ year, month });
		month += 1;
		if (month > 12) {
			month = 1;
			year += 1;
		}
	}
	return out;
}
