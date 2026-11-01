import { describe, expect, test } from "bun:test";
import {
	type ActivitySession,
	addDays,
	comparePeriods,
	dailyActivity,
	dayPartOf,
	FULL_SCOPE,
	facets,
	filterSessions,
	formatActivityDuration,
	formatSessionClock,
	hasSessionOnlyFilters,
	limitedNumbers,
	limitFilters,
	longestStreakRun,
	pagesGained,
	personalBests,
	presetRange,
	previousActivityRange,
	rankings,
	sessionShareFacts,
	sessionStreaks,
	sortSessions,
	speedOf,
	summarize,
	targetMet,
	timeByMode,
	usualSpeed,
	weekStart,
} from "./reading-activity";

const TZ = "Asia/Baku"; // UTC+4, no daylight saving

/** A session that ended at `iso` (UTC) after `minutes` of reading. */
function session(
	id: string,
	iso: string,
	minutes: number,
	over: Partial<ActivitySession> = {},
): ActivitySession {
	const endedAt = new Date(iso);
	return {
		id,
		startedAt: new Date(endedAt.getTime() - minutes * 60_000),
		endedAt,
		seconds: minutes * 60,
		mode: "free",
		targetMinutes: null,
		pageFrom: 10,
		pageTo: 30,
		percentFrom: 5,
		percentTo: 10,
		format: "paperback",
		book: {
			id: "b1",
			slug: "dune",
			title: "Dune",
			coverId: 1,
			authors: [{ slug: "frank-herbert", name: "Frank Herbert" }],
		},
		...over,
	};
}

const other = {
	id: "b2",
	slug: "emma",
	title: "Emma",
	coverId: null,
	authors: [{ slug: "jane-austen", name: "Jane Austen" }],
};

describe("what a session is worth", () => {
	test("pages gained and speed", () => {
		const s = session("a", "2026-11-02T10:00:00Z", 30); // 20 pages in 30 min
		expect(pagesGained(s)).toBe(20);
		expect(speedOf(s)).toBeCloseTo(40, 5);
	});

	test("no page data means no pages and no speed", () => {
		const s = session("a", "2026-11-02T10:00:00Z", 30, {
			pageFrom: null,
			pageTo: null,
		});
		expect(pagesGained(s)).toBeNull();
		expect(speedOf(s)).toBeNull();
	});

	test("a session under a minute has no speed", () => {
		const s = session("a", "2026-11-02T10:00:00Z", 0.5);
		expect(speedOf(s)).toBeNull();
	});

	test("going back a page never gives negative pages", () => {
		const s = session("a", "2026-11-02T10:00:00Z", 10, {
			pageFrom: 50,
			pageTo: 40,
		});
		expect(pagesGained(s)).toBe(0);
	});

	test("only a countdown can hit its target", () => {
		const met = session("a", "2026-11-02T10:00:00Z", 25, {
			mode: "countdown",
			targetMinutes: 25,
		});
		const short = session("b", "2026-11-02T10:00:00Z", 10, {
			mode: "countdown",
			targetMinutes: 25,
		});
		expect(targetMet(met)).toBe(true);
		expect(targetMet(short)).toBe(false);
		expect(targetMet(session("c", "2026-11-02T10:00:00Z", 10))).toBeNull();
	});
});

describe("club days", () => {
	test("a session just after midnight in the club belongs to the next day", () => {
		// 20:30 UTC is 00:30 the next day in UTC+4
		const s = session("a", "2026-11-02T20:30:00Z", 10);
		const [kept] = filterSessions(
			[s],
			{ from: "2026-11-03", to: "2026-11-03" },
			TZ,
		);
		expect(kept?.id).toBe("a");
	});

	test("weeks start on Monday", () => {
		expect(weekStart("2026-11-01")).toBe("2026-10-26"); // a Sunday
		expect(weekStart("2026-11-02")).toBe("2026-11-02"); // a Monday
	});

	test("day parts follow the club clock", () => {
		expect(dayPartOf(new Date("2026-11-02T04:00:00Z"), TZ)).toBe("morning"); // 08:00
		expect(dayPartOf(new Date("2026-11-02T10:00:00Z"), TZ)).toBe("afternoon"); // 14:00
		expect(dayPartOf(new Date("2026-11-02T15:00:00Z"), TZ)).toBe("evening"); // 19:00
		expect(dayPartOf(new Date("2026-11-02T21:00:00Z"), TZ)).toBe("night"); // 01:00
	});
});

