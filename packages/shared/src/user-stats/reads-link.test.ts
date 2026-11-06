import { describe, expect, it } from "bun:test";
import {
	memberReadsHref,
	periodFinishedRange,
	readsFilterParams,
} from "./index";

const query = (href: string | null) =>
	Object.fromEntries(new URL(href ?? "x:", "https://site").searchParams);

describe("readsFilterParams", () => {
	it("maps each kind of bar to the reads page's own filters", () => {
		expect(readsFilterParams({ kind: "country", code: "gb" })).toEqual({
			countries: "GB",
		});
		expect(readsFilterParams({ kind: "author", slug: "ana-quill" })).toEqual({
			authors: "ana-quill",
		});
		expect(readsFilterParams({ kind: "series", slug: "the-saga" })).toEqual({
			series: "the-saga",
		});
	});

	it("turns a subject into the stats' own key, so folded tags are all found", () => {
		expect(readsFilterParams({ kind: "subject", subject: "Fiction" })).toEqual({
			subjectKey: "fiction",
		});
		expect(
			readsFilterParams({ kind: "subject", subject: "Fantasy fiction" }),
		).toEqual({ subjectKey: "fantasy" });
	});

	it("turns a page bucket into a range, the open one into a minimum", () => {
		expect(readsFilterParams({ kind: "pages", bucket: "201-300" })).toEqual({
			minPages: "201",
			maxPages: "300",
		});
		expect(readsFilterParams({ kind: "pages", bucket: "1000+" })).toEqual({
			minPages: "1000",
		});
		expect(readsFilterParams({ kind: "pages", bucket: "nonsense" })).toBeNull();
	});

	it("turns a decade, a century or a year of publication into years", () => {
		expect(readsFilterParams({ kind: "published", label: "1990s" })).toEqual({
			minPublishedIn: "1990",
			maxPublishedIn: "1999",
		});
		expect(readsFilterParams({ kind: "published", label: "20th c." })).toEqual({
			minPublishedIn: "1901",
			maxPublishedIn: "2000",
		});
		expect(readsFilterParams({ kind: "published", label: "1987" })).toEqual({
			minPublishedIn: "1987",
			maxPublishedIn: "1987",
		});
		expect(
			readsFilterParams({ kind: "published", label: "someday" }),
		).toBeNull();
	});

	it("turns a club-rating bar into the ratings it rounds from, kept within 0 to 5", () => {
		expect(readsFilterParams({ kind: "clubRating", bucket: "4.5" })).toEqual({
			minAverageRating: "4.25",
			maxAverageRating: "4.75",
		});
		expect(readsFilterParams({ kind: "clubRating", bucket: "5.0" })).toEqual({
			minAverageRating: "4.75",
			maxAverageRating: "5",
		});
		expect(readsFilterParams({ kind: "clubRating", bucket: "0.0" })).toEqual({
			minAverageRating: "0",
			maxAverageRating: "0.25",
		});
	});

	it("turns a reads-over-time bar into one month, or one year", () => {
		expect(
			readsFilterParams({ kind: "finished", year: 2026, month: 3 }),
		).toEqual({ finishedFrom: "2026-03", finishedTo: "2026-03" });
		expect(readsFilterParams({ kind: "finished", year: 2025 })).toEqual({
			finishedFrom: "2025-01",
			finishedTo: "2025-12",
		});
	});
});

describe("periodFinishedRange", () => {
	it("has a range for a year, a month and a custom range, and none for All time or All books", () => {
		expect(periodFinishedRange({ type: "year", year: 2026 })).toEqual({
			from: "2026-01",
			to: "2026-12",
		});
		expect(
			periodFinishedRange({ type: "month", year: 2026, month: 6 }),
		).toEqual({ from: "2026-06", to: "2026-06" });
		expect(
			periodFinishedRange({
				type: "custom",
				start: { year: 2025, month: 11 },
				end: { year: 2026, month: 2 },
			}),
		).toEqual({ from: "2025-11", to: "2026-02" });
		expect(periodFinishedRange({ type: "life" })).toBeNull();
		expect(periodFinishedRange({ type: "none" })).toBeNull();
		expect(periodFinishedRange(undefined)).toBeNull();
	});
});

describe("memberReadsHref", () => {
	it("opens the member's reads with the filter and the period carried over", () => {
		const href = memberReadsHref(
			"reader",
			{ kind: "country", code: "GB" },
			{ type: "year", year: 2026 },
		);
		expect(href?.startsWith("/users/reader/reads?")).toBe(true);
		expect(query(href)).toEqual({
			finishedFrom: "2026-01",
			finishedTo: "2026-12",
			countries: "GB",
		});
	});

	it("leaves the period out for All time, and lets a finish bar override the period", () => {
		expect(
			query(
				memberReadsHref(
					"reader",
					{ kind: "author", slug: "a" },
					{ type: "life" },
				),
			),
		).toEqual({ authors: "a" });
		expect(
			query(
				memberReadsHref(
					"reader",
					{ kind: "finished", year: 2026, month: 2 },
					{ type: "year", year: 2026 },
				),
			),
		).toEqual({ finishedFrom: "2026-02", finishedTo: "2026-02" });
	});

	it("gives no link for a bar it cannot translate", () => {
		expect(
			memberReadsHref("reader", { kind: "pages", bucket: "?" }),
		).toBeNull();
	});
});
