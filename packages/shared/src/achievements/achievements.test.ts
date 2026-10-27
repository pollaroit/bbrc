import { describe, expect, test } from "bun:test";
import { LOCALES } from "@bbrc/i18n";
import { genreName } from "../genre-text";
import { ACHIEVEMENTS, getAchievement } from "./definitions";
import {
	achievementProgress,
	describeTier,
	evaluateAchievements,
	tierName,
} from "./evaluate";
import { METRICS } from "./metrics";
import { achievementName } from "./text";
import type { AchievementFacts, ReadFact } from "./types";

const d = (iso: string) => new Date(iso);

function facts(overrides: Partial<AchievementFacts> = {}): AchievementFacts {
	return {
		now: d("2026-10-24T12:00:00Z"),
		timeZone: "UTC",
		user: {
			createdAt: d("2025-01-10T09:00:00Z"),
			joinRank: 40,
			hasAvatar: false,
		},
		profile: null,
		reads: [],
		firstReadBookIds: [],
		feedbacks: [],
		posts: [],
		commentTimes: [],
		likesReceived: [],
		participations: [],
		votes: [],
		goals: [],
		shelves: [],
		documentTimes: [],
		requestedBookTimes: [],
		favoriteTimes: [],
		quizzes: [],
		series: [],
		views: { mostOpenedPost: null, mostOpenedReview: null, profileOpens: null },
		reading: {
			onTimeFinishes: [],
			longestStreak: null,
			wishlistSize: 0,
			wishlistAt: null,
		},
		...overrides,
	};
}

function read(id: string, at: string, extra: Partial<ReadFact> = {}): ReadFact {
	return {
		bookId: id,
		at: d(at),
		period: extra.period ?? d(at),
		pages: 200,
		publishedIn: 2000,
		countries: [],
		authors: [],
		...extra,
	};
}

function earnedOf(f: AchievementFacts, key: string) {
	return evaluateAchievements(f).filter((item) => item.key === key);
}

describe("definitions", () => {
	test("keys and slugs are unique and every metric exists", () => {
		expect(new Set(ACHIEVEMENTS.map((a) => a.key)).size).toBe(
			ACHIEVEMENTS.length,
		);
		expect(new Set(ACHIEVEMENTS.map((a) => a.slug)).size).toBe(
			ACHIEVEMENTS.length,
		);
		for (const definition of ACHIEVEMENTS) {
			expect(METRICS[definition.metric]).toBeDefined();
			expect(definition.thresholds.length).toBeGreaterThan(0);
			expect(definition.thresholds.length).toBeLessThanOrEqual(5);
			expect([...definition.thresholds]).toEqual(
				[...definition.thresholds].sort((a, b) => a - b),
			);
			expect(definition.needs.length).toBeGreaterThan(0);
		}
	});

	test("there are plenty of achievements, some hidden", () => {
		expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
		expect(
			ACHIEVEMENTS.filter((a) => a.isHidden).length,
		).toBeGreaterThanOrEqual(5);
	});

	test("descriptions read naturally", () => {
		const bookworm = getAchievement("bookworm");
		const first = bookworm?.thresholds[0] ?? 0;
		const third = bookworm?.thresholds[2] ?? 0;
		expect(bookworm && describeTier(bookworm, 1)).toBe(
			`Mark ${first} ${first === 1 ? "book" : "books"} as read.`,
		);
		expect(bookworm && describeTier(bookworm, 3)).toBe(
			`Mark ${third} books as read.`,
		);
		expect(bookworm && tierName(bookworm, 1)).toBe("Bronze");
		const single = getAchievement("founding_member");
		expect(single && tierName(single, 1)).toBe("");
	});
});

