import { describe, expect, it } from "bun:test";
import {
	bookMatchesGoalScope,
	countReadsForGoal,
	goalScopeFingerprint,
	goalScopeFromStored,
	isGoalYearAllowed,
	readCountsTowardGoal,
} from "./index";

describe("goal scope", () => {
	it("fingerprints identical scopes consistently", () => {
		const a = goalScopeFromStored({
			scopeKind: "countries",
			scopeAuthors: [],
			scopeCountries: ["US", "ru"],
		});
		const b = goalScopeFromStored({
			scopeKind: "countries",
			scopeAuthors: [],
			scopeCountries: ["RU", "US"],
		});
		expect(goalScopeFingerprint(a)).toBe(goalScopeFingerprint(b));
	});

	it("matches author scope by slug", () => {
		const scope = goalScopeFromStored({
			scopeKind: "authors",
			scopeAuthors: ["leo_tolstoy"],
			scopeCountries: [],
		});
		expect(
			bookMatchesGoalScope(
				{ authors: ["Leo Tolstoy"], countries: ["RU"] },
				scope,
			),
		).toBe(true);
		expect(
			bookMatchesGoalScope(
				{ authors: ["Fyodor Dostoevsky"], countries: [] },
				scope,
			),
		).toBe(false);
	});

	it("matches author scope through the author records, including merged slugs", () => {
		const scope = goalScopeFromStored({
			scopeKind: "authors",
			scopeAuthors: ["dostoevsky_old"],
			scopeCountries: [],
		});
		expect(
			bookMatchesGoalScope(
				{
					authors: ["Fyodor Dostoyevsky"],
					authorSlugs: ["fyodor_dostoyevsky", "dostoevsky_old"],
					countries: [],
				},
				scope,
			),
		).toBe(true);
		expect(
			bookMatchesGoalScope(
				{
					authors: ["Leo Tolstoy"],
					authorSlugs: ["leo_tolstoy"],
					countries: [],
				},
				scope,
			),
		).toBe(false);
	});

	it("matches country scope", () => {
		const scope = goalScopeFromStored({
			scopeKind: "countries",
			scopeAuthors: [],
			scopeCountries: ["US"],
		});
		expect(
			bookMatchesGoalScope(
				{ authors: ["Author"], countries: ["us", "GB"] },
				scope,
			),
		).toBe(true);
	});
});

describe("goal progress", () => {
	const reads = [
		{
			readEndYear: 2026,
			readEndMonth: 3,
			book: { authors: ["A"], countries: ["US"] },
		},
		{
			readEndYear: 2026,
			readEndMonth: null,
			book: { authors: ["B"], countries: ["US"] },
		},
		{
			readEndYear: 2025,
			readEndMonth: 12,
			book: { authors: ["C"], countries: ["US"] },
		},
	] as const;

	it("counts only dated reads in goal year", () => {
		const scope = goalScopeFromStored({
			scopeKind: "none",
			scopeAuthors: [],
			scopeCountries: [],
		});
		expect(countReadsForGoal(reads, 2026, scope)).toBe(1);
	});

	it("applies country scope to reads", () => {
		const scope = goalScopeFromStored({
			scopeKind: "countries",
			scopeAuthors: [],
			scopeCountries: ["DE"],
		});
		const scopedReads = [
			{
				readEndYear: 2026,
				readEndMonth: 1,
				book: { authors: ["X"], countries: ["DE"] },
			},
			{
				readEndYear: 2026,
				readEndMonth: 2,
				book: { authors: ["Y"], countries: ["US"] },
			},
		];
		expect(countReadsForGoal(scopedReads, 2026, scope)).toBe(1);
		const first = scopedReads[0];
		if (first) {
			expect(readCountsTowardGoal(first, 2026, scope)).toBe(true);
		}
	});
});

describe("goal year rules", () => {
	it("allows only current and next calendar year in club TZ", () => {
		const now = new Date("2026-06-15T12:00:00Z");
		expect(isGoalYearAllowed(2025, now, "UTC")).toBe(false);
		expect(isGoalYearAllowed(2026, now, "UTC")).toBe(true);
		expect(isGoalYearAllowed(2027, now, "UTC")).toBe(true);
		expect(isGoalYearAllowed(2028, now, "UTC")).toBe(false);
	});
});
