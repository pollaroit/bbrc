import { resolveClubTimeZone } from "./club-timezone";
import { clubDayKey, clubWeekdayHour } from "./views";

/*
 * Pure rules for the reading activity page (`/users/[username]/reading`): what a
 * finished Reading Mode session is worth in pages, speed and time, how the
 * global filters cut a member's sessions, and the stats and rankings worked out
 * from whatever is left. The server loads a member's sessions once and calls
 * these; nothing here knows about the database or about who is looking (that is
 * `ActivityScope`).
 *
 * Days, weeks (Monday first), months and weekdays are cut in the club time zone,
 * like streaks, so everyone sees the same days.
 */

export const ACTIVITY_MODES = ["free", "countdown", "pomodoro"] as const;
export type ActivityMode = (typeof ACTIVITY_MODES)[number];

/** "Free" is the stopwatch in Reading Mode. */
export const ACTIVITY_MODE_LABELS: Record<ActivityMode, string> = {
	free: "Stopwatch",
	countdown: "Countdown",
	pomodoro: "Pomodoro",
};

export const ACTIVITY_FORMATS = [
	"paperback",
	"hardcover",
	"ebook",
	"audiobook",
	"other",
] as const;
export type ActivityFormat = (typeof ACTIVITY_FORMATS)[number];

export const ACTIVITY_FORMAT_LABELS: Record<ActivityFormat, string> = {
	paperback: "Paperback",
	hardcover: "Hardcover",
	ebook: "E-book",
	audiobook: "Audiobook",
	other: "Other",
};

export const DAY_PARTS = ["morning", "afternoon", "evening", "night"] as const;
export type DayPart = (typeof DAY_PARTS)[number];

export const DAY_PART_LABELS: Record<DayPart, string> = {
	morning: "Morning",
	afternoon: "Afternoon",
	evening: "Evening",
	night: "Night",
};

export const WEEKDAY_LABELS = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
] as const;

/** One finished session of a book. Sessions without a book never get here. */
export type ActivitySession = {
	id: string;
	startedAt: Date;
	endedAt: Date;
	/** Reading time in seconds (breaks and pauses are not in it). */
	seconds: number;
	mode: ActivityMode;
	targetMinutes: number | null;
	pageFrom: number | null;
	pageTo: number | null;
	percentFrom: number;
	percentTo: number | null;
	format: ActivityFormat | null;
	book: {
		id: string;
		slug: string;
		title: string;
		coverId: number | null;
		authors: { slug: string; name: string }[];
	};
};

/** A session shorter than this has no meaningful speed. */
const MIN_SPEED_SECONDS = 60;
/** A countdown that stopped within this of its target counts as met. */
const TARGET_TOLERANCE_SECONDS = 5;

export function pagesGained(
	s: Pick<ActivitySession, "pageFrom" | "pageTo">,
): number | null {
	if (s.pageFrom == null || s.pageTo == null) return null;
	return Math.max(0, s.pageTo - s.pageFrom);
}

export function percentGained(
	s: Pick<ActivitySession, "percentFrom" | "percentTo">,
): number | null {
	if (s.percentTo == null) return null;
	return Math.max(0, s.percentTo - s.percentFrom);
}

/** Pages per hour; null without page data or with too little time to mean anything. */
export function speedOf(
	s: Pick<ActivitySession, "pageFrom" | "pageTo" | "seconds">,
): number | null {
	const pages = pagesGained(s);
	if (pages == null || s.seconds < MIN_SPEED_SECONDS) return null;
	return (pages / s.seconds) * 3600;
}

/** Only countdowns have a target. */
export function targetMet(
	s: Pick<ActivitySession, "mode" | "targetMinutes" | "seconds">,
): boolean | null {
	if (s.mode !== "countdown" || s.targetMinutes == null) return null;
	return s.seconds >= s.targetMinutes * 60 - TARGET_TOLERANCE_SECONDS;
}

/** The session took the member to the end of the book. */
export function finishedBook(s: Pick<ActivitySession, "percentTo">): boolean {
	return s.percentTo != null && s.percentTo >= 100;
}

export function dayPartOf(date: Date, timeZone?: string): DayPart {
	const { hour } = clubWeekdayHour(date, timeZone);
	if (hour >= 5 && hour < 12) return "morning";
	if (hour >= 12 && hour < 17) return "afternoon";
	if (hour >= 17 && hour < 22) return "evening";
	return "night";
}

