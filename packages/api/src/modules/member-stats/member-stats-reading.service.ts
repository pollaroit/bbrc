import type { Database } from "@bbrc/db";
import {
	bookAuthorEntries,
	computeCumulativeReadSeries,
	histogramFromValues,
	monthlyPaceSeries,
	pagesBucketLabel,
	publicationHistogram,
	readFinishMonth,
	USER_STATS_PAGE_BUCKETS,
	type Viewer,
	yearPaceSummary,
} from "@bbrc/shared";
import { getActivityOverview } from "../reading-activity/reading-activity.service";
import type {
	MemberStatsInput,
	MemberStatsReadingOutput,
} from "./member-stats.schema";
import { loadMemberStatsContext } from "./member-stats-context";
import { dayRangeOfBounds } from "./member-stats-helpers";
import type { OverviewDeps } from "./member-stats-overview.service";

const defaultDeps: OverviewDeps = { activity: getActivityOverview };

export async function getMemberStatsReading(
	db: Database,
	viewer: Viewer,
	input: MemberStatsInput,
	deps: OverviewDeps = defaultDeps,
): Promise<MemberStatsReadingOutput> {
	const ctx = await loadMemberStatsContext(db, input, viewer);
	const { access, reads, datedReads, period, bounds, hasTimeAxis } = ctx;

	const dated = datedReads.map((read) => ({
		finish: readFinishMonth(read)!,
		pages: read.book.pages,
		authorKeys: bookAuthorEntries(read.book).map((author) => author.key),
		countries: read.book.countries,
	}));

	const progress =
		access.reads && hasTimeAxis
			? computeCumulativeReadSeries(dated, bounds, "en-US")
			: null;

	// The year summary looks at every dated read, so it can compare with the year before.
	let year: ReturnType<typeof yearPaceSummary> | null = null;
	if (
		access.reads &&
		hasTimeAxis &&
		(period.type === "year" || period.type === "life")
	) {
		const now = bounds.end;
		year = yearPaceSummary(
			ctx.allReads.flatMap((read) => {
				const finish = readFinishMonth(read);
				return finish ? [{ finish, pages: read.book.pages }] : [];
			}),
			period.type === "year" ? period.year : now.year,
			now,
		);
	}
	const pace =
		access.reads && hasTimeAxis
			? { series: monthlyPaceSeries(dated, bounds, 3, "en-US"), year }
			: null;

	let time: MemberStatsReadingOutput["time"] = null;
	if (access.readingActivity) {
		const activity = await deps.activity(db, viewer, {
			username: ctx.member.username,
			...(hasTimeAxis && period.type !== "life"
				? dayRangeOfBounds(bounds)
				: {}),
		});
		if (activity.access === "numbers") {
			time = { kind: "numbers", ...activity.numbers };
		} else if (activity.access === "full") {
			time = {
				kind: "full",
				seconds: activity.summary.seconds,
				sessions: activity.summary.sessions,
				books: activity.summary.books,
				averageSeconds: activity.summary.averageSeconds,
				longestSeconds: activity.summary.longestSeconds,
				activeDays: activity.summary.activeDays,
				pagesGained: activity.summary.pagesGained,
				usualSpeed: activity.usualSpeed,
				currentStreak: activity.streak.current,
				longestStreak: activity.streak.longest,
			};
		}
	}

	// "All books" has no time axis, so every read counts; otherwise only the dated ones.
	const analytics = hasTimeAxis ? datedReads : reads;
	const years = analytics
		.map((read) => read.book.publishedIn)
		.filter((value) => Number.isFinite(value) && value > 0);

	return {
		access,
		hasTimeAxis,
		progress,
		pace,
		time,
		pages: access.reads
			? histogramFromValues(
					analytics.map((read) => pagesBucketLabel(read.book.pages)),
					USER_STATS_PAGE_BUCKETS,
				)
			: [],
		publication: access.reads
			? {
					year: publicationHistogram(years, "year"),
					decade: publicationHistogram(years, "decade"),
					century: publicationHistogram(years, "century"),
				}
			: { year: [], decade: [], century: [] },
	};
}
