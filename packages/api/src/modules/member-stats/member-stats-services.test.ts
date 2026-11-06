import { describe, expect, it } from "bun:test";
import { memberViewer } from "@bbrc/shared";
import {
	changeBetween,
	dayRangeOfBounds,
	statsPeriodLabel,
} from "./member-stats-helpers";
import {
	getMemberStatsOverview,
	type OverviewDeps,
} from "./member-stats-overview.service";
import { getMemberStatsReading } from "./member-stats-reading.service";

const book = (
	id: string,
	pages: number,
	over: Record<string, unknown> = {},
) => ({
	id,
	slug: id,
	title: `Book ${id}`,
	authors: ["Ana Quill"],
	authorLinks: [],
	pages,
	countries: ["GB"],
	subjects: ["Fantasy"],
	publishedIn: 1990,
	averageRating: 4,
	coverId: null,
	status: "completed",
	seriesMembership: null,
	...over,
});

const read = (
	id: string,
	pages: number,
	year: number | null,
	month: number | null,
) => ({
	readEndYear: year,
	readEndMonth: month,
	createdAt: new Date(),
	bookId: id,
	book: book(id, pages),
});

const user = {
	id: "owner",
	username: "reader",
	name: "Reader",
	image: null,
	profileVisibility: "public",
	readsVisibility: "public",
	reviewsVisibility: "public",
	favoritesVisibility: "public",
	goalsVisibility: "public",
	readingVisibility: "public",
	readingActivityVisibility: "public",
	bookmarksVisibility: "public",
	showReadingProgress: true,
};

type Opts = {
	user?: Record<string, unknown>;
	ratings?: number[];
	/** What the database says the member read in the period (the ranking compares this). */
	memberCount?: number;
};

function fakeDb(reads: ReturnType<typeof read>[], opts: Opts = {}) {
	const calls = { feedback: 0 };
	const db = {
		user: { findUnique: async () => opts.user ?? user },
		read: {
			findMany: async () => reads,
			groupBy: async () => [
				{ userId: "owner", _count: { _all: opts.memberCount ?? reads.length } },
				{ userId: "other", _count: { _all: 1 } },
			],
		},
		book: { count: async () => 20 },
		feedback: {
			findMany: async () => {
				calls.feedback += 1;
				return (opts.ratings ?? []).map((rating) => ({ rating }));
			},
		},
	};
	return { db: db as never, calls };
}

const viewer = memberViewer({ userId: "someone", role: "user" });

const activityStub = (seconds = 7200): OverviewDeps => ({
	activity: async () =>
		({
			access: "full",
			isOwner: false,
			scope: { progress: true, clock: false, finish: true },
			today: "2026-06-15",
			summary: {
				seconds,
				sessions: 5,
				pagesGained: 120,
				books: 3,
				averageSeconds: 1440,
				longestSeconds: 3000,
				activeDays: 4,
			},
			streak: { longest: 9, current: 3 },
			usualSpeed: 42,
		}) as never,
});

const reads = [
	read("a", 300, 2025, 11),
	read("b", 200, 2026, 1),
	read("c", 400, 2026, 3),
	read("d", 100, null, null),
];

describe("getMemberStatsOverview", () => {
	it("builds the scoreboard with changes against the year before", async () => {
		const { db } = fakeDb(reads, { ratings: [4, 5, 3] });
		const out = await getMemberStatsOverview(
			db,
			viewer,
			{ username: "reader", periodType: "year", period: "2026" },
			activityStub(),
		);
		const tile = (id: string) => out.scoreboard.find((t) => t.id === id);
		expect(tile("books")).toMatchObject({
			value: "2",
			change: { percent: 100, direction: "up" },
		});
		expect(tile("pages")?.value).toBe("600");
		expect(tile("time")).toMatchObject({ value: "2.0", unit: "h" });
		expect(tile("streak")).toMatchObject({ value: "3", note: "best 9 days" });
		expect(tile("rating")).toMatchObject({
			value: "4.0",
			note: "from 3 ratings",
		});
		expect(tile("subject")?.value).toBe("Fantasy");
		expect(out.title).toContain("2026");
		expect(out.periodLabel).toBe("2026");
	});

	it("gives a year its monthly timeline and ranks the member by books read", async () => {
		const { db } = fakeDb(reads, { memberCount: 2 });
		const out = await getMemberStatsOverview(
			db,
			viewer,
			{ username: "reader", periodType: "year", period: "2026" },
			activityStub(),
		);
		expect(out.readsOverTime.mode).toBe("month");
		expect(out.readsOverTime.points.map((p) => p.count)).toEqual([1, 1]);
		expect(out.rank).toMatchObject({ rank: 1, of: 2 });
		expect(out.booksRead.total).toBe(2);
	});

	it("shows All time with undated reads in the totals and no change or rank on a time axis it lacks", async () => {
		const { db } = fakeDb(reads);
		const none = await getMemberStatsOverview(
			db,
			viewer,
			{ username: "reader", periodType: "none" },
			activityStub(),
		);
		expect(none.booksRead.total).toBe(4);
		expect(none.rank).toBeNull();
		expect(none.readsOverTime.mode).toBe("hidden");
		expect(none.scoreboard.find((t) => t.id === "books")?.change).toBeNull();
	});

	it("leaves out the rating tile, and never queries ratings, when reviews are private", async () => {
		const { db, calls } = fakeDb(reads, {
			user: { ...user, reviewsVisibility: "private" },
			ratings: [5],
		});
		const out = await getMemberStatsOverview(
			db,
			viewer,
			{ username: "reader" },
			activityStub(),
		);
		expect(out.scoreboard.some((t) => t.id === "rating")).toBe(false);
		expect(out.access.reviews).toBe(false);
		expect(out.hiddenSections).toBeGreaterThan(0);
		expect(calls.feedback).toBe(0);
	});

	it("shows reading time as five totals when the activity section is closed", async () => {
		const { db } = fakeDb(reads);
		const out = await getMemberStatsOverview(
			db,
			viewer,
			{ username: "reader" },
			{
				activity: async () =>
					({
						access: "numbers",
						numbers: {
							seconds: 3600,
							sessions: 2,
							books: 1,
							averageSeconds: 1800,
							currentStreak: 4,
						},
					}) as never,
			},
		);
		expect(out.scoreboard.find((t) => t.id === "time")).toMatchObject({
			value: "1.0",
			note: "all time",
		});
		expect(out.scoreboard.find((t) => t.id === "streak")?.note).toBeNull();
	});

	it("shows no books at all when reads are private", async () => {
		const { db } = fakeDb(reads, {
			user: { ...user, readsVisibility: "private" },
		});
		const out = await getMemberStatsOverview(
			db,
			viewer,
			{ username: "reader" },
			activityStub(),
		);
		expect(out.booksRead).toEqual({ books: [], total: 0, hasMore: false });
		expect(out.scoreboard.some((t) => t.id === "books")).toBe(false);
		expect(out.rank).toBeNull();
	});
});