/* ----- days, weeks, months ----- */

const DAY_MS = 86_400_000;

function toUtc(key: string): number {
	return new Date(`${key}T00:00:00Z`).getTime();
}

function fromUtc(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
	return fromUtc(toUtc(key) + days * DAY_MS);
}

/** Days from `from` to `to`, counting both ends. */
export function daysInclusive(from: string, to: string): number {
	return Math.round((toUtc(to) - toUtc(from)) / DAY_MS) + 1;
}

/** The Monday of the week a day belongs to. */
export function weekStart(key: string): string {
	const weekday = (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;
	return addDays(key, -weekday);
}

export function monthOf(key: string): string {
	return key.slice(0, 7);
}

export function weekdayOf(key: string): number {
	return (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function dayOf(s: ActivitySession, timeZone?: string): string {
	return clubDayKey(s.endedAt, timeZone ?? resolveClubTimeZone());
}

/* ----- filters ----- */

export type ActivityFilters = {
	/** Club days, inclusive (`YYYY-MM-DD`). */
	from?: string;
	to?: string;
	books?: string[];
	authors?: string[];
	modes?: ActivityMode[];
	formats?: ActivityFormat[];
	minMinutes?: number;
	maxMinutes?: number;
	minPages?: number;
	maxPages?: number;
	minPercent?: number;
	maxPercent?: number;
	/** Pages per hour. */
	minSpeed?: number;
	maxSpeed?: number;
	finished?: boolean;
	targetMet?: boolean;
	dayParts?: DayPart[];
	weekdays?: number[];
};

/** What the person looking is allowed to filter and see. The owner and admins get everything. */
export type ActivityScope = {
	/** Pages, percent and speed (the member's "show my reading progress"). */
	progress: boolean;
	/** Clock times and time of day. */
	clock: boolean;
	/** The "finished the book" marker and filter (needs the member's Reads). */
	finish: boolean;
};

export const FULL_SCOPE: ActivityScope = {
	progress: true,
	clock: true,
	finish: true,
};

/** Drops the filters this viewer may not use, so a hidden thing can never be probed by filtering. */
export function limitFilters(
	filters: ActivityFilters,
	scope: ActivityScope,
): ActivityFilters {
	const next = { ...filters };
	if (!scope.progress) {
		next.minPages = undefined;
		next.maxPages = undefined;
		next.minPercent = undefined;
		next.maxPercent = undefined;
		next.minSpeed = undefined;
		next.maxSpeed = undefined;
	}
	if (!scope.clock) next.dayParts = undefined;
	if (!scope.finish) next.finished = undefined;
	return next;
}

/** Filters that make the finished-book numbers (which come from readings, not sessions) meaningless. */
export function hasSessionOnlyFilters(filters: ActivityFilters): boolean {
	return Boolean(
		filters.authors?.length ||
			filters.modes?.length ||
			filters.formats?.length ||
			filters.minMinutes != null ||
			filters.maxMinutes != null ||
			filters.minPages != null ||
			filters.maxPages != null ||
			filters.minPercent != null ||
			filters.maxPercent != null ||
			filters.minSpeed != null ||
			filters.maxSpeed != null ||
			filters.finished != null ||
			filters.targetMet != null ||
			filters.dayParts?.length ||
			filters.weekdays?.length,
	);
}

function within(
	value: number | null,
	min: number | undefined,
	max: number | undefined,
): boolean {
	if (min == null && max == null) return true;
	if (value == null) return false;
	if (min != null && value < min) return false;
	if (max != null && value > max) return false;
	return true;
}

export function matchesFilters(
	s: ActivitySession,
	f: ActivityFilters,
	timeZone?: string,
	options: { ignoreDates?: boolean } = {},
): boolean {
	const tz = timeZone ?? resolveClubTimeZone();
	if (!options.ignoreDates && (f.from || f.to)) {
		const day = dayOf(s, tz);
		if (f.from && day < f.from) return false;
		if (f.to && day > f.to) return false;
	}
	if (f.books?.length && !f.books.includes(s.book.slug)) return false;
	if (
		f.authors?.length &&
		!s.book.authors.some((a) => f.authors?.includes(a.slug))
	) {
		return false;
	}
	if (f.modes?.length && !f.modes.includes(s.mode)) return false;
	if (f.formats?.length && (!s.format || !f.formats.includes(s.format))) {
		return false;
	}
	if (!within(s.seconds / 60, f.minMinutes, f.maxMinutes)) return false;
	if (!within(pagesGained(s), f.minPages, f.maxPages)) return false;
	if (!within(percentGained(s), f.minPercent, f.maxPercent)) return false;
	if (!within(speedOf(s), f.minSpeed, f.maxSpeed)) return false;
	if (f.finished != null && finishedBook(s) !== f.finished) return false;
	if (f.targetMet != null && targetMet(s) !== f.targetMet) return false;
	if (f.dayParts?.length && !f.dayParts.includes(dayPartOf(s.endedAt, tz))) {
		return false;
	}
	if (f.weekdays?.length && !f.weekdays.includes(weekdayOf(dayOf(s, tz)))) {
		return false;
	}
	return true;
}

export function filterSessions(
	sessions: readonly ActivitySession[],
	filters: ActivityFilters,
	timeZone?: string,
	options?: { ignoreDates?: boolean },
): ActivitySession[] {
	return sessions.filter((s) => matchesFilters(s, filters, timeZone, options));
}

/* ----- date presets ----- */

export const DATE_PRESETS = ["week", "month", "year", "all"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
	week: "This week",
	month: "This month",
	year: "This year",
	all: "All time",
};

/** The club days a preset covers up to `today`, or `null` for all time. */
export function presetRange(
	preset: DatePreset,
	today: string,
): { from: string; to: string } | null {
	if (preset === "all") return null;
	if (preset === "week") return { from: weekStart(today), to: today };
	if (preset === "month") return { from: `${monthOf(today)}-01`, to: today };
	return { from: `${today.slice(0, 4)}-01-01`, to: today };
}

/** The same number of days straight before a range. */
export function previousActivityRange(range: { from: string; to: string }): {
	from: string;
	to: string;
} {
	const length = daysInclusive(range.from, range.to);
	return { from: addDays(range.from, -length), to: addDays(range.from, -1) };
}

/* ----- sorting ----- */

export const ACTIVITY_SORT_FIELDS = [
	"date",
	"duration",
	"pages",
	"percent",
	"speed",
	"title",
	"target",
] as const;
export type ActivitySortField = (typeof ACTIVITY_SORT_FIELDS)[number];

export const ACTIVITY_SORT_LABELS: Record<ActivitySortField, string> = {
	date: "Date",
	duration: "Duration",
	pages: "Pages gained",
	percent: "Percent gained",
	speed: "Reading speed",
	title: "Book title",
	target: "Countdown target",
};

/** Sorts that need the member's reading progress. */
export const PROGRESS_SORT_FIELDS: readonly ActivitySortField[] = [
	"pages",
	"percent",
	"speed",
];

export function sortSessions(
	sessions: readonly ActivitySession[],
	by: ActivitySortField,
	direction: "asc" | "desc",
): ActivitySession[] {
	const sign = direction === "asc" ? 1 : -1;
	const key = (s: ActivitySession): number | string | null => {
		switch (by) {
			case "duration":
				return s.seconds;
			case "pages":
				return pagesGained(s);
			case "percent":
				return percentGained(s);
			case "speed":
				return speedOf(s);
			case "title":
				return s.book.title.toLowerCase();
			case "target":
				return s.mode === "countdown" ? s.targetMinutes : null;
			default:
				return s.endedAt.getTime();
		}
	};
	return [...sessions].sort((a, b) => {
		const ka = key(a);
		const kb = key(b);
		// Sessions with nothing to compare always go last, whichever way it sorts.
		if (ka == null && kb == null)
			return b.endedAt.getTime() - a.endedAt.getTime();
		if (ka == null) return 1;
		if (kb == null) return -1;
		const diff =
			typeof ka === "string" && typeof kb === "string"
				? ka.localeCompare(kb)
				: (ka as number) - (kb as number);
		return diff * sign || b.endedAt.getTime() - a.endedAt.getTime();
	});
}

/* ----- numbers ----- */

export type ActivitySummary = {
	seconds: number;
	sessions: number;
	pagesGained: number;
	books: number;
	averageSeconds: number;
	longestSeconds: number;
	activeDays: number;
};

export function summarize(
	sessions: readonly ActivitySession[],
	timeZone?: string,
): ActivitySummary {
	const days = new Set<string>();
	const books = new Set<string>();
	let seconds = 0;
	let pages = 0;
	let longest = 0;
	for (const s of sessions) {
		seconds += s.seconds;
		pages += pagesGained(s) ?? 0;
		longest = Math.max(longest, s.seconds);
		books.add(s.book.id);
		days.add(dayOf(s, timeZone));
	}
	return {
		seconds,
		sessions: sessions.length,
		pagesGained: pages,
		books: books.size,
		averageSeconds: sessions.length ? Math.round(seconds / sessions.length) : 0,
		longestSeconds: longest,
		activeDays: days.size,
	};
}

/** Longest run of days with a session, and the run that ends today or yesterday. */
export function sessionStreaks(
	sessions: readonly ActivitySession[],
	today: string,
	timeZone?: string,
): { longest: number; current: number } {
	const days = [...new Set(sessions.map((s) => dayOf(s, timeZone)))].sort();
	if (days.length === 0) return { longest: 0, current: 0 };
	let longest = 1;
	let run = 1;
	for (let i = 1; i < days.length; i++) {
		run = days[i] === addDays(days[i - 1] as string, 1) ? run + 1 : 1;
		longest = Math.max(longest, run);
	}
	const last = days[days.length - 1] as string;
	const alive = last === today || last === addDays(today, -1);
	return { longest, current: alive ? run : 0 };
}

/** The five numbers shown when the section is closed: nothing in them names a book or a day. */
export function limitedNumbers(
	sessions: readonly ActivitySession[],
	today: string,
	timeZone?: string,
) {
	const s = summarize(sessions, timeZone);
	return {
		seconds: s.seconds,
		sessions: s.sessions,
		books: s.books,
		averageSeconds: s.averageSeconds,
		currentStreak: sessionStreaks(sessions, today, timeZone).current,
	};
}

/** The member's overall pages per hour, over every session that has one. */
export function usualSpeed(
	sessions: readonly ActivitySession[],
): number | null {
	let pages = 0;
	let seconds = 0;
	for (const s of sessions) {
		const p = pagesGained(s);
		if (p == null || s.seconds < MIN_SPEED_SECONDS) continue;
		pages += p;
		seconds += s.seconds;
	}
	return seconds > 0 ? (pages / seconds) * 3600 : null;
}

export type PersonalBests = {
	longestSession: { seconds: number; bookTitle: string; day: string } | null;
	/** Pages in one session (needs page data). */
	mostPagesSession: { pages: number; bookTitle: string; day: string } | null;
	bestDay: { day: string; seconds: number } | null;
	/** Pages in one day. */
	mostPagesDay: { day: string; pages: number } | null;
	mostSessionsDay: { day: string; sessions: number } | null;
	/** The week (Monday first) with the most reading. */
	bestWeek: { from: string; to: string; seconds: number } | null;
	bestMonth: { month: string; seconds: number } | null;
	/** The longest run of days in a row, with the days it covered. */
	longestStreak: { days: number; from: string; to: string } | null;
	fastestSpeed: { speed: number; bookTitle: string; day: string } | null;
	/** The book that took the most time. */
	topBook: { slug: string; title: string; seconds: number } | null;
};

/** The longest run of consecutive days with a session, and where it was. */
export function longestStreakRun(
	sessions: readonly ActivitySession[],
	timeZone?: string,
): { days: number; from: string; to: string } | null {
	const days = [...new Set(sessions.map((s) => dayOf(s, timeZone)))].sort();
	if (days.length === 0) return null;
	let best = { days: 1, from: days[0] as string, to: days[0] as string };
	let start = days[0] as string;
	let length = 1;
	for (let i = 1; i < days.length; i++) {
		const day = days[i] as string;
		if (day === addDays(days[i - 1] as string, 1)) {
			length += 1;
		} else {
			start = day;
			length = 1;
		}
		if (length > best.days) best = { days: length, from: start, to: day };
	}
	return best;
}

function maxOf<K>(totals: Map<K, number>): { key: K; value: number } | null {
	let best: { key: K; value: number } | null = null;
	for (const [key, value] of totals) {
		if (value > 0 && (!best || value > best.value)) best = { key, value };
	}
	return best;
}

export function personalBests(
	sessions: readonly ActivitySession[],
	_today: string,
	timeZone?: string,
): PersonalBests {
	let longest: PersonalBests["longestSession"] = null;
	let fastest: PersonalBests["fastestSpeed"] = null;
	let mostPages: PersonalBests["mostPagesSession"] = null;
	const secondsByDay = new Map<string, number>();
	const pagesByDay = new Map<string, number>();
	const sessionsByDay = new Map<string, number>();
	const secondsByWeek = new Map<string, number>();
	const secondsByMonth = new Map<string, number>();
	const secondsByBook = new Map<string, { title: string; seconds: number }>();

	for (const s of sessions) {
		const day = dayOf(s, timeZone);
		const pages = pagesGained(s);
		const add = <K>(map: Map<K, number>, key: K, amount: number) =>
			map.set(key, (map.get(key) ?? 0) + amount);
		add(secondsByDay, day, s.seconds);
		add(sessionsByDay, day, 1);
		add(secondsByWeek, weekStart(day), s.seconds);
		add(secondsByMonth, monthOf(day), s.seconds);
		if (pages != null) add(pagesByDay, day, pages);
		const book = secondsByBook.get(s.book.slug) ?? {
			title: s.book.title,
			seconds: 0,
		};
		book.seconds += s.seconds;
		secondsByBook.set(s.book.slug, book);

		if (!longest || s.seconds > longest.seconds) {
			longest = { seconds: s.seconds, bookTitle: s.book.title, day };
		}
		if (pages != null && pages > 0 && (!mostPages || pages > mostPages.pages)) {
			mostPages = { pages, bookTitle: s.book.title, day };
		}
		const speed = speedOf(s);
		if (speed != null && (!fastest || speed > fastest.speed)) {
			fastest = { speed, bookTitle: s.book.title, day };
		}
	}

	const bestDay = maxOf(secondsByDay);
	const bestPagesDay = maxOf(pagesByDay);
	const busiest = maxOf(sessionsByDay);
	const week = maxOf(secondsByWeek);
	const month = maxOf(secondsByMonth);
	let topBook: PersonalBests["topBook"] = null;
	for (const [slug, book] of secondsByBook) {
		if (!topBook || book.seconds > topBook.seconds) {
			topBook = { slug, title: book.title, seconds: book.seconds };
		}
	}

	return {
		longestSession: longest,
		mostPagesSession: mostPages,
		bestDay: bestDay ? { day: bestDay.key, seconds: bestDay.value } : null,
		mostPagesDay: bestPagesDay
			? { day: bestPagesDay.key, pages: bestPagesDay.value }
			: null,
		mostSessionsDay: busiest
			? { day: busiest.key, sessions: busiest.value }
			: null,
		bestWeek: week
			? { from: week.key, to: addDays(week.key, 6), seconds: week.value }
			: null,
		bestMonth: month ? { month: month.key, seconds: month.value } : null,
		longestStreak: longestStreakRun(sessions, timeZone),
		fastestSpeed: fastest,
		topBook,
	};
}

/** What happened on one day, for the calendar. */
export type DayActivity = {
	day: string;
	seconds: number;
	sessions: number;
	pages: number;
	/** The books read that day, most time first. */
	books: string[];
};

/** Every day with reading: time, sessions, pages and which books. */
export function dailyActivity(
	sessions: readonly ActivitySession[],
	timeZone?: string,
): DayActivity[] {
	const perDay = new Map<
		string,
		{
			seconds: number;
			sessions: number;
			pages: number;
			books: Map<string, number>;
		}
	>();
	for (const s of sessions) {
		const day = dayOf(s, timeZone);
		const entry = perDay.get(day) ?? {
			seconds: 0,
			sessions: 0,
			pages: 0,
			books: new Map<string, number>(),
		};
		entry.seconds += s.seconds;
		entry.sessions += 1;
		entry.pages += pagesGained(s) ?? 0;
		entry.books.set(
			s.book.title,
			(entry.books.get(s.book.title) ?? 0) + s.seconds,
		);
		perDay.set(day, entry);
	}
	return [...perDay.entries()]
		.map(([day, e]) => ({
			day,
			seconds: e.seconds,
			sessions: e.sessions,
			pages: e.pages,
			books: [...e.books.entries()]
				.sort((a, b) => b[1] - a[1])
				.map(([title]) => title),
		}))
		.sort((a, b) => a.day.localeCompare(b.day));
}

/** Minutes per day for the calendar, only days with reading. */
export function dailySeconds(
	sessions: readonly ActivitySession[],
	timeZone?: string,
): { day: string; seconds: number }[] {
	const perDay = new Map<string, number>();
	for (const s of sessions) {
		const day = dayOf(s, timeZone);
		perDay.set(day, (perDay.get(day) ?? 0) + s.seconds);
	}
	return [...perDay.entries()]
		.map(([day, seconds]) => ({ day, seconds }))
		.sort((a, b) => a.day.localeCompare(b.day));
}

export function timeByMode(sessions: readonly ActivitySession[]) {
	return ACTIVITY_MODES.map((mode) => {
		const own = sessions.filter((s) => s.mode === mode);
		const counted = own.map(targetMet).filter((v) => v != null);
		return {
			mode,
			seconds: own.reduce((sum, s) => sum + s.seconds, 0),
			sessions: own.length,
			/** Share of countdowns that ran to their target; only for countdowns. */
			targetRate:
				mode === "countdown" && counted.length > 0
					? counted.filter(Boolean).length / counted.length
					: null,
		};
	});
}

/** Pages per hour for each month, from the sessions that have page data. */
export function speedByMonth(
	sessions: readonly ActivitySession[],
	timeZone?: string,
): { month: string; speed: number }[] {
	const perMonth = new Map<string, { pages: number; seconds: number }>();
	for (const s of sessions) {
		const p = pagesGained(s);
		if (p == null || s.seconds < MIN_SPEED_SECONDS) continue;
		const month = monthOf(dayOf(s, timeZone));
		const entry = perMonth.get(month) ?? { pages: 0, seconds: 0 };
		entry.pages += p;
		entry.seconds += s.seconds;
		perMonth.set(month, entry);
	}
	return [...perMonth.entries()]
		.map(([month, v]) => ({ month, speed: (v.pages / v.seconds) * 3600 }))
		.sort((a, b) => a.month.localeCompare(b.month));
}

/** This period against the one before it; `null` for all time (nothing to compare with). */
export function comparePeriods(
	sessions: readonly ActivitySession[],
	range: { from: string; to: string } | null,
	timeZone?: string,
) {
	if (!range) return null;
	const before = previousActivityRange(range);
	const total = (r: { from: string; to: string }) =>
		summarize(
			sessions.filter((s) => {
				const day = dayOf(s, timeZone);
				return day >= r.from && day <= r.to;
			}),
			timeZone,
		);
	const current = total(range);
	const previous = total(before);
	return {
		range,
		previousRange: before,
		current: { seconds: current.seconds, sessions: current.sessions },
		previous: { seconds: previous.seconds, sessions: previous.sessions },
	};
}

/* ----- rankings ----- */

export type RankingRow = {
	/** What clicking the row filters by: a book slug, a day, a week start, a month, a weekday number or a day part. */
	key: string;
	label: string;
	seconds: number;
	sessions: number;
	pages: number;
	/** Share of the time in this ranking, 0 to 1. */
	share: number;
};

function rank(
	sessions: readonly ActivitySession[],
	keyOf: (s: ActivitySession) => string,
	labelOf: (s: ActivitySession, key: string) => string,
): RankingRow[] {
	const rows = new Map<string, Omit<RankingRow, "share">>();
	let total = 0;
	for (const s of sessions) {
		const key = keyOf(s);
		const row = rows.get(key) ?? {
			key,
			label: labelOf(s, key),
			seconds: 0,
			sessions: 0,
			pages: 0,
		};
		row.seconds += s.seconds;
		row.sessions += 1;
		row.pages += pagesGained(s) ?? 0;
		rows.set(key, row);
		total += s.seconds;
	}
	return [...rows.values()]
		.sort((a, b) => b.seconds - a.seconds || a.key.localeCompare(b.key))
		.map((row) => ({ ...row, share: total > 0 ? row.seconds / total : 0 }));
}

export type Rankings = {
	books: (RankingRow & { coverId: number | null })[];
	days: RankingRow[];
	weeks: RankingRow[];
	months: RankingRow[];
	weekdays: RankingRow[];
	/** Only for the member themselves. */
	dayParts: RankingRow[] | null;
};

export function rankings(
	sessions: readonly ActivitySession[],
	scope: ActivityScope,
	timeZone?: string,
): Rankings {
	const tz = timeZone ?? resolveClubTimeZone();
	const covers = new Map(sessions.map((s) => [s.book.slug, s.book.coverId]));
	return {
		books: rank(
			sessions,
			(s) => s.book.slug,
			(s) => s.book.title,
		).map((row) => ({ ...row, coverId: covers.get(row.key) ?? null })),
		days: rank(
			sessions,
			(s) => dayOf(s, tz),
			(_s, key) => key,
		),
		weeks: rank(
			sessions,
			(s) => weekStart(dayOf(s, tz)),
			(_s, key) => key,
		),
		months: rank(
			sessions,
			(s) => monthOf(dayOf(s, tz)),
			(_s, key) => key,
		),
		weekdays: rank(
			sessions,
			(s) => String(weekdayOf(dayOf(s, tz))),
			(_s, key) => WEEKDAY_LABELS[Number(key)] ?? key,
		),
		dayParts: scope.clock
			? rank(
					sessions,
					(s) => dayPartOf(s.endedAt, tz),
					(_s, key) => DAY_PART_LABELS[key as DayPart] ?? key,
				)
			: null,
	};
}

/** Everything a filter bar needs to offer, taken from the member's own sessions. */
export function facets(sessions: readonly ActivitySession[]) {
	const books = new Map<string, string>();
	const authors = new Map<string, string>();
	const formats = new Set<ActivityFormat>();
	let maxMinutes = 0;
	let maxPages = 0;
	let maxSpeed = 0;
	let first: Date | null = null;
	for (const s of sessions) {
		books.set(s.book.slug, s.book.title);
		for (const a of s.book.authors) authors.set(a.slug, a.name);
		if (s.format) formats.add(s.format);
		maxMinutes = Math.max(maxMinutes, Math.ceil(s.seconds / 60));
		maxPages = Math.max(maxPages, pagesGained(s) ?? 0);
		maxSpeed = Math.max(maxSpeed, Math.ceil(speedOf(s) ?? 0));
		if (!first || s.endedAt < first) first = s.endedAt;
	}
	const byName = (a: { name: string }, b: { name: string }) =>
		a.name.localeCompare(b.name);
	return {
		books: [...books.entries()]
			.map(([slug, name]) => ({ slug, name }))
			.sort(byName),
		authors: [...authors.entries()]
			.map(([slug, name]) => ({ slug, name }))
			.sort(byName),
		formats: ACTIVITY_FORMATS.filter((f) => formats.has(f)),
		maxMinutes,
		maxPages,
		maxSpeed,
		firstDay: first ? clubDayKey(first) : null,
	};
}

/** "1 h 05 min", "42 min", "30 s": for totals. */
export function formatActivityDuration(seconds: number): string {
	const s = Math.max(0, Math.round(seconds));
	if (s < 60) return `${s} s`;
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	if (h === 0) return `${m} min`;
	return `${h} h ${String(m).padStart(2, "0")} min`;
}

/** "25:04": for one session. */
export function formatSessionClock(seconds: number): string {
	const s = Math.max(0, Math.round(seconds));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const rest = s % 60;
	const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
	const ss = String(rest).padStart(2, "0");
	return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** One session, as the picture a member shares shows it. */
export type SessionLike = Pick<
	ActivitySession,
	| "seconds"
	| "mode"
	| "targetMinutes"
	| "pageFrom"
	| "pageTo"
	| "percentFrom"
	| "percentTo"
>;

export type SessionShareFacts = {
	/** "25:04" */
	clock: string;
	/** "25 min" */
	duration: string;
	/** "Countdown, 25 min" */
	method: string;
	targetMet: boolean | null;
	/** Pages gained, when the book has pages. */
	pages: number | null;
	pageFrom: number | null;
	pageTo: number | null;
	percentFrom: number;
	percentTo: number;
	percentGained: number;
	finished: boolean;
	/** Pages per hour. */
	speed: number | null;
};

/** Everything a shared session picture says, worked out the same way the Reading page does. */
export function sessionShareFacts(s: SessionLike): SessionShareFacts {
	const percentTo = Math.max(s.percentFrom, s.percentTo ?? s.percentFrom);
	const base = ACTIVITY_MODE_LABELS[s.mode];
	return {
		clock: formatSessionClock(s.seconds),
		duration: formatActivityDuration(s.seconds),
		method:
			s.mode === "countdown" && s.targetMinutes
				? `${base}, ${s.targetMinutes} min`
				: base,
		targetMet: targetMet(s),
		pages: pagesGained(s),
		pageFrom: s.pageFrom,
		pageTo: s.pageTo,
		percentFrom: s.percentFrom,
		percentTo,
		percentGained: percentTo - s.percentFrom,
		finished: percentTo >= 100,
		speed: speedOf(s),
	};
}
