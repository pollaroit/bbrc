import type { UserStatsMonth, UserStatsPeriodBounds } from "./period";
import { enumerateMonthsInBounds, monthSortKey } from "./period";

/*
 * Reading pace as a chart: books and pages finished per month, with a rolling
 * average that smooths the lumpy months, and a "at this pace" projection for a year.
 */

export type PaceRead = { finish: UserStatsMonth; pages: number };

export type PaceMonth = {
	monthKey: string;
	label: string;
	books: number;
	pages: number;
	/** Average per month over this month and the ones before it (up to `window`). */
	rollingBooks: number;
	rollingPages: number;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

export function monthlyPaceSeries(
	reads: readonly PaceRead[],
	bounds: UserStatsPeriodBounds,
	window = 3,
	locale?: string,
): PaceMonth[] {
	const months = enumerateMonthsInBounds(bounds);
	const byMonth = new Map<number, { books: number; pages: number }>();
	for (const read of reads) {
		const key = monthSortKey(read.finish);
		const current = byMonth.get(key) ?? { books: 0, pages: 0 };
		current.books += 1;
		current.pages += read.pages;
		byMonth.set(key, current);
	}

	const base = months.map((month) => {
		const totals = byMonth.get(monthSortKey(month)) ?? { books: 0, pages: 0 };
		return { month, ...totals };
	});

	const span = Math.max(1, window);
	const multiYear = bounds.start.year !== bounds.end.year;
	return base.map((entry, index) => {
		const slice = base.slice(Math.max(0, index - span + 1), index + 1);
		const books = slice.reduce((sum, item) => sum + item.books, 0);
		const pages = slice.reduce((sum, item) => sum + item.pages, 0);
		return {
			monthKey: `${entry.month.year}-${String(entry.month.month).padStart(2, "0")}`,
			label: new Intl.DateTimeFormat(locale, {
				month: "short",
				year: multiYear ? "2-digit" : undefined,
				timeZone: "UTC",
			}).format(new Date(Date.UTC(entry.month.year, entry.month.month - 1, 1))),
			books: entry.books,
			pages: entry.pages,
			rollingBooks: round1(books / slice.length),
			rollingPages: Math.round(pages / slice.length),
		};
	});
}

export type YearPaceSummary = {
	year: number;
	books: number;
	pages: number;
	/** Whole months of the year that have passed, counting the current one. */
	monthsElapsed: number;
	/** At the pace so far; null once the year is over (nothing left to project). */
	projectedBooks: number | null;
	projectedPages: number | null;
	previousYearBooks: number;
	previousYearPages: number;
};

export function yearPaceSummary(
	reads: readonly PaceRead[],
	year: number,
	now: UserStatsMonth,
): YearPaceSummary {
	const inYear = reads.filter((read) => read.finish.year === year);
	const books = inYear.length;
	const pages = inYear.reduce((sum, read) => sum + read.pages, 0);
	const previous = reads.filter((read) => read.finish.year === year - 1);

	const monthsElapsed =
		year < now.year ? 12 : year > now.year ? 0 : Math.max(1, now.month);
	const projecting = year === now.year && monthsElapsed < 12;

	return {
		year,
		books,
		pages,
		monthsElapsed,
		projectedBooks: projecting
			? Math.round((books / monthsElapsed) * 12)
			: null,
		projectedPages: projecting
			? Math.round((pages / monthsElapsed) * 12)
			: null,
		previousYearBooks: previous.length,
		previousYearPages: previous.reduce((sum, read) => sum + read.pages, 0),
	};
}