describe("filters", () => {
	const sessions = [
		session("a", "2026-11-02T10:00:00Z", 30),
		session("b", "2026-11-03T10:00:00Z", 10, {
			book: other,
			mode: "pomodoro",
			format: "audiobook",
			pageFrom: null,
			pageTo: null,
			percentTo: 100,
		}),
		session("c", "2026-11-04T10:00:00Z", 50, {
			mode: "countdown",
			targetMinutes: 60,
		}),
	];
	const ids = (f: Parameters<typeof filterSessions>[1]) =>
		filterSessions(sessions, f, TZ).map((s) => s.id);

	test("by book, author, method and format", () => {
		expect(ids({ books: ["emma"] })).toEqual(["b"]);
		expect(ids({ authors: ["frank-herbert"] })).toEqual(["a", "c"]);
		expect(ids({ modes: ["pomodoro"] })).toEqual(["b"]);
		expect(ids({ formats: ["audiobook"] })).toEqual(["b"]);
	});

	test("by minutes", () => {
		expect(ids({ minMinutes: 20 })).toEqual(["a", "c"]);
		expect(ids({ maxMinutes: 30 })).toEqual(["a", "b"]);
	});

	test("a pages filter leaves out sessions without page data", () => {
		expect(ids({ minPages: 1 })).toEqual(["a", "c"]);
	});

	test("finished the book, and countdown target", () => {
		expect(ids({ finished: true })).toEqual(["b"]);
		expect(ids({ targetMet: false })).toEqual(["c"]);
	});

	test("by date range, weekday and time of day", () => {
		expect(ids({ from: "2026-11-03", to: "2026-11-03" })).toEqual(["b"]);
		expect(ids({ weekdays: [0] })).toEqual(["a"]); // Monday 2 Nov
		expect(ids({ dayParts: ["afternoon"] })).toEqual(["a", "b", "c"]);
	});

	test("a viewer without progress cannot filter by pages, percent or speed", () => {
		const limited = limitFilters(
			{ minPages: 5, maxPercent: 50, minSpeed: 10, books: ["dune"] },
			{ progress: false, clock: false, finish: false },
		);
		expect(limited).toEqual({
			minPages: undefined,
			maxPages: undefined,
			minPercent: undefined,
			maxPercent: undefined,
			minSpeed: undefined,
			maxSpeed: undefined,
			books: ["dune"],
			dayParts: undefined,
			finished: undefined,
		});
	});

	test("only the owner can filter by time of day or by finishing", () => {
		const limited = limitFilters(
			{ dayParts: ["night"], finished: true },
			{ progress: true, clock: false, finish: false },
		);
		expect(limited.dayParts).toBeUndefined();
		expect(limited.finished).toBeUndefined();
		expect(limitFilters({ dayParts: ["night"] }, FULL_SCOPE).dayParts).toEqual([
			"night",
		]);
	});

	test("which filters make the finished-book numbers meaningless", () => {
		expect(hasSessionOnlyFilters({ books: ["dune"], from: "2026-01-01" })).toBe(
			false,
		);
		expect(hasSessionOnlyFilters({ modes: ["free"] })).toBe(true);
		expect(hasSessionOnlyFilters({ minMinutes: 5 })).toBe(true);
	});
});

describe("sorting", () => {
	const sessions = [
		session("a", "2026-11-02T10:00:00Z", 30),
		session("b", "2026-11-03T10:00:00Z", 10, {
			pageFrom: null,
			pageTo: null,
			book: other,
		}),
		session("c", "2026-11-04T10:00:00Z", 50, {
			mode: "countdown",
			targetMinutes: 60,
			pageFrom: 0,
			pageTo: 100,
		}),
	];
	const ids = (by: Parameters<typeof sortSessions>[1], dir: "asc" | "desc") =>
		sortSessions(sessions, by, dir).map((s) => s.id);

	test("by date and duration", () => {
		expect(ids("date", "desc")).toEqual(["c", "b", "a"]);
		expect(ids("date", "asc")).toEqual(["a", "b", "c"]);
		expect(ids("duration", "desc")).toEqual(["c", "a", "b"]);
	});

	test("sessions with nothing to compare go last either way", () => {
		expect(ids("pages", "desc")).toEqual(["c", "a", "b"]);
		expect(ids("pages", "asc")).toEqual(["a", "c", "b"]);
		expect(ids("target", "desc")).toEqual(["c", "b", "a"]);
	});

	test("by title", () => {
		// Dune before Emma, and the newer Dune session first
		expect(ids("title", "asc")).toEqual(["c", "a", "b"]);
	});
});