describe("evaluateAchievements", () => {
	test("earns tiers on the date the threshold was crossed", () => {
		const firstTier = getAchievement("bookworm")?.thresholds[0] ?? 0;
		const secondTier = getAchievement("bookworm")?.thresholds[1] ?? 0;
		const reads = Array.from({ length: secondTier + 1 }, (_, n) =>
			read(`b${n}`, new Date(Date.UTC(2026, 0, 1 + n, 10)).toISOString()),
		);
		const earned = earnedOf(facts({ reads }), "bookworm");
		expect(earned.map((item) => item.tier)).toEqual([1, 2]);
		expect(earned[0]?.earnedAt).toEqual(reads[firstTier - 1]?.at);
		expect(earned[1]?.earnedAt).toEqual(reads[secondTier - 1]?.at);
	});

	test("yearly achievements are tracked per year", () => {
		const reads = [
			...Array.from({ length: 12 }, (_, i) =>
				read(`a${i}`, "2026-02-01T10:00:00Z", {
					period: d(
						`2025-${String((i % 12) + 1).padStart(2, "0")}-15T00:00:00Z`,
					),
				}),
			),
			read("late", "2026-03-01T10:00:00Z"),
		];
		const earned = earnedOf(facts({ reads }), "busy_year");
		expect(earned.map((item) => item.periodKey)).toEqual(["2025"]);
		const steady = earnedOf(facts({ reads }), "steady_pace");
		expect(
			steady.filter((item) => item.periodKey === "2025").map((i) => i.tier),
		).toEqual([1, 2, 3]);
	});

	test("perfect attendance waits until the year is over", () => {
		const sittings = (year: number) =>
			Array.from({ length: 4 }, (_, i) => ({
				progress: "completed" as const,
				deadline: d(`${year}-0${i + 2}-20T00:00:00Z`),
				completedAt: d(`${year}-0${i + 2}-18T00:00:00Z`),
			}));
		const earned = earnedOf(
			facts({ participations: [...sittings(2025), ...sittings(2026)] }),
			"perfect_attendance",
		);
		expect(earned.map((item) => item.periodKey)).toEqual(["2025"]);
	});

	test("a did-not-finish spoils the perfect year", () => {
		const participations = [
			...Array.from({ length: 4 }, (_, i) => ({
				progress: "completed" as const,
				deadline: d(`2025-0${i + 2}-20T00:00:00Z`),
				completedAt: d(`2025-0${i + 2}-18T00:00:00Z`),
			})),
			{
				progress: "dnf" as const,
				deadline: d("2025-08-20T00:00:00Z"),
				completedAt: d("2025-08-10T00:00:00Z"),
			},
		];
		expect(earnedOf(facts({ participations }), "perfect_attendance")).toEqual(
			[],
		);
	});

	test("streaks reset on a missed sitting, redemption needs a dnf first", () => {
		const completed = (date: string) => ({
			progress: "completed" as const,
			deadline: d(date),
			completedAt: d(date),
		});
		const participations = [
			completed("2026-01-10T00:00:00Z"),
			completed("2026-02-10T00:00:00Z"),
			{
				progress: "dnf" as const,
				deadline: d("2026-03-10T00:00:00Z"),
				completedAt: d("2026-03-01T00:00:00Z"),
			},
			completed("2026-04-10T00:00:00Z"),
			completed("2026-05-10T00:00:00Z"),
			completed("2026-06-10T00:00:00Z"),
		];
		const f = facts({ participations });
		expect(earnedOf(f, "on_a_roll").map((item) => item.tier)).toEqual([1]);
		expect(earnedOf(f, "redemption_arc")).toHaveLength(1);
	});

	test("series finisher needs every book", () => {
		const f = facts({
			series: [{ id: "s1", bookIds: ["a", "b", "c"] }],
			reads: [
				read("a", "2026-01-01T00:00:00Z"),
				read("b", "2026-02-01T00:00:00Z"),
			],
		});
		expect(earnedOf(f, "series_finisher")).toEqual([]);
		const done = facts({
			series: f.series,
			reads: [...f.reads, read("c", "2026-03-01T00:00:00Z")],
		});
		expect(earnedOf(done, "series_finisher")[0]?.earnedAt).toEqual(
			d("2026-03-01T00:00:00Z"),
		);
	});

	test("distinct metrics and the loyal-fan streak", () => {
		const reads = [
			read("a", "2026-01-01T00:00:00Z", {
				authors: ["Orwell"],
				countries: ["GB"],
			}),
			read("b", "2026-01-02T00:00:00Z", {
				authors: ["Orwell"],
				countries: ["GB"],
			}),
			read("c", "2026-01-03T00:00:00Z", {
				authors: ["Orwell"],
				countries: ["US"],
			}),
			read("d", "2026-01-04T00:00:00Z", {
				authors: ["Huxley"],
				countries: ["GB"],
			}),
		];
		const f = facts({ reads });
		expect(earnedOf(f, "loyal_fan").map((item) => item.tier)).toEqual([1]);
		expect(earnedOf(f, "world_reader")).toEqual([]);
		const progress = achievementProgress(f).find(
			(item) => item.key === "world_reader",
		);
		expect(progress).toMatchObject({ value: 2, tier: 0, next: 3 });
	});

	test("founding member, anniversaries and hidden bonus achievements", () => {
		const f = facts({
			user: {
				createdAt: d("2024-10-01T00:00:00Z"),
				joinRank: 3,
				hasAvatar: true,
			},
			posts: [{ createdAt: d("2024-02-29T01:00:00Z"), commentTimes: [] }],
		});
		expect(earnedOf(f, "founding_member")).toHaveLength(1);
		expect(earnedOf(f, "still_here").map((item) => item.tier)).toEqual([1, 2]);
		expect(earnedOf(f, "leap_day")).toHaveLength(1);
		expect(
			earnedOf({ ...f, user: { ...f.user, joinRank: 99 } }, "founding_member"),
		).toEqual([]);
	});

	test("sections limit what is evaluated", () => {
		const needed = getAchievement("bookworm")?.thresholds[0] ?? 1;
		const f = facts({
			reads: Array.from({ length: needed }, (_, n) =>
				read(`a${n}`, new Date(Date.UTC(2026, 0, 1 + n)).toISOString()),
			),
		});
		const onlyPosts = evaluateAchievements(f, { sections: ["posts"] });
		expect(onlyPosts.some((item) => item.key === "bookworm")).toBe(false);
		const onlyReads = evaluateAchievements(f, { sections: ["reads"] });
		expect(onlyReads.some((item) => item.key === "bookworm")).toBe(true);
	});

	test("nothing is awarded from the future", () => {
		const f = facts({ reads: [read("a", "2027-01-01T00:00:00Z")] });
		expect(earnedOf(f, "bookworm")).toEqual([]);
	});
});

