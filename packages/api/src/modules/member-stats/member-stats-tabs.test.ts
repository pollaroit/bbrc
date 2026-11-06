import { describe, expect, it } from "bun:test";
import { memberViewer } from "@bbrc/shared";
import { getMemberStatsClubLife } from "./member-stats-club-life.service";
import { getMemberStatsCommunity } from "./member-stats-community.service";
import { getMemberStatsTaste } from "./member-stats-taste.service";

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

const book = (id: string, over: Record<string, unknown> = {}) => ({
	id,
	slug: id,
	title: `Book ${id}`,
	authors: ["Ana Quill"],
	authorLinks: [
		{
			author: {
				id: "a1",
				slug: "ana-quill",
				name: "Ana Quill",
				photoUrl: null,
			},
		},
	],
	pages: 200,
	countries: ["GB"],
	subjects: ["Fantasy"],
	publishedIn: 1990,
	averageRating: 4,
	coverId: null,
	status: "completed",
	seriesMembership: null,
	...over,
});

const read = (id: string) => ({
	readEndYear: 2026,
	readEndMonth: 2,
	createdAt: new Date(),
	bookId: id,
	book: book(id),
});

const viewer = memberViewer({ userId: "someone", role: "user" });

type Spy = Record<string, number>;

function fakeDb(
	overrides: Record<string, unknown> = {},
	userOverride: Record<string, unknown> = {},
) {
	const calls: Spy = {};
	const spy =
		<T>(name: string, value: T) =>
		async () => {
			calls[name] = (calls[name] ?? 0) + 1;
			return value;
		};
	const db = {
		user: {
			findUnique: async () => ({ ...user, ...userOverride }),
			findMany: spy("user.findMany", [
				{ id: "owner", xp: 300, rp: 10 },
				{ id: "other", xp: 100, rp: 50 },
			]),
			count: spy("user.count", 14),
		},
		read: {
			findMany: spy("read.findMany", [read("b1"), read("b2"), read("b3")]),
			groupBy: spy("read.groupBy", [
				{ bookId: "b1", _count: { _all: 5 } },
				{ bookId: "b2", _count: { _all: 1 } },
			]),
		},
		feedback: {
			findMany: spy("feedback.findMany", []),
			groupBy: spy("feedback.groupBy", []),
		},
		post: {
			findMany: spy("post.findMany", []),
			groupBy: spy("post.groupBy", []),
		},
		shelf: {
			findMany: spy("shelf.findMany", []),
			groupBy: spy("shelf.groupBy", []),
		},
		friendship: { count: spy("friendship.count", 3) },
		participation: {
			findMany: spy("participation.findMany", []),
			groupBy: spy("participation.groupBy", []),
		},
		pollVote: { findMany: spy("pollVote.findMany", []) },
		book: { count: spy("book.count", 0) },
		sitting: { count: spy("sitting.count", 2) },
		userAchievement: { findMany: spy("userAchievement.findMany", []) },
		goal: { findMany: spy("goal.findMany", []) },
		...overrides,
	};
	return { db: db as never, calls };
}

describe("taste tab", () => {
	it("compares with the club without the member's own rating, and only with enough others", async () => {
		const { db } = fakeDb({
			feedback: {
				findMany: async () => [
					{ bookId: "b1", rating: 5 },
					{ bookId: "b2", rating: 4 },
					{ bookId: "b3", rating: 3 },
				],
				// b1: 5 + 3 + 3 = 11 over 3 ratings; b2: 4 + 4 = 8 over 2 (one other); b3 only mine.
				groupBy: async () => [
					{ bookId: "b1", _sum: { rating: 11 }, _count: { _all: 3 } },
					{ bookId: "b2", _sum: { rating: 8 }, _count: { _all: 2 } },
					{ bookId: "b3", _sum: { rating: 3 }, _count: { _all: 1 } },
				],
			},
		});
		const out = await getMemberStatsTaste(db, viewer, { username: "reader" });
		expect(out.ratedVsClub?.higher).toHaveLength(1);
		expect(out.ratedVsClub?.higher[0]).toMatchObject({
			mine: 5,
			othersAverage: 3,
			othersCount: 2,
			delta: 2,
		});
		expect(out.ratedVsClub?.higher[0]?.book.id).toBe("b1");
		expect(out.ratedVsClub?.lower).toEqual([]);
		// b2 has one other rating and b3 none: both are left out and counted.
		expect(out.ratedVsClub?.skipped).toBe(2);
		expect(out.popular.most[0]).toMatchObject({ id: "b1", clubReads: 5 });
	});

	it("carries no rating at all, and never asks for them, when reviews are private", async () => {
		const { db, calls } = fakeDb({}, { reviewsVisibility: "private" });
		const out = await getMemberStatsTaste(db, viewer, { username: "reader" });
		expect(out.ratedVsClub).toBeNull();
		expect(out.authors.byRating).toBeNull();
		expect(out.subjects.topRated).toBeNull();
		expect(out.authors.byCount.every((row) => row.average === null)).toBe(true);
		expect(out.countries.rows.every((row) => row.average === null)).toBe(true);
		expect(calls["feedback.findMany"]).toBeUndefined();
		expect(calls["feedback.groupBy"]).toBeUndefined();
		// Counting what they read is still fine.
		expect(out.authors.byCount[0]?.count).toBe(3);
		expect(out.countries.map).toEqual([{ code: "GB", count: 3 }]);
	});

	it("shows nothing about books when reads are private", async () => {
		const { db, calls } = fakeDb({}, { readsVisibility: "private" });
		const out = await getMemberStatsTaste(db, viewer, { username: "reader" });
		expect(out.authors.byCount).toEqual([]);
		expect(out.series).toEqual([]);
		expect(out.popular.most).toEqual([]);
		expect(out.clubRating.points).toEqual([]);
		expect(calls["read.groupBy"]).toBeUndefined();
	});
});

