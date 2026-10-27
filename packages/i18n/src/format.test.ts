import { describe, expect, test } from "bun:test";
import {
	formatCompactNumber,
	formatDate,
	formatDateTime,
	formatDateTimeCompact,
	formatDecimal,
	formatList,
	formatMonthYear,
	formatNumber,
	formatPercent,
	formatRating,
	formatRelativeTime,
} from "./format";

const date = new Date(Date.UTC(2026, 9, 27, 11, 18));
const now = new Date(Date.UTC(2026, 9, 27, 12, 0));

describe("numbers", () => {
	test("ratings use the language's decimal mark and drop a trailing .0", () => {
		expect(formatRating("en", 4.5)).toBe("4.5");
		expect(formatRating("az", 4.5)).toBe("4,5");
		expect(formatRating("en", 4)).toBe("4");
		expect(formatRating("az", 3)).toBe("3");
		expect(formatRating("az", 0)).toBe("0");
	});

	test("grouping, decimals, percent and compact follow the language", () => {
		expect(formatNumber("en", 1234567.5)).toBe("1,234,567.5");
		expect(formatNumber("az", 1234567.5)).toBe("1.234.567,5");
		expect(formatDecimal("az", 4.5, 2)).toBe("4,50");
		expect(formatPercent("en", 0.42)).toBe("42%");
		expect(formatCompactNumber("en", 12345)).toBe("12K");
	});

	test("az output is not the English one (the runtime has the az data)", () => {
		expect(formatNumber("az", 1234.5)).not.toBe(formatNumber("en", 1234.5));
	});
});

describe("dates", () => {
	test("dates and times are written in the language", () => {
		expect(formatDate("en", date, "medium", { timeZone: "UTC" })).toBe(
			"Oct 27, 2026",
		);
		expect(formatDate("az", date, "medium", { timeZone: "UTC" })).toBe(
			"27 okt 2026",
		);
		expect(formatDateTime("az", date, { timeZone: "UTC" })).toBe(
			"27 okt 2026, 11:18",
		);
		expect(formatDateTimeCompact("en", date, { timeZone: "UTC" })).toContain(
			"Oct 27",
		);
		expect(formatMonthYear("az", { year: 2026, month: 10 })).toBe("okt 2026");
		expect(formatMonthYear("en", { year: 2026, month: 10 }, "long")).toBe(
			"October 2026",
		);
	});

	test("an invalid date is a dash", () => {
		expect(formatDate("en", "nope")).toBe("—");
		expect(formatRelativeTime("az", Number.NaN)).toBe("—");
	});
});

describe("relative time and lists", () => {
	test("relative time reads naturally in both languages", () => {
		const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
		expect(formatRelativeTime("en", threeDaysAgo, now)).toBe("3 days ago");
		expect(formatRelativeTime("az", threeDaysAgo, now)).toBe("3 gün öncə");
		const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
		expect(formatRelativeTime("en", inTwoHours, now)).toBe("in 2 hours");
		expect(formatRelativeTime("az", inTwoHours, now)).toBe("2 saat ərzində");
		expect(formatRelativeTime("az", now, now)).toBe("indi");
	});

	test("lists use the language's 'and'", () => {
		expect(formatList("en", ["a", "b", "c"])).toBe("a, b, and c");
		expect(formatList("az", ["a", "b", "c"])).toBe("a, b və c");
	});
});
