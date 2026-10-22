import { describe, expect, test } from "bun:test";
import { zonedTimeToUtc } from "./club-timezone";
import {
	calculateSittingReadingDeadline,
	formatReadingEstimate,
	planReading,
} from "./reading-deadline";

const TZ = "UTC";
// 2026-10-26 is a Monday.
const monday = zonedTimeToUtc(2026, 10, 26, 14, 0, TZ);
const saturday = zonedTimeToUtc(2026, 10, 24, 14, 0, TZ);

describe("planReading", () => {
	test("weekdays count 25 pages", () => {
		const plan = planReading(100, monday, TZ);
		expect(plan.calendarDays).toBe(4);
		expect(plan.elapsedDays).toBe(4);
		expect(plan.weekendDays).toBe(0);
	});

	test("weekends count 30 pages and are detected from the start day", () => {
		const plan = planReading(60, saturday, TZ);
		expect(plan.calendarDays).toBe(2);
		expect(plan.weekendDays).toBe(2);
		expect(plan.endDay).toEqual({ year: 2026, month: 10, day: 25 });
	});

	test("a Monday start crosses the first weekend", () => {
		// Mon-Fri = 125 pages, Sat = 30, Sun = 30 -> 185 by Sunday, 5 more on Monday.
		const plan = planReading(190, monday, TZ);
		expect(plan.calendarDays).toBe(8);
		expect(plan.weekendDays).toBe(2);
		expect(plan.elapsedDays).toBeCloseTo(7 + 5 / 25);
	});

	test("the last day only counts for the pages left on it", () => {
		const plan = planReading(110, monday, TZ);
		expect(plan.calendarDays).toBe(5);
		expect(plan.elapsedDays).toBeCloseTo(4 + 10 / 25);
	});

	test("rejects an empty book", () => {
		expect(() => planReading(0, monday, TZ)).toThrow();
	});
});

describe("calculateSittingReadingDeadline", () => {
	test("returns the end day", () => {
		const deadline = calculateSittingReadingDeadline(100, monday, TZ);
		expect(deadline.toISOString().slice(0, 10)).toBe("2026-10-29");
	});
});

describe("formatReadingEstimate", () => {
	test("writes days and hours with a leading tilde", () => {
		expect(formatReadingEstimate(12 + 8 / 24)).toBe(
			"~12 days 8 hours reading time",
		);
	});

	test("drops empty parts and uses singulars", () => {
		expect(formatReadingEstimate(1)).toBe("~1 day reading time");
		expect(formatReadingEstimate(0 + 1 / 24)).toBe("~1 hour reading time");
		expect(formatReadingEstimate(3)).toBe("~3 days reading time");
	});
});