describe("community tab", () => {
	it("leaves reviews out, and never loads them, when reviews are private", async () => {
		const { db, calls } = fakeDb({}, { reviewsVisibility: "private" });
		const out = await getMemberStatsCommunity(db, viewer, {
			username: "reader",
		});
		expect(out.reviews).toBeNull();
		expect(calls["feedback.findMany"]).toBeUndefined();
		expect(calls["feedback.groupBy"]).toBeUndefined();
		expect(out.friends.count).toBe(3);
	});

	it("counts posts, likes and comments and ranks the member among everyone", async () => {
		const { db } = fakeDb({
			post: {
				findMany: async () => [
					{
						slug: "p1",
						content: "Hello there",
						createdAt: new Date(Date.UTC(2026, 0, 5)),
						poll: { id: "x" },
						tierlist: null,
						_count: { likes: 4, comments: 1 },
					},
					{
						slug: "p2",
						content: "Quiet one",
						createdAt: new Date(Date.UTC(2026, 1, 9)),
						poll: null,
						tierlist: { id: "t" },
						_count: { likes: 0, comments: 0 },
					},
				],
				groupBy: async () => [
					{ authorId: "owner", _count: { _all: 2 } },
					{ authorId: "a", _count: { _all: 9 } },
					{ authorId: "b", _count: { _all: 1 } },
				],
			},
		});
		const out = await getMemberStatsCommunity(db, viewer, {
			username: "reader",
			periodType: "year",
			period: "2026",
		});
		expect(out.posts).toMatchObject({
			count: 2,
			likes: 4,
			comments: 1,
			polls: 1,
			tierlists: 1,
		});
		expect(out.posts.rank).toMatchObject({ rank: 2, of: 3 });
		expect(out.posts.top.map((p) => p.slug)).toEqual(["p1"]);
		expect(out.posts.cumulative.map((m) => m.total).slice(0, 3)).toEqual([
			1, 2, 2,
		]);
	});

	it("gives shelves in the shape of the shelf cards, biggest first", async () => {
		const row = (
			id: string,
			books: number,
			over: Record<string, unknown> = {},
		) => ({
			id,
			slug: id,
			title: `Shelf ${id}`,
			description: null,
			coverImageUrl: null,
			type: "ordered",
			visibility: "public",
			viewCount: 3,
			user: { username: "reader", name: "Reader", image: null },
			collaborators: [{ user: { username: "pal", name: "Pal", image: null } }],
			_count: { books, collaborators: 1 },
			...over,
		});
		const { db } = fakeDb({
			shelf: {
				findMany: async () => [row("small", 1), row("big", 9)],
				groupBy: async () => [{ userId: "owner", _count: { _all: 2 } }],
			},
			shelfBook: {
				findMany: async () => [
					{ shelfId: "big", book: { coverId: 11 } },
					{ shelfId: "big", book: { coverId: 12 } },
				],
			},
		});
		const out = await getMemberStatsCommunity(db, viewer, {
			username: "reader",
		});
		expect(out.shelves.top.map((shelf) => shelf.slug)).toEqual([
			"big",
			"small",
		]);
		expect(out.shelves.top[0]).toMatchObject({
			bookCount: 9,
			coverPreviewCoverIds: [11, 12],
			collaboratorCount: 1,
			owner: { username: "reader" },
		});
		expect(out.shelves.top[0]?.collaborators[0]?.username).toBe("pal");
	});

	it("rates only the reviews the viewer may see", async () => {
		const { db } = fakeDb({
			feedback: {
				findMany: async () => [
					{
						slug: "r1",
						rating: 4,
						createdAt: new Date(Date.UTC(2026, 0, 1)),
						book: {
							id: "b1",
							slug: "b1",
							title: "B1",
							authors: ["A"],
							coverId: null,
						},
						_count: { likes: 2, comments: 0 },
					},
					{
						slug: "r2",
						rating: 5,
						createdAt: new Date(Date.UTC(2026, 0, 2)),
						book: {
							id: "b2",
							slug: "b2",
							title: "B2",
							authors: ["A"],
							coverId: null,
						},
						_count: { likes: 0, comments: 0 },
					},
				],
				groupBy: async () => [
					{ authorId: "owner", _count: { _all: 2 } },
					{ authorId: "x", _count: { _all: 1 } },
				],
			},
		});
		const out = await getMemberStatsCommunity(db, viewer, {
			username: "reader",
		});
		expect(out.reviews).toMatchObject({ count: 2, average: 4.5, likes: 2 });
		expect(out.reviews?.spread.find((s) => s.label === "5★")?.count).toBe(1);
		expect(out.reviews?.top.map((r) => r.slug)).toEqual(["r1"]);
	});
});

