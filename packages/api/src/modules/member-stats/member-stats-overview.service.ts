import type { Database, Prisma } from "@bbrc/db";
import {
	formatUserStatsPeriodTitle,
	hiddenStatsSectionCount,
	monthlyPaceSeries,
	previousStatsBounds,
	rankOf,
	readFinishMonth,
	readIsInBounds,
	readsByMonthHistogram,
	readsByYearHistogram,
	subjectBreakdown,
	topPercent,
	type Viewer,
} from "@bbrc/shared";
import type {
	ActivityOverviewInput,
	ActivityOverviewOutput,
} from "../reading-activity/reading-activity.schema";
import { getActivityOverview } from "../reading-activity/reading-activity.service";
import { reviewVisibleWhere } from "../visibility/visibility-resources";
import type {
	MemberStatsInput,
	MemberStatsOverviewOutput,
	ScoreboardTile,
} from "./member-stats.schema";
import { loadMemberStatsContext, type StatsRead } from "./member-stats-context";
import {
	changeBetween,
	createdAtRangeOfBounds,
	dayRangeOfBounds,
	loadReadCountsByMember,
	statsPeriodLabel,
} from "./member-stats-helpers";

/** The finished-books grid shows this many covers; the rest is one click away on the reads page. */
const GRID_LIMIT = 48;
/** A sparkline stays readable with this many months at most. */
const SPARK_MONTHS = 36;

export type OverviewDeps = {
	/** Reading time and streak come from the reading-activity module, which owns their privacy. */
	activity: (
		db: Database,
		viewer: Viewer,
		input: ActivityOverviewInput,
	) => Promise<ActivityOverviewOutput>;
};

const defaultDeps: OverviewDeps = { activity: getActivityOverview };

const sumPages = (reads: readonly StatsRead[]) =>
	reads.reduce((total, read) => total + read.book.pages, 0);

function formatHours(seconds: number): { value: string; unit: string } {
	if (seconds < 3600)
		return { value: String(Math.round(seconds / 60)), unit: "min" };
	const hours = seconds / 3600;
	return {
		value: hours >= 100 ? String(Math.round(hours)) : hours.toFixed(1),
		unit: "h",
	};
}

function finishedLabel(read: StatsRead): string | null {
	const finish = readFinishMonth(read);
	if (!finish) return null;
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(finish.year, finish.month - 1, 1)));
}

