import { FEEDBACK_RATING_STEPS } from "../feedback-rating";
import type {
	UserStatsMonth,
	UserStatsPeriod,
	UserStatsPeriodBounds,
} from "./period";
import { enumerateMonthsInBounds, monthSortKey } from "./period";
import { canonicalSubjectKey, canonicalSubjectLabel } from "./subjects";

export const USER_STATS_PAGE_BUCKETS = [
	"1-100",
	"101-200",
	"201-300",
	"301-400",
	"401-500",
	"501-700",
	"701-1000",
	"1000+",
] as const;

export function pagesBucketLabel(
	pages: number,
): (typeof USER_STATS_PAGE_BUCKETS)[number] {
	if (pages <= 100) return "1-100";
	if (pages <= 200) return "101-200";
	if (pages <= 300) return "201-300";
	if (pages <= 400) return "301-400";
	if (pages <= 500) return "401-500";
	if (pages <= 700) return "501-700";
	if (pages <= 1000) return "701-1000";
	return "1000+";
}

export function clubRatingBucket(rating: number | null | undefined): string {
	if (rating == null || Number.isNaN(rating)) {
		return "unrated";
	}
	const clamped = Math.min(5, Math.max(0, rating));
	const step = Math.round(clamped * 2) / 2;
	return step.toFixed(1);
}

export function histogramFromValues<T extends string>(
	values: T[],
	order: readonly T[],
): { label: T; count: number }[] {
	const map = new Map<T, number>();
	for (const value of values) {
		map.set(value, (map.get(value) ?? 0) + 1);
	}
	return order.map((label) => ({ label, count: map.get(label) ?? 0 }));
}

export function topBucketLabel(
	rows: { label: string; count: number }[],
): string | null {
	let best: { label: string; count: number } | null = null;
	for (const row of rows) {
		if (row.count === 0) continue;
		if (!best || row.count > best.count) {
			best = row;
		}
	}
	return best?.label ?? null;
}

export function computeReadingPace(
	datedReadCount: number,
	totalPages: number,
	bounds: UserStatsPeriodBounds,
	period?: UserStatsPeriod,
): {
	booksPerYear: number;
	booksPerMonth: number;
	booksPerWeek: number;
	booksPerDay: number;
	pagesPerYear: number;
	pagesPerMonth: number;
	pagesPerWeek: number;
	pagesPerDay: number;
} {
	const monthSpan = Math.max(
		1,
		monthSortKey(bounds.end) - monthSortKey(bounds.start) + 1,
	);
	const years = monthSpan / 12;
	const weeks = (monthSpan * 30.437) / 7;
	const days = monthSpan * 30.437;

	if (period?.type === "year") {
		return {
			booksPerYear: datedReadCount,
			booksPerMonth: datedReadCount / monthSpan,
			booksPerWeek: datedReadCount / weeks,
			booksPerDay: datedReadCount / days,
			pagesPerYear: totalPages,
			pagesPerMonth: totalPages / monthSpan,
			pagesPerWeek: totalPages / weeks,
			pagesPerDay: totalPages / days,
		};
	}

	if (period?.type === "month") {
		return {
			booksPerYear: datedReadCount * 12,
			booksPerMonth: datedReadCount,
			booksPerWeek: datedReadCount / weeks,
			booksPerDay: datedReadCount / days,
			pagesPerYear: totalPages * 12,
			pagesPerMonth: totalPages,
			pagesPerWeek: totalPages / weeks,
			pagesPerDay: totalPages / days,
		};
	}

	const booksPerYear = datedReadCount / years;
	const pagesPerYear = totalPages / years;

	return {
		booksPerYear,
		booksPerMonth: datedReadCount / monthSpan,
		booksPerWeek: datedReadCount / weeks,
		booksPerDay: datedReadCount / days,
		pagesPerYear,
		pagesPerMonth: totalPages / monthSpan,
		pagesPerWeek: totalPages / weeks,
		pagesPerDay: totalPages / days,
	};
}

export type CumulativeReadPoint = {
	monthKey: string;
	label: string;
	books: number;
	pages: number;
	authors: number;
};

