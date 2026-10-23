import { FEEDBACK_RATING_STEPS } from "./feedback-rating";

export type BookStatsMonth = { year: number; month: number };

/** Months since year 0, so months can be compared and iterated as plain numbers. */
export function bookStatsMonthIndex(month: BookStatsMonth): number {
	return month.year * 12 + (month.month - 1);
}

export function bookStatsMonthFromIndex(index: number): BookStatsMonth {
	return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function bookStatsMonthRange(
	startIndex: number,
	endIndex: number,
): BookStatsMonth[] {
	const months: BookStatsMonth[] = [];
	for (let index = startIndex; index <= endIndex; index += 1) {
		months.push(bookStatsMonthFromIndex(index));
	}
	return months;
}

export function medianNumber(values: number[]): number | null {
	if (values.length === 0) {
		return null;
	}
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1
		? (sorted[middle] as number)
		: ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

export type BookStatsReadInput = {
	/** Finish month the member entered; null when they left it blank. */
	finish: BookStatsMonth | null;
	/** Month the read was marked on the site (club time zone). */
	marked: BookStatsMonth;
};

export type BookStatsReadMonth = BookStatsMonth & {
	/** Reads with a finish month the member entered. */
	dated: number;
	/** Reads without a finish month, placed by the month they were marked. */
	undated: number;
};

/**
 * One row per month from the first read through `endIndex`. Undated reads are
 * kept apart so the UI can show or hide them instead of guessing.
 */
export function bookReadsByMonth(
	reads: BookStatsReadInput[],
	endIndex: number,
): BookStatsReadMonth[] {
	if (reads.length === 0) {
		return [];
	}

	const dated = new Map<number, number>();
	const undated = new Map<number, number>();
	let first = Number.POSITIVE_INFINITY;
	let last = endIndex;

	for (const read of reads) {
		const index = bookStatsMonthIndex(read.finish ?? read.marked);
		const bucket = read.finish ? dated : undated;
		bucket.set(index, (bucket.get(index) ?? 0) + 1);
		first = Math.min(first, index);
		last = Math.max(last, index);
	}

	return bookStatsMonthRange(first, last).map((month) => {
		const index = bookStatsMonthIndex(month);
		return {
			...month,
			dated: dated.get(index) ?? 0,
			undated: undated.get(index) ?? 0,
		};
	});
}

export type BookRatingStepCount = { step: number; count: number };

export function bookRatingHistogram(ratings: number[]): BookRatingStepCount[] {
	const counts = new Map<number, number>();
	for (const rating of ratings) {
		counts.set(rating, (counts.get(rating) ?? 0) + 1);
	}
	return FEEDBACK_RATING_STEPS.map((step) => ({
		step,
		count: counts.get(step) ?? 0,
	}));
}

export type BookRatingMonth = BookStatsMonth & {
	/** Average of every rating given up to the end of this month. */
	average: number | null;
	/** Ratings given up to the end of this month. */
	cumulativeCount: number;
	/** Ratings given during this month. */
	newCount: number;
};

export function bookRatingsByMonth(
	ratings: { month: BookStatsMonth; rating: number }[],
	endIndex: number,
): BookRatingMonth[] {
	if (ratings.length === 0) {
		return [];
	}

	const byMonth = new Map<number, number[]>();
	let first = Number.POSITIVE_INFINITY;
	let last = endIndex;
	for (const item of ratings) {
		const index = bookStatsMonthIndex(item.month);
		const list = byMonth.get(index) ?? [];
		list.push(item.rating);
		byMonth.set(index, list);
		first = Math.min(first, index);
		last = Math.max(last, index);
	}

	let sum = 0;
	let count = 0;
	return bookStatsMonthRange(first, last).map((month) => {
		const batch = byMonth.get(bookStatsMonthIndex(month)) ?? [];
		for (const rating of batch) {
			sum += rating;
		}
		count += batch.length;
		return {
			...month,
			average: count > 0 ? sum / count : null,
			cumulativeCount: count,
			newCount: batch.length,
		};
	});
}

/** Standard competition ranking: equal points share a place (1, 1, 3). */
export function competitionRank(
	points: number,
	allPoints: readonly number[],
): number {
	return allPoints.filter((value) => value > points).length + 1;
}

export type BookDaysBucket = { label: string; count: number };

const FINISH_DAY_BUCKETS = [
	{ label: "Under 3 days", max: 3 },
	{ label: "3–7 days", max: 7 },
	{ label: "1–2 weeks", max: 14 },
	{ label: "2–3 weeks", max: 21 },
	{ label: "3–4 weeks", max: 28 },
	{ label: "4–6 weeks", max: 42 },
] as const;

export function bookFinishDaysHistogram(days: number[]): BookDaysBucket[] {
	const buckets: BookDaysBucket[] = [
		...FINISH_DAY_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 })),
		{ label: "Over 6 weeks", count: 0 },
	];
	for (const value of days) {
		const index = FINISH_DAY_BUCKETS.findIndex((bucket) => value < bucket.max);
		const target = buckets[index === -1 ? buckets.length - 1 : index];
		if (target) {
			target.count += 1;
		}
	}
	return buckets;
}
