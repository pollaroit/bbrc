import {
	addCalendarDays,
	getZonedParts,
	resolveClubTimeZone,
	zonedTimeToUtc,
} from "@bbrc/shared";

export const leaderboardPeriods = ["month", "year", "week", "all"] as const;
export type LeaderboardPeriod = (typeof leaderboardPeriods)[number];

/** URL segment when not the default (`month`). */
export const leaderboardPeriodSlugs = ["all", "year", "week"] as const;
export type LeaderboardPeriodSlug = (typeof leaderboardPeriodSlugs)[number];

export const DEFAULT_LEADERBOARD_PERIOD: LeaderboardPeriod = "month";

export const LEADERBOARD_PERIOD_META: Record<
	LeaderboardPeriod,
	{ label: string; shortLabel: string; slug: LeaderboardPeriodSlug | null }
> = {
	month: { label: "This month", shortLabel: "Month", slug: null },
	year: { label: "This year", shortLabel: "Year", slug: "year" },
	week: { label: "This week", shortLabel: "Week", slug: "week" },
	all: { label: "All time", shortLabel: "All time", slug: "all" },
};

export function parseLeaderboardPeriodSlug(
	value: string,
): LeaderboardPeriodSlug | null {
	if (value === "all" || value === "year" || value === "week") {
		return value;
	}
	return null;
}

export function periodFromSlug(
	slug: LeaderboardPeriodSlug | null | undefined,
): LeaderboardPeriod {
	if (slug == null) {
		return "month";
	}
	switch (slug) {
		case "all":
			return "all";
		case "year":
			return "year";
		case "week":
			return "week";
		default: {
			const _exhaustive: never = slug;
			return _exhaustive;
		}
	}
}

export function slugFromPeriod(
	period: LeaderboardPeriod,
): LeaderboardPeriodSlug | null {
	return LEADERBOARD_PERIOD_META[period].slug;
}

const WEEKDAY_TO_MONDAY_OFFSET: Record<string, number> = {
	Monday: 0,
	Tuesday: 1,
	Wednesday: 2,
	Thursday: 3,
	Friday: 4,
	Saturday: 5,
	Sunday: 6,
};

function clubWeekdayMondayOffset(date: Date, timeZone: string): number {
	const weekday = new Intl.DateTimeFormat("en-US", {
		timeZone,
		weekday: "long",
	}).format(date);
	return WEEKDAY_TO_MONDAY_OFFSET[weekday] ?? 0;
}

export type LeaderboardPeriodRange = {
	gte: Date;
	lt: Date;
};

/** Inclusive start, exclusive end, in club local calendar boundaries. */
export function getLeaderboardPeriodRange(
	period: LeaderboardPeriod,
	reference: Date = new Date(),
	timeZone: string = resolveClubTimeZone(),
): LeaderboardPeriodRange | null {
	if (period === "all") {
		return null;
	}

	const now = getZonedParts(reference, timeZone);

	if (period === "year") {
		const gte = zonedTimeToUtc(now.year, 1, 1, 0, 0, timeZone);
		const lt = zonedTimeToUtc(now.year + 1, 1, 1, 0, 0, timeZone);
		return { gte, lt };
	}

	if (period === "month") {
		const gte = zonedTimeToUtc(now.year, now.month, 1, 0, 0, timeZone);
		const nextMonth =
			now.month === 12
				? { year: now.year + 1, month: 1 }
				: { year: now.year, month: now.month + 1 };
		const lt = zonedTimeToUtc(
			nextMonth.year,
			nextMonth.month,
			1,
			0,
			0,
			timeZone,
		);
		return { gte, lt };
	}

	const mondayOffset = clubWeekdayMondayOffset(reference, timeZone);
	const monday = addCalendarDays(now.year, now.month, now.day, -mondayOffset);
	const gte = zonedTimeToUtc(
		monday.year,
		monday.month,
		monday.day,
		0,
		0,
		timeZone,
	);
	const nextMonday = addCalendarDays(monday.year, monday.month, monday.day, 7);
	const lt = zonedTimeToUtc(
		nextMonday.year,
		nextMonday.month,
		nextMonday.day,
		0,
		0,
		timeZone,
	);
	return { gte, lt };
}
