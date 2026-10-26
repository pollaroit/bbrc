import { describe, expect, test } from "bun:test";
import {
	bookCountBuckets,
	coverageOf,
	type DashboardAuthor,
	isFieldFilled,
	matchesDashboardFilters,
	sortDashboardAuthors,
	sourcesByField,
	sourceTotals,
} from "./author-dashboard.helpers";

function author(patch: Partial<DashboardAuthor> = {}): DashboardAuthor {
	return {
		id: patch.id ?? "a",
		slug: "a",
		name: "A",
		sortName: null,
		bio: null,
		birthYear: null,
		deathYear: null,
		birthPlace: null,
		deathPlace: null,
		nationalities: [],
		gender: "unknown",
		wikipediaUrl: null,
		goodreadsUrl: null,
		websiteUrl: null,
		photoUrl: null,
		wikidataId: null,
		openLibraryId: null,
		status: "auto",
		enrichmentStatus: "done",
		enrichmentAttempts: 0,
		enrichmentError: null,
		fieldMeta: {},
		aliases: [],
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-02"),
		enrichedAt: null,
		bookCount: 1,
		readerCount: 0,
		readCount: 0,
		followerCount: 0,
		...patch,
	};
}

describe("dashboard helpers", () => {
	test("isFieldFilled", () => {
		expect(isFieldFilled(author(), "bio")).toBe(false);
		expect(isFieldFilled(author({ bio: "  " }), "bio")).toBe(false);
		expect(isFieldFilled(author({ bio: "Hi" }), "bio")).toBe(true);
		expect(isFieldFilled(author({ gender: "male" }), "gender")).toBe(true);
		expect(
			isFieldFilled(author({ nationalities: ["RU"] }), "nationalities"),
		).toBe(true);
		expect(isFieldFilled(author(), "name")).toBe(true);
	});

	test("coverage percentages", () => {
		const rows = coverageOf([author({ bio: "x" }), author({ id: "b" })]);
		const bio = rows.find((row) => row.field === "bio");
		expect(bio).toMatchObject({ filled: 1, total: 2, percent: 50 });
		expect(coverageOf([]).every((row) => row.percent === 0)).toBe(true);
	});

	test("sources count only filled fields, unknown when not recorded", () => {
		const rows = sourcesByField([
			author({ bio: "x", fieldMeta: { bio: { source: "wikipedia" } } }),
			author({ id: "b", bio: "y" }),
			author({ id: "c", fieldMeta: { bio: { source: "ai" } } }),
		]);
		const bio = rows.find((row) => row.field === "bio");
		expect(bio?.wikipedia).toBe(1);
		expect(bio?.unknown).toBe(1);
		expect(bio?.ai).toBe(0);
		expect(sourceTotals(rows).wikipedia).toBe(1);
	});

	test("filters", () => {
		const verified = author({
			status: "verified",
			bookCount: 4,
			photoUrl: "u",
		});
		expect(matchesDashboardFilters(verified, { statuses: ["auto"] })).toBe(
			false,
		);
		expect(matchesDashboardFilters(verified, { hasPhoto: true })).toBe(true);
		expect(matchesDashboardFilters(verified, { hasBio: true })).toBe(false);
		expect(matchesDashboardFilters(verified, { minBooks: 5 })).toBe(false);
		expect(matchesDashboardFilters(verified, { withoutBooks: true })).toBe(
			false,
		);
		expect(
			matchesDashboardFilters(verified, { missingFields: ["bio", "photo"] }),
		).toBe(true);
		expect(
			matchesDashboardFilters(verified, { missingFields: ["photo"] }),
		).toBe(false);
		expect(
			matchesDashboardFilters(
				author({ fieldMeta: { bio: { source: "ai" } } }),
				{ sources: ["ai"] },
			),
		).toBe(true);
		expect(
			matchesDashboardFilters(
				author({ fieldMeta: { bio: { source: "ai", locked: true } } }),
				{ hasLocks: true },
			),
		).toBe(true);
		expect(
			matchesDashboardFilters(author({ nationalities: ["RU", "UA"] }), {
				nationalities: ["UA"],
			}),
		).toBe(true);
	});

	test("sort puts empty values last in both directions", () => {
		const list = [
			author({ id: "1", name: "B", birthYear: null }),
			author({ id: "2", name: "A", birthYear: 1900 }),
			author({ id: "3", name: "C", birthYear: 1800 }),
		];
		expect(
			sortDashboardAuthors(list, "birthYear", "asc").map((a) => a.id),
		).toEqual(["3", "2", "1"]);
		expect(
			sortDashboardAuthors(list, "birthYear", "desc").map((a) => a.id),
		).toEqual(["2", "3", "1"]);
		expect(sortDashboardAuthors(list, "name", "asc").map((a) => a.id)).toEqual([
			"2",
			"1",
			"3",
		]);
	});

	test("book count buckets", () => {
		const buckets = bookCountBuckets([0, 1, 1, 4, 12]);
		expect(buckets.map((bucket) => bucket.count)).toEqual([1, 2, 0, 1, 0, 1]);
	});
});