describe("numbers", () => {
	const sessions = [
		session("a", "2026-11-02T10:00:00Z", 30),
		session("b", "2026-11-03T10:00:00Z", 10, { book: other }),
		session("c", "2026-11-03T14:00:00Z", 20),
	];

	test("summary", () => {
		const s = summarize(sessions, TZ);
		expect(s.seconds).toBe(3600);
		expect(s.sessions).toBe(3);
		expect(s.books).toBe(2);
		expect(s.activeDays).toBe(2);
		expect(s.averageSeconds).toBe(1200);
		expect(s.longestSeconds).toBe(1800);
		expect(s.pagesGained).toBe(60);
	});

	test("streaks: current only when it reaches today or yesterday", () => {
		expect(sessionStreaks(sessions, "2026-11-04", TZ)).toEqual({
			longest: 2,
			current: 2,
		});
		expect(sessionStreaks(sessions, "2026-11-10", TZ)).toEqual({
			longest: 2,
			current: 0,
		});
		expect(sessionStreaks([], "2026-11-04", TZ)).toEqual({
			longest: 0,
			current: 0,
		});
	});

	test("personal bests", () => {
		const bests = personalBests(sessions, "2026-11-04", TZ);
		expect(bests.longestSession?.seconds).toBe(1800);
		// both days read 30 minutes: a tie goes to the earlier day
		expect(bests.bestDay).toEqual({ day: "2026-11-02", seconds: 1800 });
		expect(bests.fastestSpeed?.speed).toBeCloseTo(120, 5); // 20 pages in 10 min
	});

	test("more personal bests: pages, busiest day, week, month, streak and top book", () => {
		const bests = personalBests(sessions, "2026-11-04", TZ);
		// every session gained 20 pages; the 3 Nov pair gained 40 in one day
		expect(bests.mostPagesSession?.pages).toBe(20);
		expect(bests.mostPagesDay).toEqual({ day: "2026-11-03", pages: 40 });
		expect(bests.mostSessionsDay).toEqual({ day: "2026-11-03", sessions: 2 });
		// 2 Nov is a Monday, so all three sessions fall in one week and one month
		expect(bests.bestWeek).toEqual({
			from: "2026-11-02",
			to: "2026-11-08",
			seconds: 3600,
		});
		expect(bests.bestMonth).toEqual({ month: "2026-11", seconds: 3600 });
		expect(bests.longestStreak).toEqual({
			days: 2,
			from: "2026-11-02",
			to: "2026-11-03",
		});
		// Dune took 50 minutes, Emma 10
		expect(bests.topBook).toEqual({
			slug: "dune",
			title: "Dune",
			seconds: 3000,
		});
	});

	test("bests are empty with no sessions", () => {
		const bests = personalBests([], "2026-11-04", TZ);
		expect(bests.longestSession).toBeNull();
		expect(bests.bestWeek).toBeNull();
		expect(bests.longestStreak).toBeNull();
		expect(bests.topBook).toBeNull();
	});

	test("the longest streak remembers where it was", () => {
		const run = longestStreakRun(
			[
				session("a", "2026-10-01T10:00:00Z", 5),
				session("b", "2026-10-05T10:00:00Z", 5),
				session("c", "2026-10-06T10:00:00Z", 5),
				session("d", "2026-10-07T10:00:00Z", 5),
				session("e", "2026-10-20T10:00:00Z", 5),
			],
			TZ,
		);
		expect(run).toEqual({ days: 3, from: "2026-10-05", to: "2026-10-07" });
	});

	test("day by day: time, sessions, pages and the books, longest first", () => {
		const days = dailyActivity(sessions, TZ);
		expect(days.map((d) => d.day)).toEqual(["2026-11-02", "2026-11-03"]);
		expect(days[1]).toEqual({
			day: "2026-11-03",
			seconds: 1800,
			sessions: 2,
			pages: 40,
			books: ["Dune", "Emma"],
		});
	});

	test("usual speed weighs every session by its time", () => {
		expect(usualSpeed(sessions)).toBeCloseTo(60, 5); // 60 pages in 60 min
		expect(usualSpeed([])).toBeNull();
	});

	test("the closed-state numbers carry no names or dates", () => {
		const numbers = limitedNumbers(sessions, "2026-11-04", TZ);
		expect(Object.keys(numbers).sort()).toEqual([
			"averageSeconds",
			"books",
			"currentStreak",
			"seconds",
			"sessions",
		]);
		expect(numbers.books).toBe(2);
	});

	test("time by method and countdown success", () => {
		const modes = timeByMode([
			session("a", "2026-11-02T10:00:00Z", 25, {
				mode: "countdown",
				targetMinutes: 25,
			}),
			session("b", "2026-11-02T11:00:00Z", 5, {
				mode: "countdown",
				targetMinutes: 25,
			}),
			session("c", "2026-11-02T12:00:00Z", 10),
		]);
		const countdown = modes.find((m) => m.mode === "countdown");
		expect(countdown?.targetRate).toBe(0.5);
		expect(modes.find((m) => m.mode === "free")?.targetRate).toBeNull();
		expect(modes.find((m) => m.mode === "pomodoro")?.seconds).toBe(0);
	});
});

