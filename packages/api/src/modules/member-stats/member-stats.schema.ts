import zod from "zod";
import { GetUserStatsInputSchema } from "../user/user-stats.schema";

/** Every stats tab takes the member and the period, nothing else. */
export const MemberStatsInputSchema = GetUserStatsInputSchema;
export type MemberStatsInput = zod.infer<typeof MemberStatsInputSchema>;

const Count = zod.number().int().min(0);

export const StatsAccessSchema = zod.object({
	profile: zod.boolean(),
	reads: zod.boolean(),
	reviews: zod.boolean(),
	readingActivity: zod.boolean(),
	goals: zod.boolean(),
});

export const StatsBookRefSchema = zod.object({
	id: zod.string(),
	slug: zod.string(),
	title: zod.string(),
	authors: zod.array(zod.string()),
	coverId: Count.or(zod.number().int().negative()).nullable(),
});

export const StatsRankSchema = zod
	.object({ rank: Count, of: Count, topPercent: Count })
	.nullable();

const HistogramPointSchema = zod.object({ label: zod.string(), count: Count });

/** One number on the scoreboard, with what makes it feel alive: a change and a tiny chart. */
export const ScoreboardTileSchema = zod.object({
	id: zod.enum(["books", "pages", "time", "streak", "rating", "subject"]),
	label: zod.string(),
	/** The number as shown ("214", "12.4 h", "4.3"). */
	value: zod.string(),
	/** A word after the value ("books", "days"). */
	unit: zod.string().nullable(),
	/** One short line under it ("best 21 days", "of 2 ratings"). */
	note: zod.string().nullable(),
	/** Against the period before: null when there is no "before" or nothing to compare. */
	change: zod
		.object({
			percent: zod.number().nullable(),
			direction: zod.enum(["up", "down", "same"]),
		})
		.nullable(),
	/** A line of recent values for a sparkline. */
	spark: zod.array(zod.number()).nullable(),
	/** Or labelled bars (a rating spread, the top subjects). */
	bars: zod
		.array(zod.object({ label: zod.string(), value: zod.number() }))
		.nullable(),
	/** The tab and section it belongs to, so a click can go there. */
	to: zod.object({ tab: zod.string(), section: zod.string() }),
});

export const MemberStatsOverviewOutputSchema = zod.object({
	member: zod.object({
		username: zod.string(),
		name: zod.string(),
		image: zod.string().nullable(),
	}),
	title: zod.string(),
	periodType: zod.string(),
	periodLabel: zod.string(),
	firstDatedReadYear: zod.number().int().nullable(),
	access: StatsAccessSchema,
	/** How many sections are left out for this viewer (the one "some are private" note). */
	hiddenSections: Count,
	/** Where the member stands on books read in this period, among everyone. */
	rank: StatsRankSchema,
	catalog: zod.object({
		read: Count,
		total: Count,
		percent: zod.number().nullable(),
	}),
	scoreboard: zod.array(ScoreboardTileSchema),
	booksRead: zod.object({
		books: zod.array(
			StatsBookRefSchema.extend({ finished: zod.string().nullable() }),
		),
		total: Count,
		hasMore: zod.boolean(),
	}),
	readsOverTime: zod.object({
		mode: zod.enum(["month", "year", "hidden"]),
		points: zod.array(HistogramPointSchema),
	}),
});

const CumulativePointSchema = zod.object({
	monthKey: zod.string(),
	label: zod.string(),
	books: Count,
	pages: Count,
	authors: Count,
	countries: Count,
});

export const MemberStatsReadingOutputSchema = zod.object({
	access: StatsAccessSchema,
	hasTimeAxis: zod.boolean(),
	progress: zod.array(CumulativePointSchema).nullable(),
	pace: zod
		.object({
			series: zod.array(
				zod.object({
					monthKey: zod.string(),
					label: zod.string(),
					books: Count,
					pages: Count,
					rollingBooks: zod.number(),
					rollingPages: zod.number(),
				}),
			),
			year: zod
				.object({
					year: zod.number().int(),
					books: Count,
					pages: Count,
					monthsElapsed: Count,
					projectedBooks: Count.nullable(),
					projectedPages: Count.nullable(),
					previousYearBooks: Count,
					previousYearPages: Count,
				})
				.nullable(),
		})
		.nullable(),
	time: zod
		.discriminatedUnion("kind", [
			zod.object({
				kind: zod.literal("numbers"),
				seconds: Count,
				sessions: Count,
				books: Count,
				averageSeconds: Count,
				currentStreak: Count,
			}),
			zod.object({
				kind: zod.literal("full"),
				seconds: Count,
				sessions: Count,
				books: Count,
				averageSeconds: Count,
				longestSeconds: Count,
				activeDays: Count,
				pagesGained: Count.nullable(),
				usualSpeed: zod.number().nullable(),
				currentStreak: Count,
				longestStreak: Count,
			}),
		])
		.nullable(),
	pages: zod.array(HistogramPointSchema),
	publication: zod.object({
		year: zod.array(HistogramPointSchema),
		decade: zod.array(HistogramPointSchema),
		century: zod.array(HistogramPointSchema),
	}),
});

export type MemberStatsOverviewOutput = zod.infer<
	typeof MemberStatsOverviewOutputSchema
>;
export type MemberStatsReadingOutput = zod.infer<
	typeof MemberStatsReadingOutputSchema
>;
export type ScoreboardTile = zod.infer<typeof ScoreboardTileSchema>;