export function computeCumulativeReadSeries(
	reads: {
		finish: UserStatsMonth;
		pages: number;
		authorKeys: string[];
	}[],
	bounds: UserStatsPeriodBounds,
	locale?: string,
): CumulativeReadPoint[] {
	const months = enumerateMonthsInBounds(bounds);
	const byMonth = new Map<number, typeof reads>();
	for (const read of reads) {
		const key = monthSortKey(read.finish);
		const list = byMonth.get(key) ?? [];
		list.push(read);
		byMonth.set(key, list);
	}

	let books = 0;
	let pages = 0;
	const authorSet = new Set<string>();

	return months.map((month) => {
		const key = monthSortKey(month);
		const batch = byMonth.get(key) ?? [];
		for (const row of batch) {
			books += 1;
			pages += row.pages;
			for (const author of row.authorKeys) {
				authorSet.add(author);
			}
		}
		const label = new Intl.DateTimeFormat(locale, {
			month: "short",
			year: bounds.start.year === bounds.end.year ? undefined : "2-digit",
			timeZone: "UTC",
		}).format(new Date(Date.UTC(month.year, month.month - 1, 1)));

		return {
			monthKey: `${month.year}-${String(month.month).padStart(2, "0")}`,
			label,
			books,
			pages,
			authors: authorSet.size,
		};
	});
}

export function readsByYearHistogram(
	reads: { finish: UserStatsMonth }[],
): { label: string; count: number }[] {
	const map = new Map<number, number>();
	for (const read of reads) {
		map.set(read.finish.year, (map.get(read.finish.year) ?? 0) + 1);
	}
	return [...map.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([year, count]) => ({ label: String(year), count }));
}

export function readsByMonthHistogram(
	reads: { finish: UserStatsMonth }[],
	locale?: string,
): { label: string; count: number }[] {
	const map = new Map<number, number>();
	for (const read of reads) {
		const key = monthSortKey(read.finish);
		map.set(key, (map.get(key) ?? 0) + 1);
	}
	return [...map.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([key, count]) => {
			const year = Math.floor(key / 12);
			const month = (key % 12) + 1;
			const label = new Intl.DateTimeFormat(locale, {
				month: "short",
				timeZone: "UTC",
			}).format(new Date(Date.UTC(year, month - 1, 1)));
			return { label, count };
		});
}

export function publicationHistogram(
	years: number[],
	mode: "year" | "decade" | "century",
): { label: string; count: number }[] {
	const map = new Map<string, number>();
	for (const year of years) {
		let label: string;
		if (mode === "year") {
			label = String(year);
		} else if (mode === "decade") {
			label = `${Math.floor(year / 10) * 10}s`;
		} else {
			const century = Math.floor((year - 1) / 100) + 1;
			label = `${century}${ordinalSuffix(century)} c.`;
		}
		map.set(label, (map.get(label) ?? 0) + 1);
	}
	return [...map.entries()]
		.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
		.map(([label, count]) => ({ label, count }));
}

function ordinalSuffix(n: number): string {
	const mod100 = n % 100;
	if (mod100 >= 11 && mod100 <= 13) return "th";
	switch (n % 10) {
		case 1:
			return "st";
		case 2:
			return "nd";
		case 3:
			return "rd";
		default:
			return "th";
	}
}

export function subjectBreakdown(
	subjectLists: string[][],
	limit = 10,
): { subject: string; count: number; percentage: number }[] {
	const map = new Map<string, number>();
	let total = 0;
	for (const subjects of subjectLists) {
		const seen = new Set<string>();
		for (const subject of subjects) {
			const raw = subject.trim();
			if (!raw) continue;
			const key = canonicalSubjectKey(raw);
			if (!key || seen.has(key)) continue;
			seen.add(key);
			map.set(key, (map.get(key) ?? 0) + 1);
			total += 1;
		}
	}
	if (total === 0) {
		return [];
	}
	return [...map.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([key, count]) => ({
			subject: canonicalSubjectLabel(key),
			count,
			percentage: Math.round((count / total) * 1000) / 10,
		}));
}

export function ratingHistogramForClubAverage(
	ratings: (number | null | undefined)[],
): { label: string; count: number }[] {
	const labels = FEEDBACK_RATING_STEPS.map((step) => step.toFixed(1));
	const values = ratings.map((rating) => {
		if (rating == null) return "unrated";
		return clubRatingBucket(rating);
	});
	const order = [...labels, "unrated"];
	return histogramFromValues(values, order);
}

export function averageNumber(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function percentileRankBetterThan(
	userCount: number,
	allCounts: number[],
): { percentile: number; rank: number; memberCount: number } | null {
	const eligible = allCounts.filter((count) => count > 0);
	if (eligible.length === 0 || userCount === 0) {
		return null;
	}
	const lower = eligible.filter((count) => count < userCount).length;
	const percentile =
		Math.round(((eligible.length - lower) / eligible.length) * 1000) / 10;
	const rank = eligible.filter((count) => count > userCount).length + 1;
	return { percentile, rank, memberCount: eligible.length };
}
