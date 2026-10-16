import { describe, expect, it } from "bun:test";
import {
	readFinishedMonthFromClubNow,
	readFinishedMonthInClubMonth,
	readFinishedMonthInClubYear,
	readFinishedMonthSortKey,
} from "./read-finished-month";

describe("readFinishedMonthSortKey", () => {
	it("returns YYYYMM for dated reads", () => {
		expect(readFinishedMonthSortKey(2026, 3)).toBe(202_603);
	});

	it("returns null when incomplete", () => {
		expect(readFinishedMonthSortKey(2026, null)).toBeNull();
		expect(readFinishedMonthSortKey(null, 3)).toBeNull();
	});
});

describe("readFinishedMonthFromClubNow", () => {
	it("uses club timezone parts", () => {
		const ref = new Date("2026-03-15T12:00:00.000Z");
		expect(readFinishedMonthFromClubNow(ref, "Asia/Baku")).toEqual({
			year: 2026,
			month: 3,
		});
	});
});

describe("readFinishedMonthInClubMonth", () => {
	it("matches same calendar month in club TZ", () => {
		const ref = new Date("2026-03-20T10:00:00.000Z");
		expect(
			readFinishedMonthInClubMonth({ year: 2026, month: 3 }, ref, "Asia/Baku"),
		).toBe(true);
		expect(
			readFinishedMonthInClubMonth({ year: 2026, month: 2 }, ref, "Asia/Baku"),
		).toBe(false);
	});
});

describe("readFinishedMonthInClubYear", () => {
	it("matches calendar year", () => {
		expect(readFinishedMonthInClubYear({ year: 2026, month: 1 }, 2026)).toBe(
			true,
		);
		expect(readFinishedMonthInClubYear({ year: 2025, month: 12 }, 2026)).toBe(
			false,
		);
	});
});
