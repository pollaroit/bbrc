import { describe, expect, test } from "bun:test";
import { formatPaceAmount, readingPace } from "./reading-pace";
import { readingStats } from "./reading-stats";

const DAY = 86_400_000;
const now = new Date("2026-10-25T12:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * DAY);
const ahead = (days: number) => new Date(now.getTime() + days * DAY);

describe("readingPace", () => {
	test("done when nothing remains", () => {
		const result = readingPace({
			percent: 100,
			totalPages: 300,
			currentPage: 300,
			startedAt: ago(5),
			logs: [],
			deadline: ahead(3),
			now,
		});
		expect(result.status).toBe("done");
	});

	test("no data before any progress", () => {
		const result = readingPace({
			percent: 0,
			totalPages: 300,
			currentPage: 0,
			startedAt: ago(0),
			logs: [],
			deadline: ahead(10),
			now,
		});
		expect(result.status).toBe("no_data");
		expect(result.perDayNeeded).toBe(30);
	});

	test("ahead of the deadline", () => {
		const result = readingPace({
			percent: 50,
			totalPages: 300,
			currentPage: 150,
			startedAt: ago(3),
			logs: [
				{ at: ago(3), percent: 0, page: 0 },
				{ at: ago(1), percent: 33, page: 100 },
			],
			deadline: ahead(10),
			now,
		});
		expect(result.status).toBe("ahead");
		expect(result.unit).toBe("pages");
		expect(result.daysEarly).toBeGreaterThanOrEqual(1);
	});

	test("behind the deadline", () => {
		const result = readingPace({
			percent: 10,
			totalPages: 400,
			currentPage: 40,
			startedAt: ago(6),
			logs: [{ at: ago(6), percent: 0, page: 0 }],
			deadline: ahead(4),
			now,
		});
		expect(result.status).toBe("behind");
		expect(result.perDayNeeded).toBe(90);
	});

	test("percent only when pages are unknown", () => {
		const result = readingPace({
			percent: 40,
			totalPages: null,
			currentPage: null,
			startedAt: ago(4),
			logs: [],
			deadline: ahead(6),
			now,
		});
		expect(result.unit).toBe("percent");
		expect(result.remaining).toBe(60);
		expect(result.perDayNeeded).toBe(10);
	});

	test("past the deadline", () => {
		const result = readingPace({
			percent: 40,
			totalPages: null,
			currentPage: null,
			startedAt: ago(4),
			logs: [],
			deadline: ago(1),
			now,
		});
		expect(result.status).toBe("past_deadline");
	});

	test("no deadline still projects", () => {
		const result = readingPace({
			percent: 40,
			totalPages: null,
			currentPage: null,
			startedAt: ago(4),
			logs: [],
			deadline: null,
			now,
		});
		expect(result.status).toBe("no_deadline");
		expect(result.projectedFinish).not.toBeNull();
	});
});

test("formatPaceAmount", () => {
	expect(formatPaceAmount(22.2, "pages")).toBe("23 pages");
	expect(formatPaceAmount(1, "pages")).toBe("1 page");
	expect(formatPaceAmount(7.1, "percent")).toBe("8%");
});

describe("readingStats", () => {
	test("empty", () => {
		const stats = readingStats({
			finished: [],
			logTimes: [],
			now,
			timeZone: "UTC",
		});
		expect(stats.finishedCount).toBe(0);
		expect(stats.averageDaysToFinish).toBeNull();
		expect(stats.currentStreak).toBe(0);
	});

	test("averages and per month", () => {
		const stats = readingStats({
			finished: [
				{ startedAt: ago(10), finishedAt: ago(5), totalPages: 250 },
				{ startedAt: ago(40), finishedAt: ago(30), totalPages: 100 },
			],
			logTimes: [],
			now,
			timeZone: "UTC",
		});
		expect(stats.finishedCount).toBe(2);
		expect(stats.averageDaysToFinish).toBe(7.5);
		expect(stats.pagesPerDay).toBe(23.3);
		expect(stats.perMonth.map((entry) => entry.month)).toEqual([
			"2026-09",
			"2026-10",
		]);
	});

	test("streaks", () => {
		const stats = readingStats({
			finished: [],
			logTimes: [ago(0), ago(1), ago(2), ago(9), ago(10), ago(0)],
			now,
			timeZone: "UTC",
		});
		expect(stats.longestStreak).toBe(3);
		expect(stats.currentStreak).toBe(3);
	});

	test("a broken streak is zero", () => {
		const stats = readingStats({
			finished: [],
			logTimes: [ago(5), ago(4)],
			now,
			timeZone: "UTC",
		});
		expect(stats.longestStreak).toBe(2);
		expect(stats.currentStreak).toBe(0);
	});
});
