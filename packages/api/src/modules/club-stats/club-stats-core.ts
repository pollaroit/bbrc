import type { Database, Prisma } from "@bbrc/db";
import {
	compareMonths,
	readCountsForPeriod,
	readFinishMonth,
	readHasFinishMonth,
	resolveUserStatsPeriodBounds,
	type UserStatsMonth,
	type UserStatsPeriod,
	type UserStatsPeriodBounds,
} from "@bbrc/shared";
import {
	resolveStatsPeriod,
	type StatsBook,
	statsBookSelect,
} from "../member-stats/member-stats-context";
import { createdAtRangeOfBounds } from "../member-stats/member-stats-helpers";
import type { ClubStatsInput } from "./club-stats.schema";

/** How long a club stats page is kept before it is worked out again. */
export const CLUB_STATS_TTL_SECONDS = 60 * 60;

export type ClubRead = {
	userId: string;
	bookId: string;
	readEndYear: number | null;
	readEndMonth: number | null;
};

export type ClubStatsContext = {
	period: UserStatsPeriod;
	bounds: UserStatsPeriodBounds;
	hasTimeAxis: boolean;
	firstDatedRead: UserStatsMonth | null;
	/** Reads counted for the period, by every member. */
	reads: ClubRead[];
	/** The same, without the undated ones: what time-based charts can use. */
	datedReads: ClubRead[];
	books: Map<string, StatsBook>;
	/** `createdAt` bounds for rows without a finish month (reviews, posts); none for All time. */
	range: { createdAt: { gte: Date; lt: Date } } | Record<string, never>;
};

/** The same period rules as a member's page, over everyone's reads. Counts include every member. */
export async function loadClubStatsContext(
	db: Database,
	input: ClubStatsInput,
): Promise<ClubStatsContext> {
	const period = resolveStatsPeriod({
		periodType: input.periodType,
		period: input.period,
	});

	const allReads: ClubRead[] = await db.read.findMany({
		select: {
			userId: true,
			bookId: true,
			readEndYear: true,
			readEndMonth: true,
		},
	});

	const dated = allReads
		.map((read) => readFinishMonth(read))
		.filter((month): month is UserStatsMonth => month != null);
	const firstDatedRead = dated.length
		? dated.reduce((min, month) =>
				compareMonths(month, min) < 0 ? month : min,
			)
		: null;

	const bounds = resolveUserStatsPeriodBounds(period, { firstDatedRead });
	const reads = allReads.filter((read) => {
		const gate = readCountsForPeriod(read, period, bounds);
		return gate.inPeriod || gate.includeUndatedInTotals;
	});

	const bookIds = [...new Set(reads.map((read) => read.bookId))];
	const bookRows = bookIds.length
		? await db.book.findMany({
				where: { id: { in: bookIds } },
				select: statsBookSelect,
			})
		: [];

	const hasTimeAxis = period.type !== "none";
	return {
		period,
		bounds,
		hasTimeAxis,
		firstDatedRead,
		reads,
		datedReads: reads.filter((read) => readHasFinishMonth(read)),
		books: new Map(bookRows.map((book) => [book.id, book])),
		range:
			hasTimeAxis && period.type !== "life"
				? { createdAt: createdAtRangeOfBounds(bounds) }
				: {},
	};
}

/** The book behind each read, so a book read by three members counts three times. */
export function booksOfReads(
	ctx: Pick<ClubStatsContext, "books">,
	reads: readonly ClubRead[],
): StatsBook[] {
	return reads.flatMap((read) => {
		const book = ctx.books.get(read.bookId);
		return book ? [book] : [];
	});
}

export type { Prisma };
