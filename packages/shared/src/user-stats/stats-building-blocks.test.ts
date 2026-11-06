import { describe, expect, it } from "bun:test";
import {
	averageWithoutMine,
	computeCumulativeReadSeries,
	FULL_STATS_ACCESS,
	hiddenStatsSectionCount,
	MIN_OTHER_RATINGS,
	monthlyPaceSeries,
	NO_STATS_ACCESS,
	normalizeCumulativeSeries,
	rankOf,
	ratedVersusClub,
	STATS_SECTIONS,
	topPercent,
	visibleStatsSections,
	visibleStatsTabs,
	yearPaceSummary,
} from "./index";

describe("averageWithoutMine", () => {
	it("takes the member's own rating out of the club average", () => {
		// Ratings 5 (mine), 3, 3: the club says 3.67, the others say 3.
		expect(averageWithoutMine(5, { ratingSum: 11, ratingCount: 3 })).toEqual({
			average: 3,
			count: 2,
		});
	});

	it("leaves a book out when too few others rated it, or only the member did", () => {
		expect(averageWithoutMine(5, { ratingSum: 5, ratingCount: 1 })).toBeNull();
		expect(averageWithoutMine(5, { ratingSum: 9, ratingCount: 2 })).toBeNull();
		expect(MIN_OTHER_RATINGS).toBe(2);
		expect(averageWithoutMine(5, { ratingSum: 9, ratingCount: 2 }, 1)).toEqual({
			average: 4,
			count: 1,
		});
	});
});

describe("ratedVersusClub", () => {
	const rows = [
		{ bookId: "a", mine: 5, club: { ratingSum: 11, ratingCount: 3 } }, // +2
		{ bookId: "b", mine: 4, club: { ratingSum: 12, ratingCount: 3 } }, // others 4 -> 0
		{ bookId: "c", mine: 2, club: { ratingSum: 10, ratingCount: 3 } }, // others 4 -> -2
		{ bookId: "d", mine: 3, club: { ratingSum: 3, ratingCount: 1 } }, // only me
		{ bookId: "e", mine: 4.5, club: { ratingSum: 12.5, ratingCount: 3 } }, // others 4 -> +0.5
	];

	it("splits higher and lower, biggest gap first, with no minimum gap", () => {
		const result = ratedVersusClub(rows);
		expect(result.higher.map((row) => row.bookId)).toEqual(["a", "e"]);
		expect(result.lower.map((row) => row.bookId)).toEqual(["c"]);
		expect(result.higher[0]).toMatchObject({
			delta: 2,
			othersAverage: 3,
			othersCount: 2,
		});
	});

	it("drops books with a zero gap, and counts the ones with too few others", () => {
		const result = ratedVersusClub(rows);
		const all = [...result.higher, ...result.lower].map((row) => row.bookId);
		expect(all).not.toContain("b");
		expect(result.skipped).toBe(1);
	});

	it("keeps only the top few on each side", () => {
		const many = Array.from({ length: 10 }, (_, index) => ({
			bookId: `b${index}`,
			mine: 5,
			club: { ratingSum: 5 + (index + 1) * 2 + 2, ratingCount: 3 },
		}));
		expect(ratedVersusClub(many, { limit: 3 }).higher).toHaveLength(3);
	});
});

describe("rankOf", () => {
	it("is the place among everyone, with ties sharing a place", () => {
		expect(rankOf(5, [9, 5, 5, 1])).toEqual({ rank: 2, of: 4 });
		expect(rankOf(9, [9, 5, 5, 1])).toEqual({ rank: 1, of: 4 });
		expect(rankOf(1, [9, 5, 5, 1])).toEqual({ rank: 4, of: 4 });
	});

	it("says nothing for a member alone or with nothing to rank", () => {
		expect(rankOf(3, [3])).toBeNull();
		expect(rankOf(0, [0, 4, 2])).toBeNull();
	});

	it("rounds the share up so the best place is never 'top 0%'", () => {
		expect(topPercent({ rank: 1, of: 14 })).toBe(8);
		expect(topPercent({ rank: 1, of: 1000 })).toBe(1);
	});
});

