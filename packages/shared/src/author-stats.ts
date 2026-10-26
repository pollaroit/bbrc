/**
 * Pure helpers behind the author Stats tab and the admin author dashboards: month keys, time
 * series with gaps filled, buckets and "this period vs the one before" comparisons.
 */

const DAY_MS = 86_400_000;

/** "2024-03" for a calendar month (1–12). */
export function monthKey(year: number, month: number): string {
	return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthKeyOfDate(date: Date): string {
	return monthKey(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

/** Every month key from `from` to `to` (inclusive), oldest first. Empty when `from` is after `to`. */
export function monthRange(from: string, to: string): string[] {
	const parse = (key: string) => {
		const [year, month] = key.split("-").map(Number);
		return { year: year ?? 0, month: month ?? 1 };
	};
	const start = parse(from);
	const end = parse(to);
	const keys: string[] = [];
	let year = start.year;
	let month = start.month;
	while (year < end.year || (year === end.year && month <= end.month)) {
		keys.push(monthKey(year, month));
		month += 1;
		if (month > 12) {
			month = 1;
			year += 1;
		}
		// Safety net against a malformed range.
		if (keys.length > 2400) break;
	}
	return keys;
}

/**
 * A continuous monthly series from the first to the last month that has data (or the given
 * bounds), with zeros for the months in between.
 */
export function fillMonthSeries(
	counts: ReadonlyMap<string, number>,
	bounds?: { from?: string; to?: string },
): { month: string; count: number }[] {
	const keys = [...counts.keys()].sort();
	const first = bounds?.from ?? keys[0];
	const last = bounds?.to ?? keys[keys.length - 1];
	if (!first || !last) return [];
	return monthRange(first, last).map((month) => ({
		month,
		count: counts.get(month) ?? 0,
	}));
}

/** Running total of a series. */
export function cumulativeSeries<T extends { count: number }>(
	series: readonly T[],
): (T & { total: number })[] {
	let total = 0;
	return series.map((point) => {
		total += point.count;
		return { ...point, total };
	});
}

/** Twelve buckets (January first) from calendar months 1–12; anything else is ignored. */
export function seasonality(
	months: readonly (number | null | undefined)[],
): { month: number; count: number }[] {
	const buckets = Array.from({ length: 12 }, (_, index) => ({
		month: index + 1,
		count: 0,
	}));
	for (const month of months) {
		if (month == null || month < 1 || month > 12) continue;
		const bucket = buckets[month - 1];
		if (bucket) bucket.count += 1;
	}
	return buckets;
}

type Bucket = { key: string; label: string; min: number; max: number | null };

function bucketize(values: readonly number[], buckets: readonly Bucket[]) {
	const counts = buckets.map(() => 0);
	for (const value of values) {
		if (!Number.isFinite(value) || value < 0) continue;
		const index = buckets.findIndex(
			(bucket) =>
				value >= bucket.min && (bucket.max == null || value < bucket.max),
		);
		if (index >= 0) counts[index] = (counts[index] ?? 0) + 1;
	}
	return buckets.map((bucket, index) => ({
		key: bucket.key,
		label: bucket.label,
		count: counts[index] ?? 0,
	}));
}

const READING_TIME_BUCKETS: Bucket[] = [
	{ key: "1", label: "Up to 3 days", min: 0, max: 3 },
	{ key: "2", label: "3–7 days", min: 3, max: 7 },
	{ key: "3", label: "1–2 weeks", min: 7, max: 14 },
	{ key: "4", label: "2–4 weeks", min: 14, max: 30 },
	{ key: "5", label: "1–2 months", min: 30, max: 60 },
	{ key: "6", label: "2–3 months", min: 60, max: 90 },
	{ key: "7", label: "3 months or more", min: 90, max: null },
];

/** Days to finish, grouped. */
export function bucketReadingDays(days: readonly number[]) {
	return bucketize(days, READING_TIME_BUCKETS);
}

const PAGE_BUCKETS: Bucket[] = [
	{ key: "1", label: "Under 200", min: 0, max: 200 },
	{ key: "2", label: "200–349", min: 200, max: 350 },
	{ key: "3", label: "350–499", min: 350, max: 500 },
	{ key: "4", label: "500–749", min: 500, max: 750 },
	{ key: "5", label: "750–999", min: 750, max: 1000 },
	{ key: "6", label: "1,000 or more", min: 1000, max: null },
];

export function bucketPageCounts(pages: readonly number[]) {
	return bucketize(pages, PAGE_BUCKETS);
}

export type StatComparison = {
	value: number;
	/** The same number for the window just before, or null when no range was chosen. */
	previous: number | null;
	/** `value - previous`, or null. */
	delta: number | null;
	/** Change in percent of `previous`; null when there is no previous window or it was zero. */
	deltaPercent: number | null;
};

/** A number next to the same number for the previous window. */
export function compareStat(
	value: number,
	previous: number | null | undefined,
): StatComparison {
	if (previous == null) {
		return { value, previous: null, delta: null, deltaPercent: null };
	}
	const delta = value - previous;
	return {
		value,
		previous,
		delta: Math.round(delta * 100) / 100,
		deltaPercent:
			previous === 0 ? null : Math.round((delta / previous) * 1000) / 10,
	};
}

/**
 * The window of equal length that ends right before `from`. Needs both bounds; with an open
 * end there is nothing sensible to compare with.
 */
export function previousRange(range: {
	from?: Date | null;
	to?: Date | null;
}): { from: Date; to: Date } | null {
	if (!range.from || !range.to) return null;
	const length = range.to.getTime() - range.from.getTime();
	if (length < 0) return null;
	const to = new Date(range.from.getTime() - 1);
	return { from: new Date(to.getTime() - length), to };
}

/** Whole days between two dates, never negative. */
export function daysBetween(start: Date, end: Date): number {
	return Math.max(0, (end.getTime() - start.getTime()) / DAY_MS);
}

export function roundTo(value: number, digits = 1): number {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}

/** Mean of a list, null when empty. */
export function mean(values: readonly number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** First day of the month (UTC) `monthsAgo` months back from `now`. */
export function startOfMonthsAgo(now: Date, monthsAgo: number): Date {
	return new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1),
	);
}
