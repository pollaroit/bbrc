import { describe, expect, it } from "bun:test";
import { ANONYMOUS_VIEWER, memberViewer } from "@bbrc/shared";
import {
	loadMemberStatsContext,
	resolveStatsPeriod,
} from "./member-stats-context";

const NOW = new Date(Date.UTC(2026, 5, 15));

describe("resolveStatsPeriod", () => {
	it("defaults to all time, and fills in a missing year or month with now", () => {
		expect(resolveStatsPeriod({}, NOW).type).toBe("life");
		expect(resolveStatsPeriod({ periodType: "year" }, NOW)).toMatchObject({
			type: "year",
			year: 2026,
		});
		expect(resolveStatsPeriod({ periodType: "month" }, NOW)).toMatchObject({
			type: "month",
			year: 2026,
			month: 6,
		});
	});

	it("refuses a period it cannot read", () => {
		expect(() =>
			resolveStatsPeriod({ periodType: "year", period: "nope" }, NOW),
		).toThrow("Invalid stats period");
	});
});

type FakeRead = {
	readEndYear: number | null;
	readEndMonth: number | null;
	createdAt: Date;
	bookId: string;
	book: { id: string };
};

function fakeDb(user: Record<string, unknown> | null, reads: FakeRead[]) {
	let readQueries = 0;
	const db = {
		user: { findUnique: async () => user },
		read: {
			findMany: async () => {
				readQueries += 1;
				return reads;
			},
		},
	};
	return { db: db as never, readQueries: () => readQueries };
}

const baseUser = {
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

const read = (
	bookId: string,
	year: number | null,
	month: number | null,
): FakeRead => ({
	readEndYear: year,
	readEndMonth: month,
	createdAt: new Date(),
	bookId,
	book: { id: bookId },
});

const stranger = memberViewer({ userId: "stranger", role: "user" });

describe("loadMemberStatsContext", () => {
	const reads = [
		read("a", 2025, 3),
		read("b", 2026, 1),
		read("c", 2026, 5),
		read("d", null, null),
	];

	it("keeps only the reads of the period, and separates the dated ones", async () => {
		const { db } = fakeDb(baseUser, reads);
		const year = await loadMemberStatsContext(
			db,
			{ username: "reader", periodType: "year", period: "2026" },
			stranger,
		);
		expect(year.reads.map((r) => r.bookId)).toEqual(["b", "c"]);

		const life = await loadMemberStatsContext(
			db,
			{ username: "reader" },
			stranger,
		);
		expect(life.reads).toHaveLength(4);
		expect(life.datedReads).toHaveLength(3);
		expect(life.firstDatedRead).toEqual({ year: 2025, month: 3 });
		expect(life.hasTimeAxis).toBe(true);
	});

	it("never loads reads for a viewer who may not see them", async () => {
		const { db, readQueries } = fakeDb(
			{ ...baseUser, readsVisibility: "private" },
			reads,
		);
		const context = await loadMemberStatsContext(
			db,
			{ username: "reader" },
			stranger,
		);
		expect(context.access.reads).toBe(false);
		expect(context.reads).toEqual([]);
		expect(readQueries()).toBe(0);
	});

	it("reads as not found for a missing or blocked member, and forbidden for a private profile", async () => {
		await expect(
			loadMemberStatsContext(fakeDb(null, []).db, { username: "x" }, stranger),
		).rejects.toThrow("not found");

		const blocked = memberViewer({
			userId: "stranger",
			role: "user",
			blockedIds: ["owner"],
		});
		await expect(
			loadMemberStatsContext(
				fakeDb(baseUser, []).db,
				{ username: "reader" },
				blocked,
			),
		).rejects.toThrow("not found");

		await expect(
			loadMemberStatsContext(
				fakeDb({ ...baseUser, profileVisibility: "private" }, []).db,
				{ username: "reader" },
				ANONYMOUS_VIEWER,
			),
		).rejects.toThrow("private");
	});

	it("says there is no time axis for All books", async () => {
		const { db } = fakeDb(baseUser, reads);
		const none = await loadMemberStatsContext(
			db,
			{ username: "reader", periodType: "none" },
			stranger,
		);
		expect(none.hasTimeAxis).toBe(false);
		expect(none.reads).toHaveLength(4);
	});
});