describe("monthlyPaceSeries and yearPaceSummary", () => {
	const bounds = {
		start: { year: 2026, month: 1 },
		end: { year: 2026, month: 6 },
	};
	const reads = [
		{ finish: { year: 2026, month: 1 }, pages: 300 },
		{ finish: { year: 2026, month: 1 }, pages: 100 },
		{ finish: { year: 2026, month: 3 }, pages: 200 },
		{ finish: { year: 2026, month: 6 }, pages: 400 },
	];

	it("has a column for every month, empty months included, and a rolling average", () => {
		const series = monthlyPaceSeries(reads, bounds, 3, "en-US");
		expect(series.map((month) => month.books)).toEqual([2, 0, 1, 0, 0, 1]);
		expect(series.map((month) => month.pages)).toEqual([
			400, 0, 200, 0, 0, 400,
		]);
		// March: (2 + 0 + 1) / 3 books, (400 + 0 + 200) / 3 pages.
		expect(series[2]).toMatchObject({ rollingBooks: 1, rollingPages: 200 });
		// January only has itself to average with.
		expect(series[0]).toMatchObject({ rollingBooks: 2, rollingPages: 400 });
	});

	it("projects the year at the pace so far, only while the year is running", () => {
		const during = yearPaceSummary(reads, 2026, { year: 2026, month: 6 });
		expect(during).toMatchObject({
			books: 4,
			pages: 1000,
			monthsElapsed: 6,
			projectedBooks: 8,
			projectedPages: 2000,
		});
		const after = yearPaceSummary(reads, 2026, { year: 2027, month: 2 });
		expect(after.projectedBooks).toBeNull();
		expect(after.monthsElapsed).toBe(12);
	});

	it("compares with the year before", () => {
		const both = [...reads, { finish: { year: 2025, month: 5 }, pages: 250 }];
		const summary = yearPaceSummary(both, 2026, { year: 2026, month: 6 });
		expect(summary.previousYearBooks).toBe(1);
		expect(summary.previousYearPages).toBe(250);
	});
});

describe("cumulative series with countries", () => {
	const bounds = {
		start: { year: 2026, month: 1 },
		end: { year: 2026, month: 3 },
	};
	const reads = [
		{
			finish: { year: 2026, month: 1 },
			pages: 100,
			authorKeys: ["a"],
			countries: ["us", "GB"],
		},
		{
			finish: { year: 2026, month: 3 },
			pages: 300,
			authorKeys: ["a", "b"],
			countries: ["US"],
		},
	];

	it("counts each country once, whatever the case", () => {
		const series = computeCumulativeReadSeries(reads, bounds, "en-US");
		expect(series.map((point) => point.countries)).toEqual([2, 2, 2]);
		expect(series.map((point) => point.authors)).toEqual([1, 1, 2]);
	});

	it("draws each chosen metric as a percentage of its own final value", () => {
		const series = computeCumulativeReadSeries(reads, bounds, "en-US");
		const normalized = normalizeCumulativeSeries(series, ["books", "pages"]);
		expect(normalized.map((point) => point.books)).toEqual([50, 50, 100]);
		expect(normalized.map((point) => point.pages)).toEqual([25, 25, 100]);
		// Metrics that were not chosen stay flat, and the real numbers ride along.
		expect(normalized[0]?.authors).toBe(0);
		expect(normalized[2]?.values).toMatchObject({ pages: 400, books: 2 });
	});

	it("does not divide by zero for a metric that never moved", () => {
		const series = computeCumulativeReadSeries([], bounds, "en-US");
		const normalized = normalizeCumulativeSeries(series, ["books"]);
		expect(normalized.every((point) => point.books === 0)).toBe(true);
	});
});

describe("the section registry", () => {
	it("has unique ids and puts every section on a real tab", () => {
		const ids = STATS_SECTIONS.map((section) => section.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("shows a member everything they may see and counts what is hidden", () => {
		expect(visibleStatsSections(FULL_STATS_ACCESS)).toHaveLength(
			STATS_SECTIONS.length,
		);
		const noReviews = { ...FULL_STATS_ACCESS, reviews: false };
		const visible = visibleStatsSections(noReviews).map(
			(section) => section.id,
		);
		expect(visible).not.toContain("rated-vs-club");
		expect(visible).not.toContain("reviews");
		expect(hiddenStatsSectionCount(noReviews)).toBeGreaterThan(0);
		expect(hiddenStatsSectionCount(FULL_STATS_ACCESS)).toBe(0);
	});

	it("shows nothing to a viewer who may see nothing, and drops empty tabs", () => {
		expect(visibleStatsSections(NO_STATS_ACCESS)).toEqual([]);
		const onlyProfile = visibleStatsSections({
			...NO_STATS_ACCESS,
			profile: true,
		});
		const tabs = visibleStatsTabs(onlyProfile);
		expect(tabs).toContain("community");
		expect(tabs).not.toContain("taste");
	});

	it("the club page has its own, smaller list, whatever the viewer's access", () => {
		const club = visibleStatsSections(NO_STATS_ACCESS, "club");
		expect(club.length).toBeGreaterThan(0);
		expect(club.every((section) => section.club)).toBe(true);
		expect(club.map((section) => section.id)).not.toContain("rated-vs-club");
	});
});