describe("views achievements", () => {
	const opened = (opens: number) => ({ opens, at: d("2026-10-20T10:00:00Z") });

	test("nothing without views", () => {
		expect(earnedOf(facts(), "seen")).toEqual([]);
		expect(earnedOf(facts(), "face_in_the_crowd")).toEqual([]);
	});

	test("the most opened post sets the tier", () => {
		const f = facts({
			views: {
				mostOpenedPost: opened(300),
				mostOpenedReview: null,
				profileOpens: null,
			},
		});
		expect(earnedOf(f, "seen").map((item) => item.tier)).toEqual([1, 2]);
		expect(earnedOf(f, "well_read_review")).toEqual([]);
	});

	test("reviews and profile have their own counts", () => {
		const f = facts({
			views: {
				mostOpenedPost: null,
				mostOpenedReview: opened(100),
				profileOpens: opened(25),
			},
		});
		expect(earnedOf(f, "well_read_review").map((item) => item.tier)).toEqual([
			1, 2,
		]);
		expect(earnedOf(f, "face_in_the_crowd").map((item) => item.tier)).toEqual([
			1,
		]);
	});

	test("they are earned at the time the count last changed", () => {
		const f = facts({
			views: {
				mostOpenedPost: opened(60),
				mostOpenedReview: null,
				profileOpens: null,
			},
		});
		expect(earnedOf(f, "seen")[0]?.earnedAt).toEqual(d("2026-10-20T10:00:00Z"));
	});

	test("they only need the views section", () => {
		for (const key of ["seen", "well_read_review", "face_in_the_crowd"]) {
			expect(getAchievement(key)?.needs).toEqual(["views"]);
		}
	});
});

describe("reading achievements", () => {
	test("nothing without reading activity", () => {
		for (const key of ["pace_setter", "page_by_page", "wishlist_keeper"]) {
			expect(earnedOf(facts(), key)).toEqual([]);
		}
	});

	test("finishing by the deadline counts each time", () => {
		const f = facts({
			reading: {
				onTimeFinishes: [
					d("2026-08-01T10:00:00Z"),
					d("2026-09-01T10:00:00Z"),
					d("2026-10-01T10:00:00Z"),
					d("2026-10-10T10:00:00Z"),
					d("2026-10-20T10:00:00Z"),
				],
				longestStreak: null,
				wishlistSize: 0,
				wishlistAt: null,
			},
		});
		expect(earnedOf(f, "pace_setter").map((item) => item.tier)).toEqual([1, 2]);
		expect(earnedOf(f, "pace_setter")[0]?.earnedAt).toEqual(
			d("2026-08-01T10:00:00Z"),
		);
	});

	test("the longest streak sets the tier", () => {
		const f = facts({
			reading: {
				onTimeFinishes: [],
				longestStreak: { days: 8, at: d("2026-10-18T10:00:00Z") },
				wishlistSize: 0,
				wishlistAt: null,
			},
		});
		expect(earnedOf(f, "page_by_page").map((item) => item.tier)).toEqual([
			1, 2,
		]);
	});

	test("the wishlist size sets the tier", () => {
		const f = facts({
			reading: {
				onTimeFinishes: [],
				longestStreak: null,
				wishlistSize: 16,
				wishlistAt: d("2026-10-02T10:00:00Z"),
			},
		});
		expect(earnedOf(f, "wishlist_keeper").map((item) => item.tier)).toEqual([
			1, 2,
		]);
	});

	test("they only need the reading section", () => {
		for (const key of ["pace_setter", "page_by_page", "wishlist_keeper"]) {
			expect(getAchievement(key)?.needs).toEqual(["reading"]);
		}
	});
});

describe("achievement texts", () => {
	test("every achievement has a name and a description in every language", () => {
		for (const locale of LOCALES) {
			for (const definition of ACHIEVEMENTS) {
				expect(achievementName(definition.key, locale).length).toBeGreaterThan(
					0,
				);
				for (let tier = 1; tier <= definition.thresholds.length; tier++) {
					expect(describeTier(definition, tier, locale).length).toBeGreaterThan(
						0,
					);
				}
			}
		}
	});

	test("Azerbaijani reads in Azerbaijani, with the number in place", () => {
		const bookworm = ACHIEVEMENTS.find((item) => item.key === "bookworm");
		expect(bookworm && describeTier(bookworm, 1, "az")).toBe(
			"3 kitabı oxunmuş kimi qeyd edin.",
		);
		expect(achievementName("bookworm", "az")).toBe("Kitab qurdu");
		expect(bookworm && tierName(bookworm, 3, "az")).toBe("Qızıl");
	});

	test("genre names follow the language", () => {
		expect(genreName("science_fiction")).toBe("Science Fiction");
		expect(genreName("science_fiction", "az")).toBe("Elmi fantastika");
	});
});
