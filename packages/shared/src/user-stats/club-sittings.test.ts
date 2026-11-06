import { describe, expect, it } from "bun:test";
import {
	type ClubParticipationRow,
	type ClubSittingRow,
	participantsPerSitting,
	shareBreakdown,
	sittingOutcomes,
	sittingsByMonth,
	summarizeSittings,
} from "./index";

const d = (iso: string) => new Date(`${iso}T12:00:00Z`);

const sitting = (
	id: string,
	over: Partial<ClubSittingRow> = {},
): ClubSittingRow => ({
	id,
	slug: id,
	status: "finished",
	createdAt: d("2026-01-10"),
	joinType: "public",
	bookPages: 300,
	bookTitle: `Book ${id}`,
	bookSlug: `book-${id}`,
	bookCoverId: null,
	...over,
});

const part = (
	sittingId: string,
	userId: string,
	progress: ClubParticipationRow["progress"],
	over: Partial<ClubParticipationRow> = {},
): ClubParticipationRow => ({
	sittingId,
	userId,
	progress,
	joinSource: "self",
	joinedAt: d("2026-01-12"),
	...over,
});

const sittings = [
	sitting("s1"),
	sitting("s2", {
		status: "reading",
		bookPages: 500,
		createdAt: d("2026-03-02"),
	}),
	sitting("s3", {
		status: "voting",
		bookPages: null,
		bookTitle: null,
		bookSlug: null,
	}),
];
const participations = [
	part("s1", "a", "completed"),
	part("s1", "b", "completed"),
	part("s1", "c", "dnf"),
	part("s2", "a", "in_progress", { joinedAt: d("2026-03-05") }),
	part("s2", "b", "not_started", { joinedAt: d("2026-03-06") }),
];
const votes = [
	{ sittingId: "s1", userId: "a" },
	{ sittingId: "s1", userId: "b" },
	{ sittingId: "s2", userId: "a" },
];

describe("summarizeSittings", () => {
	const summary = summarizeSittings(sittings, participations, votes);

	it("counts sittings by where they are", () => {
		expect(summary).toMatchObject({
			total: 3,
			finished: 1,
			reading: 1,
			voting: 1,
		});
	});

	it("counts people, participations and the average sitting size", () => {
		expect(summary).toMatchObject({
			participations: 5,
			participants: 3,
			averageParticipants: 2.5,
		});
	});

	it("works out completion and give-up rates over the participations that are over", () => {
		expect(summary).toMatchObject({
			completed: 2,
			didNotFinish: 1,
			inProgress: 1,
			notStarted: 1,
			completionRate: 67,
			dnfRate: 33,
		});
	});

	it("measures voting: votes, voters, turnout and votes per sitting", () => {
		// s1: 2 of 3 voted; s2: 1 of 2 voted -> (0.667 + 0.5) / 2 = 58%.
		expect(summary).toMatchObject({
			votes: 3,
			voters: 2,
			turnout: 58,
			averageVotesPerSitting: 1,
		});
	});

	it("says how long the chosen books are", () => {
		expect(summary.averageBookPages).toBe(400);
		expect(summary.longestBook).toEqual({ title: "Book s2", pages: 500 });
		expect(summary.shortestBook).toEqual({ title: "Book s1", pages: 300 });
	});

	it("has nothing to say about nothing", () => {
		expect(summarizeSittings([], [], [])).toMatchObject({
			total: 0,
			participations: 0,
			averageParticipants: 0,
			completionRate: null,
			turnout: null,
			averageBookPages: null,
			longestBook: null,
		});
	});
});

describe("sittingsByMonth", () => {
	it("counts sittings started and people joined in each month, empty months included", () => {
		const series = sittingsByMonth(
			sittings,
			participations,
			{ start: { year: 2026, month: 1 }, end: { year: 2026, month: 4 } },
			"en-US",
		);
		expect(series.map((m) => m.sittings)).toEqual([2, 0, 1, 0]);
		expect(series.map((m) => m.joined)).toEqual([3, 0, 2, 0]);
		expect(series[0]?.label).toBe("Jan");
	});
});

describe("participantsPerSitting", () => {
	it("buckets sittings by how many people were in them", () => {
		const out = participantsPerSitting(participations);
		expect(out.find((row) => row.label === "3")?.count).toBe(1);
		expect(out.find((row) => row.label === "2")?.count).toBe(1);
		expect(out.reduce((sum, row) => sum + row.count, 0)).toBe(2);
		const big = participantsPerSitting(
			Array.from({ length: 8 }, (_, i) => part("big", `u${i}`, "completed")),
		);
		expect(big.find((row) => row.label === "7+")?.count).toBe(1);
	});
});

describe("sittingOutcomes", () => {
	it("gives each sitting its size and completion rate", () => {
		const out = sittingOutcomes(participations);
		expect(out.get("s1")).toEqual({
			sittingId: "s1",
			participants: 3,
			completed: 2,
			rate: 67,
		});
		// Nobody has finished or given up in s2 yet.
		expect(out.get("s2")?.rate).toBeNull();
	});
});

describe("shareBreakdown", () => {
	it("orders by count with each one's share, dropping zeros", () => {
		expect(
			shareBreakdown([
				{ label: "Public", count: 6 },
				{ label: "Private", count: 2 },
				{ label: "Unlisted", count: 0 },
			]),
		).toEqual([
			{ label: "Public", count: 6, percent: 75 },
			{ label: "Private", count: 2, percent: 25 },
		]);
	});
});
