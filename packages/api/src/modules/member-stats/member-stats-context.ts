import type { Database, Prisma } from "@bbrc/db";
import {
	compareMonths,
	parseUserStatsPeriod,
	readCountsForPeriod,
	readFinishMonth,
	readHasFinishMonth,
	resolveUserStatsPeriodBounds,
	type StatsAccess,
	type UserStatsMonth,
	type UserStatsPeriod,
	type UserStatsPeriodBounds,
	type Viewer,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import {
	memberAccessSelect,
	throwMemberUnavailable,
} from "../user/member-access";
import {
	decideMemberStatsAccess,
	type MemberStatsAccess,
} from "./member-stats-access";

/*
 * Everything a stats tab needs before it computes anything: who the member is, what
 * this viewer may see of them, the period, and the member's reads in that period.
 * Each tab (overview, reading, taste, ...) loads it once and works from it. Reads
 * are only loaded when the viewer may see them.
 */

export type StatsPeriodInput = {
	periodType?: "life" | "none" | "year" | "month" | "custom";
	period?: string;
	periodStart?: string;
	periodEnd?: string;
};

/** A missing year or month means "now", so a bare `?period_type=year` still works. */
export function resolveStatsPeriod(
	input: StatsPeriodInput,
	now = new Date(),
): UserStatsPeriod {
	const year = now.getUTCFullYear();
	const ym = `${year}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
	const type = input.periodType ?? "life";
	try {
		return parseUserStatsPeriod({
			periodType: type,
			period:
				type === "year" && !input.period?.trim()
					? String(year)
					: type === "month" && !input.period?.trim()
						? ym
						: input.period,
			periodStart:
				type === "custom" && !input.periodStart?.trim()
					? ym
					: input.periodStart,
			periodEnd:
				type === "custom" && !input.periodEnd?.trim() ? ym : input.periodEnd,
		});
	} catch {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid stats period" });
	}
}

/** The book columns the stats tabs read. */
export const statsBookSelect = {
	id: true,
	slug: true,
	title: true,
	authors: true,
	authorLinks: {
		orderBy: { position: "asc" },
		select: {
			author: {
				select: { id: true, slug: true, name: true, photoUrl: true },
			},
		},
	},
	pages: true,
	countries: true,
	subjects: true,
	publishedIn: true,
	averageRating: true,
	coverId: true,
	status: true,
	seriesMembership: {
		select: {
			series: {
				select: {
					id: true,
					slug: true,
					title: true,
					_count: { select: { books: true } },
				},
			},
		},
	},
} satisfies Prisma.BookSelect;

export type StatsBook = Prisma.BookGetPayload<{
	select: typeof statsBookSelect;
}>;

export type StatsRead = {
	readEndYear: number | null;
	readEndMonth: number | null;
	createdAt: Date;
	bookId: string;
	book: StatsBook;
};

export type MemberStatsContext = {
	member: { id: string; username: string; name: string; image: string | null };
	viewer: Viewer;
	/** What this viewer may see of the member. */
	access: StatsAccess;
	activity: Extract<MemberStatsAccess, { kind: "open" }>["activity"];
	period: UserStatsPeriod;
	bounds: UserStatsPeriodBounds;
	/** The first finish month among all the member's dated reads, whatever the period. */
	firstDatedRead: UserStatsMonth | null;
	/** Every read of the member, whatever the period (for "compared with before"). */
	allReads: StatsRead[];
	/** Reads counted for the period (undated ones only for "All time" and "All books"). */
	reads: StatsRead[];
	/** The same, without the undated ones: what time-based charts can use. */
	datedReads: StatsRead[];
	/** Reads and charts: "All books" has no time axis. */
	hasTimeAxis: boolean;
};

export async function loadMemberStatsContext(
	db: Database,
	input: { username: string } & StatsPeriodInput,
	viewer: Viewer,
): Promise<MemberStatsContext> {
	const period = resolveStatsPeriod(input);

	const user = await db.user.findUnique({
		where: { username: input.username },
		select: {
			...memberAccessSelect,
			username: true,
			name: true,
			image: true,
			showReadingProgress: true,
		},
	});
	if (!user) throwMemberUnavailable(input.username);

	const decision = decideMemberStatsAccess(viewer, user);
	if (decision.kind === "unavailable") throwMemberUnavailable(input.username);
	if (decision.kind === "closed") {
		throw new ORPCError("FORBIDDEN", {
			message: "This profile is private.",
			data: { isPrivate: true },
		});
	}

	// Reads are the heaviest thing to load, so a viewer who may not see them never triggers it.
	const allReads: StatsRead[] = decision.access.reads
		? await db.read.findMany({
				where: { userId: user.id },
				select: {
					readEndYear: true,
					readEndMonth: true,
					createdAt: true,
					bookId: true,
					book: { select: statsBookSelect },
				},
			})
		: [];

	const datedFinishes = allReads
		.map((read) => readFinishMonth(read))
		.filter((month): month is UserStatsMonth => month != null);
	const firstDatedRead =
		datedFinishes.length > 0
			? datedFinishes.reduce((min, month) =>
					compareMonths(month, min) < 0 ? month : min,
				)
			: null;

	const bounds = resolveUserStatsPeriodBounds(period, { firstDatedRead });
	const reads = allReads.filter((read) => {
		const gate = readCountsForPeriod(read, period, bounds);
		return gate.inPeriod || gate.includeUndatedInTotals;
	});

	return {
		member: {
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image ?? null,
		},
		viewer,
		access: decision.access,
		activity: decision.activity,
		period,
		bounds,
		firstDatedRead,
		allReads,
		reads,
		datedReads: reads.filter((read) => readHasFinishMonth(read)),
		hasTimeAxis: period.type !== "none",
	};
}
