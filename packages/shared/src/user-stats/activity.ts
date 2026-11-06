import type { UserStatsPeriodBounds } from "./period";
import { enumerateMonthsInBounds, monthSortKey } from "./period";

/*
 * Counting things that carry a timestamp (reviews, posts, shelves) month by month,
 * for the cumulative charts of the Community tab.
 */

export type ActivityMonth = {
	monthKey: string;
	label: string;
	/** Made this month. */
	added: number;
	/** Made up to and including this month. */
	total: number;
};

const monthOf = (date: Date) => ({
	year: date.getUTCFullYear(),
	month: date.getUTCMonth() + 1,
});

/**
 * The months to draw: the period's own when it has a time axis, and for "All time" from
 * the first item to now (activity can begin before the first dated read).
 */
export function activityBounds(
	dates: readonly Date[],
	periodBounds: UserStatsPeriodBounds,
	hasFixedRange: boolean,
): UserStatsPeriodBounds {
	if (hasFixedRange || dates.length === 0) return periodBounds;
	const first = dates.reduce((min, date) => (date < min ? date : min));
	const start = monthOf(first);
	return monthSortKey(start) < monthSortKey(periodBounds.start)
		? { start, end: periodBounds.end }
		: periodBounds;
}

export function cumulativeByMonth(
	dates: readonly Date[],
	bounds: UserStatsPeriodBounds,
	locale?: string,
): ActivityMonth[] {
	const per = new Map<number, number>();
	for (const date of dates) {
		const key = monthSortKey(monthOf(date));
		per.set(key, (per.get(key) ?? 0) + 1);
	}
	const multiYear = bounds.start.year !== bounds.end.year;
	let total = 0;
	// Items from before the first month are part of the running total from the start.
	const startKey = monthSortKey(bounds.start);
	for (const [key, count] of per) if (key < startKey) total += count;

	return enumerateMonthsInBounds(bounds).map((month) => {
		const added = per.get(monthSortKey(month)) ?? 0;
		total += added;
		return {
			monthKey: `${month.year}-${String(month.month).padStart(2, "0")}`,
			label: new Intl.DateTimeFormat(locale, {
				month: "short",
				year: multiYear ? "2-digit" : undefined,
				timeZone: "UTC",
			}).format(new Date(Date.UTC(month.year, month.month - 1, 1))),
			added,
			total,
		};
	});
}