export async function getMemberStatsOverview(
	db: Database,
	viewer: Viewer,
	input: MemberStatsInput,
	deps: OverviewDeps = defaultDeps,
): Promise<MemberStatsOverviewOutput> {
	const ctx = await loadMemberStatsContext(db, input, viewer);
	const { access, reads, datedReads, period, bounds, hasTimeAxis } = ctx;

	const previous = hasTimeAxis ? previousStatsBounds(period, bounds) : null;
	const previousReads = previous
		? ctx.allReads.filter((read) => readIsInBounds(read, previous))
		: null;

	const monthly = hasTimeAxis
		? monthlyPaceSeries(
				datedReads.map((read) => ({
					finish: readFinishMonth(read)!,
					pages: read.book.pages,
				})),
				bounds,
			).slice(-SPARK_MONTHS)
		: [];

	const [catalogTotal, readCounts, reviews, activity] = await Promise.all([
		access.reads ? db.book.count() : Promise.resolve(0),
		access.reads && hasTimeAxis
			? loadReadCountsByMember(db, period, bounds)
			: Promise.resolve([] as number[]),
		access.reviews
			? loadRatings(db, viewer, ctx)
			: Promise.resolve([] as number[]),
		access.readingActivity
			? deps.activity(db, viewer, {
					username: ctx.member.username,
					...(hasTimeAxis && period.type !== "life"
						? dayRangeOfBounds(bounds)
						: {}),
				})
			: Promise.resolve(null),
	]);

	const tiles: ScoreboardTile[] = [];

	if (access.reads) {
		tiles.push({
			id: "books",
			label: "Books read",
			value: String(reads.length),
			unit: reads.length === 1 ? "book" : "books",
			note: null,
			change: changeBetween(reads.length, previousReads?.length ?? null),
			spark: monthly.length > 1 ? monthly.map((month) => month.books) : null,
			bars: null,
			to: { tab: "overview", section: "reads-over-time" },
		});
		tiles.push({
			id: "pages",
			label: "Pages read",
			value: sumPages(reads).toLocaleString("en-US"),
			unit: "pages",
			note: null,
			change: changeBetween(
				sumPages(reads),
				previousReads ? sumPages(previousReads) : null,
			),
			spark: monthly.length > 1 ? monthly.map((month) => month.pages) : null,
			bars: null,
			to: { tab: "reading", section: "pace" },
		});
	}

	if (activity && activity.access !== "closed") {
		const seconds =
			activity.access === "numbers"
				? activity.numbers.seconds
				: activity.summary.seconds;
		const time = formatHours(seconds);
		tiles.push({
			id: "time",
			label: "Time read",
			value: time.value,
			unit: time.unit,
			note:
				activity.access === "numbers" || period.type === "life"
					? "all time"
					: null,
			change: null,
			spark: null,
			bars: null,
			to: { tab: "reading", section: "reading-time" },
		});
		const streak =
			activity.access === "numbers"
				? { current: activity.numbers.currentStreak, longest: null }
				: {
						current: activity.streak.current,
						longest: activity.streak.longest,
					};
		tiles.push({
			id: "streak",
			label: "Reading streak",
			value: String(streak.current),
			unit: streak.current === 1 ? "day" : "days",
			note: streak.longest ? `best ${streak.longest} days` : null,
			change: null,
			spark: null,
			bars: null,
			to: { tab: "reading", section: "reading-time" },
		});
	}

	if (access.reviews && reviews.length > 0) {
		const average =
			reviews.reduce((sum, rating) => sum + rating, 0) / reviews.length;
		const spread = [1, 2, 3, 4, 5].map((star) => ({
			label: `${star}★`,
			value: reviews.filter((rating) => Math.round(rating) === star).length,
		}));
		tiles.push({
			id: "rating",
			label: "Average rating given",
			value: average.toFixed(1),
			unit: "★",
			note: `from ${reviews.length} ${reviews.length === 1 ? "rating" : "ratings"}`,
			change: null,
			spark: null,
			bars: spread,
			to: { tab: "community", section: "reviews" },
		});
	}

	if (access.reads) {
		const subjects = subjectBreakdown(reads.map((read) => read.book.subjects));
		const top = subjects[0];
		if (top) {
			tiles.push({
				id: "subject",
				label: "Favourite subject",
				value: top.subject,
				unit: null,
				note: `${top.count} ${top.count === 1 ? "book" : "books"}`,
				change: null,
				spark: null,
				bars: subjects.slice(0, 3).map((row) => ({
					label: row.subject,
					value: row.count,
				})),
				to: { tab: "taste", section: "subjects" },
			});
		}
	}

	const readsNewestFirst = [...reads].sort((a, b) => {
		const aFinish = readFinishMonth(a);
		const bFinish = readFinishMonth(b);
		if (!aFinish && !bFinish) return 0;
		if (!aFinish) return 1;
		if (!bFinish) return -1;
		return bFinish.year - aFinish.year || bFinish.month - aFinish.month;
	});

	const finishes = datedReads.map((read) => ({
		finish: readFinishMonth(read)!,
	}));
	const multiYear = bounds.start.year !== bounds.end.year;
	const timeline =
		!hasTimeAxis || period.type === "month"
			? { mode: "hidden" as const, points: [] }
			: period.type === "year" || (period.type === "custom" && !multiYear)
				? { mode: "month" as const, points: readsByMonthHistogram(finishes) }
				: { mode: "year" as const, points: readsByYearHistogram(finishes) };

	const rank =
		access.reads && hasTimeAxis ? rankOf(datedReads.length, readCounts) : null;

	return {
		member: {
			username: ctx.member.username,
			name: ctx.member.name,
			image: ctx.member.image,
		},
		title: formatUserStatsPeriodTitle(ctx.member.name, period),
		periodType: period.type,
		periodLabel: statsPeriodLabel(period),
		firstDatedReadYear: ctx.firstDatedRead?.year ?? null,
		access,
		hiddenSections: hiddenStatsSectionCount(access),
		rank: rank ? { ...rank, topPercent: topPercent(rank) } : null,
		catalog: {
			read: reads.length,
			total: catalogTotal,
			percent:
				catalogTotal > 0
					? Math.min(100, Math.round((reads.length / catalogTotal) * 1000) / 10)
					: null,
		},
		scoreboard: tiles,
		booksRead: {
			books: readsNewestFirst.slice(0, GRID_LIMIT).map((read) => ({
				id: read.book.id,
				slug: read.book.slug,
				title: read.book.title,
				authors: read.book.authors,
				coverId: read.book.coverId,
				finished: finishedLabel(read),
			})),
			total: reads.length,
			hasMore: reads.length > GRID_LIMIT,
		},
		readsOverTime: timeline,
	};
}

/** The member's ratings the viewer may see, for reviews written in the period. */
async function loadRatings(
	db: Database,
	viewer: Viewer,
	ctx: Awaited<ReturnType<typeof loadMemberStatsContext>>,
): Promise<number[]> {
	const { period, bounds, hasTimeAxis } = ctx;
	const rows = await db.feedback.findMany({
		where: {
			AND: [reviewVisibleWhere(viewer) as Prisma.FeedbackWhereInput],
			authorId: ctx.member.id,
			...(hasTimeAxis && period.type !== "life"
				? { createdAt: createdAtRangeOfBounds(bounds) }
				: {}),
		},
		select: { rating: true },
	});
	return rows.map((row) => row.rating);
}