describe("periods", () => {
	test("presets in the club's days", () => {
		expect(presetRange("all", "2026-11-04")).toBeNull();
		expect(presetRange("week", "2026-11-04")).toEqual({
			from: "2026-11-02",
			to: "2026-11-04",
		});
		expect(presetRange("month", "2026-11-04")).toEqual({
			from: "2026-11-01",
			to: "2026-11-04",
		});
		expect(presetRange("year", "2026-11-04")).toEqual({
			from: "2026-01-01",
			to: "2026-11-04",
		});
	});

	test("the previous range is the same number of days straight before", () => {
		expect(
			previousActivityRange({ from: "2026-11-02", to: "2026-11-04" }),
		).toEqual({
			from: "2026-10-30",
			to: "2026-11-01",
		});
		expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
	});

	test("comparison needs a range", () => {
		expect(comparePeriods([], null, TZ)).toBeNull();
		const result = comparePeriods(
			[
				session("a", "2026-11-03T10:00:00Z", 30),
				session("b", "2026-10-31T10:00:00Z", 10),
			],
			{ from: "2026-11-02", to: "2026-11-04" },
			TZ,
		);
		expect(result?.current.seconds).toBe(1800);
		expect(result?.previous.seconds).toBe(600);
	});
});

describe("rankings", () => {
	const sessions = [
		session("a", "2026-11-02T10:00:00Z", 30),
		session("b", "2026-11-03T10:00:00Z", 10, { book: other }),
		session("c", "2026-11-03T14:00:00Z", 20),
	];

	test("books, days, weekdays with shares", () => {
		const r = rankings(sessions, FULL_SCOPE, TZ);
		expect(r.books.map((b) => b.key)).toEqual(["dune", "emma"]);
		expect(r.books[0]?.share).toBeCloseTo(50 / 60, 5);
		expect(r.days.map((d) => d.key)).toEqual(["2026-11-02", "2026-11-03"]);
		expect(r.weekdays[0]?.label).toBe("Monday");
		expect(r.weeks).toHaveLength(1);
		expect(r.months[0]?.key).toBe("2026-11");
	});

	test("time of day is only for the owner", () => {
		expect(rankings(sessions, FULL_SCOPE, TZ).dayParts).not.toBeNull();
		expect(
			rankings(sessions, { progress: true, clock: false, finish: true }, TZ)
				.dayParts,
		).toBeNull();
	});

	test("facets list what the filters can offer", () => {
		const f = facets(sessions);
		expect(f.books.map((b) => b.slug)).toEqual(["dune", "emma"]);
		expect(f.maxMinutes).toBe(30);
		expect(f.formats).toEqual(["paperback"]);
	});
});

describe("formatting", () => {
	test("totals and single sessions", () => {
		expect(formatActivityDuration(30)).toBe("30 s");
		expect(formatActivityDuration(42 * 60)).toBe("42 min");
		expect(formatActivityDuration(3900)).toBe("1 h 05 min");
		expect(formatSessionClock(1504)).toBe("25:04");
		expect(formatSessionClock(3725)).toBe("1:02:05");
	});
});

describe("what a shared session says", () => {
	test("a page-tracked countdown that reached its target", () => {
		const facts = sessionShareFacts({
			seconds: 25 * 60 + 4,
			mode: "countdown",
			targetMinutes: 25,
			pageFrom: 10,
			pageTo: 40,
			percentFrom: 5,
			percentTo: 40,
		});
		expect(facts.clock).toBe("25:04");
		expect(facts.duration).toBe("25 min");
		expect(facts.method).toBe("Countdown, 25 min");
		expect(facts.targetMet).toBe(true);
		expect(facts.pages).toBe(30);
		expect(facts.percentGained).toBe(35);
		expect(facts.finished).toBe(false);
		expect(facts.speed).toBeCloseTo((30 / (25 * 60 + 4)) * 3600, 5);
	});

	test("an audiobook or percent-only book has no pages and no speed", () => {
		const facts = sessionShareFacts({
			seconds: 40 * 60,
			mode: "free",
			targetMinutes: null,
			pageFrom: null,
			pageTo: null,
			percentFrom: 90,
			percentTo: 100,
		});
		expect(facts.pages).toBeNull();
		expect(facts.speed).toBeNull();
		expect(facts.method).toBe("Stopwatch");
		expect(facts.targetMet).toBeNull();
		expect(facts.finished).toBe(true);
	});

	test("a missing end never goes backwards", () => {
		const facts = sessionShareFacts({
			seconds: 600,
			mode: "pomodoro",
			targetMinutes: null,
			pageFrom: null,
			pageTo: null,
			percentFrom: 20,
			percentTo: null,
		});
		expect(facts.percentTo).toBe(20);
		expect(facts.percentGained).toBe(0);
	});
});
