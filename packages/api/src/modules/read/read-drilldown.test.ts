import { describe, expect, it } from "bun:test";
import {
	bookIdsWithCanonicalSubject,
	finishedRangeWhere,
	parseFinishedMonth,
} from "./read-drilldown";

describe("parseFinishedMonth", () => {
	it("reads YYYY-MM and refuses anything else", () => {
		expect(parseFinishedMonth("2026-03")).toEqual({ year: 2026, month: 3 });
		expect(parseFinishedMonth("2026-13")).toBeNull();
		expect(parseFinishedMonth("2026")).toBeNull();
		expect(parseFinishedMonth(undefined)).toBeNull();
	});
});

describe("finishedRangeWhere", () => {
	it("adds nothing when no range is given", () => {
		expect(finishedRangeWhere(undefined, undefined)).toEqual({});
		expect(finishedRangeWhere("nonsense", "")).toEqual({});
	});

	it("requires a finish date, and bounds it on both sides", () => {
		const where = finishedRangeWhere("2026-02", "2026-04");
		expect(where.AND).toHaveLength(3);
		const [dated, lower, upper] = where.AND as Record<string, unknown>[];
		expect(dated).toEqual({
			readEndYear: { not: null },
			readEndMonth: { not: null },
		});
		expect(lower).toEqual({
			OR: [
				{ readEndYear: { gt: 2026 } },
				{ readEndYear: 2026, readEndMonth: { gte: 2 } },
			],
		});
		expect(upper).toEqual({
			OR: [
				{ readEndYear: { lt: 2026 } },
				{ readEndYear: 2026, readEndMonth: { lte: 4 } },
			],
		});
	});

	it("can bound one side only", () => {
		expect(finishedRangeWhere("2025-06", undefined).AND).toHaveLength(2);
		expect(finishedRangeWhere(undefined, "2025-06").AND).toHaveLength(2);
	});
});

describe("bookIdsWithCanonicalSubject", () => {
	it("matches every tag the stats fold into one subject", async () => {
		const db = {
			read: {
				findMany: async () => [
					{ bookId: "a", book: { subjects: ["Fiction, general"] } },
					{ bookId: "b", book: { subjects: ["Fantasy fiction", "Magic"] } },
					{ bookId: "c", book: { subjects: ["Ficción"] } },
					{ bookId: "d", book: { subjects: ["History"] } },
				],
			},
		};
		const fiction = await bookIdsWithCanonicalSubject(
			db as never,
			"u",
			"Fiction",
		);
		expect(fiction.sort()).toEqual(["a", "c"]);
		expect(
			await bookIdsWithCanonicalSubject(db as never, "u", "fantasy"),
		).toEqual(["b"]);
	});
});
