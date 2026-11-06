import { describe, expect, it } from "bun:test";
import { clubStatsCacheKey } from "./club-stats.router";
import {
	clubTitle,
	getClubStatsClubLife,
	getClubStatsCommunity,
	getClubStatsOverview,
	getClubStatsTaste,
} from "./club-stats.service";

const book = (id: string, over: Record<string, unknown> = {}) => ({
	id,
	slug: id,
	title: `Book ${id}`,
	authors: ["Ana Quill"],
	authorLinks: [],
	pages: 100,
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
	userId: string,
	bookId: string,
	year: number | null,
	month: number | null,
) => ({
	userId,
	bookId,
	readEndYear: year,
	readEndMonth: month,
});

const reads = [
	read("u1", "b1", 2026, 1),
	read("u1", "b2", 2026, 2),
	read("u2", "b1", 2026, 3),
	read("u3", "b3", 2025, 6),
	read("u1", "b4", null, null),
];

type Opts = {
	people?: Record<string, unknown>[];
	ratings?: { rating: number }[];
};

function fakeDb(opts: Opts = {}) {
	const queried: { post: unknown[] } = { post: [] };
	const db = {
		read: { findMany: async () => reads },
		book: {
			findMany: async () => [book("b1"), book("b2"), book("b3"), book("b4")],
		},
		user: {
			count: async () => 14,
			findMany: async () =>
				opts.people ?? [
					{
						id: "u1",
						name: "Open",
						username: "open",
						image: null,
						profileVisibility: "public",
						readsVisibility: "public",
						xp: 100,
						rp: 0,
					},
					{
						id: "u2",
						name: "Closed",
						username: "closed",
						image: null,
						profileVisibility: "private",
						readsVisibility: "public",
						xp: 5,
						rp: 0,
					},
					{
						id: "u3",
						name: "NoReads",
						username: "noreads",
						image: null,
						profileVisibility: "public",
						readsVisibility: "private",
						xp: 5,
						rp: 0,
					},
				],
		},
		feedback: {
			findMany: async () =>
				(opts.ratings ?? [{ rating: 4 }, { rating: 5 }]).map((row) => ({
					...row,
					createdAt: new Date(Date.UTC(2026, 0, 3)),
					_count: { likes: 2, comments: 1 },
				})),
			groupBy: async () => [
				{ bookId: "b1", _avg: { rating: 4.5 }, _count: { _all: 3 } },
				{ bookId: "b2", _avg: { rating: 5 }, _count: { _all: 1 } },
			],
		},
		readingSession: {
			aggregate: async () => ({
				_sum: { activeSeconds: 7200 },
				_count: { _all: 4 },
			}),
			groupBy: async () => [{ userId: "u1" }, { userId: "u2" }],
		},
		post: {
			findMany: async (args: { where: { AND?: unknown } }) => {
				queried.post.push(args.where);
				return args.where.AND
					? [
							{
								slug: "public-post",
								content: "Hi",
								_count: { likes: 5, comments: 0 },
							},
						]
					: [
							{
								createdAt: new Date(Date.UTC(2026, 0, 5)),
								poll: { id: "p" },
								tierlist: null,
								_count: { likes: 5, comments: 0 },
							},
							{
								createdAt: new Date(Date.UTC(2026, 1, 5)),
								poll: null,
								tierlist: { id: "t" },
								_count: { likes: 9, comments: 4 },
							},
						];
			},
		},
		shelf: {
			findMany: async () => [
				{ _count: { books: 3 } },
				{ _count: { books: 1 } },
			],
		},
		friendship: { count: async () => 7 },
		sitting: {
			groupBy: async () => [
				{ status: "finished", _count: { _all: 3 } },
				{ status: "voting", _count: { _all: 1 } },
			],
		},
		participation: {
			groupBy: async () => [
				{ progress: "completed", _count: { _all: 6 } },
				{ progress: "dnf", _count: { _all: 2 } },
			],
		},
		pollVote: { count: async () => 11 },
		goal: {
			findMany: async () => [
				{ userId: "u1" },
				{ userId: "u1" },
				{ userId: "u2" },
			],
		},
		userAchievement: {
			findMany: async () => [
				{ userId: "u1", achievementKey: "x" },
				{ userId: "u2", achievementKey: "x" },
			],
		},
	};
	return { db: db as never, queried };
}

describe("club overview", () => {
	it("counts every member's reads in the period, and gives the year its own title", async () => {
		const { db } = fakeDb();
		const year = await getClubStatsOverview(db, {
			periodType: "year",
			period: "2026",
		});
		const books = year.scoreboard.find((tile) => tile.id === "books");
		expect(books?.value).toBe("3");
		expect(year.title).toBe("The club's 2026 in books");
		expect(year.scoreboard.find((t) => t.id === "readers")).toMatchObject({
			value: "2",
			unit: "of 14",
		});
		expect(year.readsOverTime.mode).toBe("month");

		const all = await getClubStatsOverview(db, { periodType: "life" });
		expect(all.scoreboard.find((t) => t.id === "books")?.value).toBe("5");
		expect(all.readsOverTime.mode).toBe("year");

		const none = await getClubStatsOverview(db, { periodType: "none" });
		expect(none.readsOverTime.mode).toBe("hidden");
		expect(none.title).toBe("Every book the club has read");
	});

	it("names a top reader only when their profile and reads are both public", async () => {
		const { db } = fakeDb();
		const out = await getClubStatsOverview(db, { periodType: "life" });
		const byBooks = out.topReaders.map((row) => ({
			rank: row.rank,
			books: row.books,
			name: row.name,
		}));
		// Dated reads rank the readers: u1 has two (open), u2 and u3 one each (private profile, private reads).
		expect(byBooks[0]).toEqual({ rank: 1, books: 2, name: "Open" });
		for (const row of out.topReaders.slice(1)) {
			expect(row.name).toBeNull();
			expect(row.username).toBeNull();
			expect(row.image).toBeNull();
		}
	});

	it("shows the time read and the average rating over everyone", async () => {
		const { db } = fakeDb();
		const out = await getClubStatsOverview(db, { periodType: "life" });
		expect(out.scoreboard.find((t) => t.id === "time")).toMatchObject({
			value: "2.0",
			unit: "h",
		});
		expect(out.scoreboard.find((t) => t.id === "rating")).toMatchObject({
			value: "4.5",
			note: "from 2 ratings",
		});
	});
});

describe("club taste", () => {
	it("weights authors and countries by reads, and ranks books by readers", async () => {
		const { db } = fakeDb();
		const out = await getClubStatsTaste(db, {
			periodType: "year",
			period: "2026",
		});
		expect(out.authors[0]).toMatchObject({ label: "Ana Quill", count: 3 });
		expect(out.countries.map).toEqual([{ code: "GB", count: 3 }]);
		expect(out.mostRead[0]).toMatchObject({ id: "b1", readers: 2 });
	});

	it("counts a book as best rated only with at least two ratings", async () => {
		const { db } = fakeDb();
		const out = await getClubStatsTaste(db, { periodType: "life" });
		expect(out.topRated.map((row) => row.id)).toEqual(["b1"]);
		expect(out.topRated[0]).toMatchObject({ average: 4.5, ratings: 3 });
	});
});

describe("club community", () => {
	it("totals everything but names only the posts an anonymous visitor may see", async () => {
		const { db, queried } = fakeDb();
		const out = await getClubStatsCommunity(db, {
			periodType: "year",
			period: "2026",
		});
		expect(out.posts).toMatchObject({
			count: 2,
			likes: 14,
			comments: 4,
			polls: 1,
			tierlists: 1,
		});
		expect(out.posts.top.map((p) => p.slug)).toEqual(["public-post"]);
		// The totals ask for every published post; the named list asks as an anonymous viewer.
		expect(queried.post).toHaveLength(2);
		expect(out.reviews).toMatchObject({
			count: 2,
			average: 4.5,
			likes: 4,
			comments: 2,
		});
		expect(out.shelves).toEqual({ count: 2, books: 4 });
		expect(out.friends).toEqual({ pairs: 7, averagePerMember: 1 });
	});
});

describe("club life", () => {
	it("counts sittings, votes, goals and achievements across the club", async () => {
		const { db } = fakeDb();
		const out = await getClubStatsClubLife(db, {
			periodType: "year",
			period: "2026",
		});
		expect(out.sittings).toMatchObject({
			total: 4,
			finished: 3,
			voting: 1,
			participations: 8,
			completionRate: 75,
			votes: 11,
		});
		expect(out.goals).toEqual({ year: 2026, set: 3, members: 2 });
		expect(out.achievements).toMatchObject({ awards: 2, members: 2 });
		expect(out.standing.totalXp).toBe(110);
		expect(out.standing.levels.reduce((sum, row) => sum + row.count, 0)).toBe(
			3,
		);
	});
});

describe("cache keys and titles", () => {
	it("keys each tab and period apart, and a bare year means this year", () => {
		const now = String(new Date().getUTCFullYear());
		expect(clubStatsCacheKey("taste", { periodType: "life" })).toBe(
			"club-stats:v1:taste:life:",
		);
		expect(
			clubStatsCacheKey("taste", { periodType: "year", period: "2025" }),
		).toBe("club-stats:v1:taste:year:2025");
		expect(clubStatsCacheKey("taste", { periodType: "year" })).toBe(
			`club-stats:v1:taste:year:${now}`,
		);
		expect(clubStatsCacheKey("reading", { periodType: "life" })).not.toBe(
			clubStatsCacheKey("taste", { periodType: "life" }),
		);
	});

	it("titles the club's periods", () => {
		expect(clubTitle({ type: "life" })).toBe("The club's life in books");
	});
});
