import { describe, expect, it } from "bun:test";
import { computeReadingPace, subjectBreakdown } from "./compute";
import {
	parseUserStatsPeriod,
	readCountsForPeriod,
	resolveUserStatsPeriodBounds,
} from "./period";
import { canonicalSubjectKey } from "./subjects";

describe("user stats subjects", () => {
	it("groups Open Library fiction variants", () => {
		expect(canonicalSubjectKey("Fiction, general")).toBe("fiction");
		expect(canonicalSubjectKey("Ficción")).toBe("fiction");
		expect(canonicalSubjectKey("Fantasy fiction")).toBe("fantasy");
	});

	it("aggregates breakdown by canonical subject", () => {
		const rows = subjectBreakdown([
			["Fiction", "Fiction, general"],
			["Ficción"],
			["Fantasy", "Fantasy fiction"],
		]);
		expect(rows[0]?.subject).toBe("Fiction");
		expect(rows[0]?.count).toBe(2);
		expect(rows[1]?.subject).toBe("Fantasy");
		expect(rows[1]?.count).toBe(1);
	});
});

describe("user stats period none", () => {
	it("parses none without extra params", () => {
		expect(parseUserStatsPeriod({ periodType: "none" })).toEqual({
			type: "none",
		});
	});

	it("includes every read for none", () => {
		const period = { type: "none" as const };
		const bounds = resolveUserStatsPeriodBounds(period, {});
		const undated = { readEndYear: null, readEndMonth: null };
		const dated = { readEndYear: 2020, readEndMonth: 6 };
		expect(readCountsForPeriod(undated, period, bounds).inPeriod).toBe(true);
		expect(readCountsForPeriod(dated, period, bounds).inPeriod).toBe(true);
	});
});

describe("computeReadingPace", () => {
	const yearBounds = {
		start: { year: 2026, month: 1 },
		end: { year: 2026, month: 12 },
	};

	it("uses in-year totals for year periods", () => {
		const pace = computeReadingPace(3, 900, yearBounds, {
			type: "year",
			year: 2026,
		});
		expect(pace.booksPerYear).toBe(3);
		expect(pace.pagesPerYear).toBe(900);
	});
});