describe("club life tab", () => {
	const achievement = (key: string, tier = 1) => ({
		achievementKey: key,
		tier,
		earnedAt: new Date(Date.UTC(2026, 0, 1)),
	});

	it("counts sittings, and a vote wins when the sitting picked that book", async () => {
		const { db } = fakeDb({
			participation: {
				findMany: async () => [
					{ progress: "completed" },
					{ progress: "completed" },
					{ progress: "dnf" },
					{ progress: "in_progress" },
				],
				groupBy: async () => [
					{ userId: "owner", _count: { _all: 2 } },
					{ userId: "x", _count: { _all: 5 } },
				],
			},
			pollVote: {
				findMany: async () => [
					{
						option: {
							bookId: "b1",
							poll: { sitting: { selectedBookId: "b1" } },
						},
					},
					{
						option: {
							bookId: "b2",
							poll: { sitting: { selectedBookId: "b1" } },
						},
					},
					{ option: { bookId: "b3", poll: { sitting: null } } },
				],
			},
		});
		const out = await getMemberStatsClubLife(db, viewer, {
			username: "reader",
		});
		expect(out.sittings).toMatchObject({
			joined: 4,
			completed: 2,
			didNotFinish: 1,
			inProgress: 1,
			notStarted: 0,
			organised: 2,
			completionRate: 67,
			votesCast: 3,
			votesThatWon: 1,
		});
		expect(out.sittings.rank).toMatchObject({ rank: 2, of: 2 });
		expect(out.standing).toMatchObject({ xp: 300, rp: 10 });
		expect(out.standing.xpRank).toMatchObject({ rank: 1, of: 2 });
	});

	it("leaves goals out when they are private", async () => {
		const { db } = fakeDb({}, { goalsVisibility: "private" });
		const out = await getMemberStatsClubLife(db, viewer, {
			username: "reader",
		});
		expect(out.goals).toBeNull();
		expect(out.access.goals).toBe(false);
	});

	it("does not tell another viewer about a hidden achievement", async () => {
		const { ACHIEVEMENTS } = await import("@bbrc/shared");
		const hidden = ACHIEVEMENTS.find((a) => a.isHidden);
		const open = ACHIEVEMENTS.find((a) => !a.isHidden);
		if (!hidden || !open) return;
		const awards = [achievement(hidden.key), achievement(open.key)];
		const rows = (db: ReturnType<typeof fakeDb>["db"]) => db;
		const { db } = fakeDb({
			userAchievement: {
				findMany: async (args: { distinct?: string[] }) =>
					args.distinct
						? [
								{ userId: "owner", achievementKey: hidden.key },
								{ userId: "owner", achievementKey: open.key },
								{ userId: "x", achievementKey: open.key },
							]
						: awards,
			},
		});
		const others = await getMemberStatsClubLife(rows(db), viewer, {
			username: "reader",
		});
		expect(others.achievements.earned).toBe(1);
		expect(others.achievements.recent.map((a) => a.key)).toEqual([open.key]);
		expect(others.achievements.rarest[0]).toMatchObject({
			earnedBy: 2,
			members: 14,
		});

		const owner = memberViewer({ userId: "owner", role: "user" });
		const own = await getMemberStatsClubLife(db, owner, { username: "reader" });
		expect(own.achievements.earned).toBe(2);
	});
});