describe("getMemberStatsReading", () => {
	it("returns the cumulative series with countries and a monthly pace", async () => {
		const { db } = fakeDb(reads);
		const out = await getMemberStatsReading(
			db,
			viewer,
			{ username: "reader", periodType: "year", period: "2026" },
			activityStub(),
		);
		expect(out.progress).toHaveLength(12);
		expect(out.progress?.at(-1)).toMatchObject({
			books: 2,
			pages: 600,
			countries: 1,
		});
		expect(out.pace?.series).toHaveLength(12);
		expect(out.pace?.year).toMatchObject({
			year: 2026,
			books: 2,
			previousYearBooks: 1,
		});
		expect(out.pages.find((p) => p.label === "201-300")?.count).toBe(0);
		expect(out.pages.find((p) => p.label === "301-400")?.count).toBe(1);
		expect(out.time).toMatchObject({
			kind: "full",
			usualSpeed: 42,
			longestStreak: 9,
		});
	});

	it("has no time charts for All books, and counts every read in the histograms", async () => {
		const { db } = fakeDb(reads);
		const out = await getMemberStatsReading(
			db,
			viewer,
			{ username: "reader", periodType: "none" },
			activityStub(),
		);
		expect(out.hasTimeAxis).toBe(false);
		expect(out.progress).toBeNull();
		expect(out.pace).toBeNull();
		expect(out.pages.reduce((sum, p) => sum + p.count, 0)).toBe(4);
		expect(out.publication.decade).toEqual([{ label: "1990s", count: 4 }]);
	});

	it("returns nothing about books for a viewer who may not see reads", async () => {
		const { db } = fakeDb(reads, {
			user: { ...user, readsVisibility: "private" },
		});
		const out = await getMemberStatsReading(
			db,
			viewer,
			{ username: "reader" },
			activityStub(),
		);
		expect(out.progress).toBeNull();
		expect(out.pace).toBeNull();
		expect(out.pages).toEqual([]);
		expect(out.publication.year).toEqual([]);
		// Reading activity has its own rule and still shows its totals.
		expect(out.time?.kind).toBe("full");
	});
});

describe("helpers", () => {
	it("says the period the way a person would", () => {
		expect(statsPeriodLabel({ type: "life" })).toBe("All time");
		expect(statsPeriodLabel({ type: "none" })).toBe("All books");
		expect(statsPeriodLabel({ type: "year", year: 2026 })).toBe("2026");
		expect(statsPeriodLabel({ type: "month", year: 2026, month: 6 })).toBe(
			"June 2026",
		);
		expect(
			statsPeriodLabel({
				type: "custom",
				start: { year: 2025, month: 1 },
				end: { year: 2026, month: 6 },
			}),
		).toBe("Jan 2025 – Jun 2026");
	});

	it("works out a change, and says so when there was nothing before", () => {
		expect(changeBetween(12, 10)).toEqual({ percent: 20, direction: "up" });
		expect(changeBetween(5, 10)).toEqual({ percent: -50, direction: "down" });
		expect(changeBetween(5, 5)).toEqual({ percent: 0, direction: "same" });
		expect(changeBetween(3, 0)).toEqual({ percent: null, direction: "up" });
		expect(changeBetween(3, null)).toBeNull();
	});

	it("turns a month range into whole days", () => {
		expect(
			dayRangeOfBounds({
				start: { year: 2026, month: 2 },
				end: { year: 2026, month: 2 },
			}),
		).toEqual({ from: "2026-02-01", to: "2026-02-28" });
	});
});
