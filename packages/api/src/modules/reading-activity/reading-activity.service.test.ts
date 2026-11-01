import { describe, expect, test } from "bun:test";
import type { Database } from "@bbrc/db";
import { ANONYMOUS_VIEWER, memberViewer } from "@bbrc/shared";
import {
	getActivityOverview,
	getActivitySessions,
} from "./reading-activity.service";

type Owner = Record<string, unknown>;

function ownerRow(over: Owner = {}): Owner {
	return {
		id: "owner",
		username: "reader",
		profileVisibility: "public",
		readsVisibility: "public",
		reviewsVisibility: "public",
		favoritesVisibility: "public",
		goalsVisibility: "public",
		readingVisibility: "public",
		readingActivityVisibility: "public",
		showReadingProgress: true,
		...over,
	};
}

const book = (slug: string, title: string) => ({
	id: `id-${slug}`,
	slug,
	title,
	coverId: null,
	authorLinks: [{ author: { slug: "an-author", name: "An Author" } }],
});

function sessionRow(
	id: string,
	endedAt: string,
	minutes: number,
	slug = "dune",
) {
	const end = new Date(endedAt);
	return {
		id,
		startedAt: new Date(end.getTime() - minutes * 60_000),
		endedAt: end,
		activeSeconds: minutes * 60,
		mode: "free",
		targetMinutes: null,
		pageFrom: 10,
		pageTo: 40,
		percentFrom: 5,
		percentTo: 100,
		reading: {
			editionFormat: "paperback",
			book: book(slug, slug === "dune" ? "Dune" : "Emma"),
		},
	};
}

/** A database that knows one member, their sessions and their finished readings. */
function fakeDb(owner: Owner) {
	const sessions = [
		sessionRow("s1", "2026-11-02T10:00:00Z", 30),
		sessionRow("s2", "2026-11-03T15:00:00Z", 20, "emma"),
	];
	return {
		user: { findUnique: async () => owner },
		readingSession: { findMany: async () => sessions },
		reading: { findMany: async () => [] },
	} as unknown as Database;
}

const stranger = memberViewer({ userId: "stranger", isAdmin: false });
const self = memberViewer({ userId: "owner", isAdmin: false });
const input = { username: "reader" } as never;

async function overview(owner: Owner, viewer = stranger, extra = {}) {
	return getActivityOverview(fakeDb(owner), viewer, {
		...(input as object),
		...extra,
	} as never);
}

