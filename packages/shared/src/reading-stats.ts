import { clubDayKey, dayKeysBetween } from "./views";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FinishedReading = {
	startedAt: Date;
	finishedAt: Date;
	totalPages: number | null;
};

export type ReadingStats = {
	finishedCount: number;
	/** Average days from starting to finishing; null with nothing finished. */
	averageDaysToFinish: number | null;
	/** Pages read per day across finished books that have page counts. */
	pagesPerDay: number | null;
	/** Longest run of days with at least one progress update. */
	longestStreak: number;
	/** The run that ends today or yesterday (0 when it has been broken). */
	currentStreak: number;
	/** Books finished per month, oldest first (`YYYY-MM`). */
	perMonth: { month: string; count: number }[];
	/** Total pages logged on finished books. */
	pagesFinished: number;
};

/** Reading numbers from finished sessions and the days a member logged progress. */
export function readingStats(input: {
	finished: FinishedReading[];
	/** The moments progress was logged, any order. */
	logTimes: Date[];
	now: Date;
	timeZone?: string;
}): ReadingStats {
	const { finished, logTimes, now, timeZone } = input;

	const days = finished.map((row) =>
		Math.max(
			1,
			Math.ceil((row.finishedAt.getTime() - row.startedAt.getTime()) / DAY_MS),
		),
	);
	const averageDaysToFinish =
		days.length > 0
			? days.reduce((sum, value) => sum + value, 0) / days.length
			: null;

	let pages = 0;
	let pageDays = 0;
	finished.forEach((row, index) => {
		if (row.totalPages && row.totalPages > 0) {
			pages += row.totalPages;
			pageDays += days[index] ?? 1;
		}
	});

	const perMonth = new Map<string, number>();
	for (const row of finished) {
		const month = clubDayKey(row.finishedAt, timeZone).slice(0, 7);
		perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
	}

	const dayKeys = [
		...new Set(logTimes.map((at) => clubDayKey(at, timeZone))),
	].sort();
	let longest = 0;
	let run = 0;
	let previous: string | null = null;
	for (const key of dayKeys) {
		if (previous && dayKeysBetween(previous, key).length === 2) {
			run += 1;
		} else {
			run = 1;
		}
		longest = Math.max(longest, run);
		previous = key;
	}
	const today = clubDayKey(now, timeZone);
	const yesterday = clubDayKey(new Date(now.getTime() - DAY_MS), timeZone);
	const last = dayKeys.at(-1);
	const currentStreak = last === today || last === yesterday ? run : 0;

	return {
		finishedCount: finished.length,
		averageDaysToFinish:
			averageDaysToFinish == null
				? null
				: Math.round(averageDaysToFinish * 10) / 10,
		pagesPerDay: pageDays > 0 ? Math.round((pages / pageDays) * 10) / 10 : null,
		longestStreak: longest,
		currentStreak,
		perMonth: [...perMonth.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([month, count]) => ({ month, count })),
		pagesFinished: pages,
	};
}