describe("what a viewer receives", () => {
	test("the member sees everything, including time of day", async () => {
		const result = await overview(ownerRow(), self);
		if (result.access !== "full") throw new Error("expected full");
		expect(result.isOwner).toBe(true);
		expect(result.rankings.dayParts).not.toBeNull();
		expect(result.summary.pagesGained).toBe(60);
	});

	test("someone else gets no time of day and no pages when progress is hidden", async () => {
		const result = await overview(ownerRow({ showReadingProgress: false }));
		if (result.access !== "full") throw new Error("expected full");
		expect(result.scope).toEqual({
			progress: false,
			clock: false,
			finish: true,
		});
		expect(result.rankings.dayParts).toBeNull();
		expect(result.summary.pagesGained).toBeNull();
		expect(result.bests.fastestSpeed).toBeNull();
		expect(result.speedByMonth).toEqual([]);
		expect(result.usualSpeed).toBeNull();
		expect(result.facets.maxPages).toBe(0);
		for (const row of result.rankings.books) expect(row.pages).toBeNull();
	});

	test("a time-of-day filter is ignored for someone else", async () => {
		// Both sessions are in the afternoon (club time), so an owner filter for the
		// morning would leave nothing; a stranger's must be dropped, leaving both.
		const stranger1 = await overview(ownerRow(), stranger, {
			dayParts: ["morning"],
		});
		const owner1 = await overview(ownerRow(), self, { dayParts: ["morning"] });
		if (stranger1.access !== "full" || owner1.access !== "full") {
			throw new Error("expected full");
		}
		expect(stranger1.summary.sessions).toBe(2);
		expect(owner1.summary.sessions).toBe(0);
	});

	test("a pages filter is ignored when progress is hidden", async () => {
		const result = await overview(
			ownerRow({ showReadingProgress: false }),
			stranger,
			{ minPages: 1000 },
		);
		if (result.access !== "full") throw new Error("expected full");
		expect(result.summary.sessions).toBe(2);
	});

	test("the calendar keeps every day while a date filter narrows the rest", async () => {
		const result = await overview(ownerRow(), self, {
			from: "2026-11-02",
			to: "2026-11-02",
		});
		if (result.access !== "full") throw new Error("expected full");
		expect(result.summary.sessions).toBe(1);
		expect(result.calendar.map((d) => d.day)).toEqual([
			"2026-11-02",
			"2026-11-03",
		]);
		expect(result.rangeDays).toBe(1);
	});

	test("page-based bests are hidden with progress, the rest stay", async () => {
		const hidden = await overview(ownerRow({ showReadingProgress: false }));
		if (hidden.access !== "full") throw new Error("expected full");
		expect(hidden.bests.mostPagesSession).toBeNull();
		expect(hidden.bests.mostPagesDay).toBeNull();
		expect(hidden.bests.fastestSpeed).toBeNull();
		expect(hidden.bests.bestDay).not.toBeNull();
		expect(hidden.bests.topBook).not.toBeNull();
		for (const day of hidden.calendar) expect(day.pages).toBeNull();

		const shown = await overview(ownerRow());
		if (shown.access !== "full") throw new Error("expected full");
		expect(shown.bests.mostPagesSession?.pages).toBe(30);
	});

	test("a closed section gives five numbers and nothing else", async () => {
		const result = await overview(
			ownerRow({ readingActivityVisibility: "private" }),
		);
		expect(result.access).toBe("numbers");
		if (result.access !== "numbers") return;
		expect(Object.keys(result).sort()).toEqual(["access", "numbers"]);
		expect(Object.keys(result.numbers).sort()).toEqual([
			"averageSeconds",
			"books",
			"currentStreak",
			"seconds",
			"sessions",
		]);
		expect(result.numbers.books).toBe(2);
	});

	test("a private profile is closed to a stranger and to anonymous visitors", async () => {
		const o = ownerRow({ profileVisibility: "private" });
		expect((await overview(o)).access).toBe("closed");
		expect((await overview(o, ANONYMOUS_VIEWER as never)).access).toBe(
			"closed",
		);
	});

	test("blocked reads as not found", async () => {
		const blocked = memberViewer({
			userId: "stranger",
			isAdmin: false,
			blockedIds: ["owner"],
		});
		await expect(overview(ownerRow(), blocked)).rejects.toThrow();
	});
});

describe("the sessions grid", () => {
	const sessions = (owner: Owner, viewer = stranger, extra = {}) =>
		getActivitySessions(fakeDb(owner), viewer, {
			username: "reader",
			sortBy: "date",
			sortDirection: "desc",
			offset: 0,
			limit: 24,
			...extra,
		} as never);

	test("others get the day but never a clock time", async () => {
		const result = await sessions(ownerRow());
		expect(result.items).toHaveLength(2);
		for (const item of result.items) {
			expect(item.detail).toBeNull();
			expect(item.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});

	test("the member gets the exact times and the day's other sessions", async () => {
		const result = await sessions(ownerRow(), self);
		expect(result.items[0]?.detail).not.toBeNull();
		expect(result.isOwner).toBe(true);
	});

	test("pages, percent and speed are blanked when progress is hidden", async () => {
		const result = await sessions(ownerRow({ showReadingProgress: false }));
		for (const item of result.items) {
			expect(item.pages).toBeNull();
			expect(item.percent).toBeNull();
			expect(item.percentFrom).toBeNull();
			expect(item.speed).toBeNull();
		}
	});

	test("a progress sort falls back to date when progress is hidden", async () => {
		const result = await sessions(
			ownerRow({ showReadingProgress: false }),
			stranger,
			{ sortBy: "pages", sortDirection: "asc" },
		);
		// Date, ascending: the earlier session first.
		expect(result.items[0]?.id).toBe("s1");
	});

	test("the finished marker needs permission to see Reads", async () => {
		const hidden = await sessions(ownerRow({ readsVisibility: "private" }));
		for (const item of hidden.items) expect(item.finished).toBeNull();
		const shown = await sessions(ownerRow());
		expect(shown.items[0]?.finished).toBe(true);
	});

	test("a closed section is forbidden here", async () => {
		await expect(
			sessions(ownerRow({ readingActivityVisibility: "private" })),
		).rejects.toThrow();
	});

	test("pages of the grid carry on from where the last one ended", async () => {
		const first = await sessions(ownerRow(), stranger, { limit: 1 });
		expect(first.items).toHaveLength(1);
		expect(first.nextOffset).toBe(1);
		const second = await sessions(ownerRow(), stranger, {
			limit: 1,
			offset: first.nextOffset,
		});
		expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
		expect(second.nextOffset).toBeNull();
	});
});
