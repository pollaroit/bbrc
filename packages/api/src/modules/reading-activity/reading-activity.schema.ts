import {
	ACTIVITY_FORMATS,
	ACTIVITY_MODES,
	ACTIVITY_SORT_FIELDS,
	DATE_PRESETS,
	DAY_PARTS,
} from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

const Day = zod.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const Slugs = zod.array(zod.string().min(1).max(80)).max(30);
const Amount = zod.number().min(0).max(100_000);

/** The global filters: they cut the grid, the stats and the rankings the same way. */
export const ActivityFiltersSchema = zod.object({
	/** A preset, worked out on the server in the club time zone. `from` and `to` win over it. */
	range: zod.enum(DATE_PRESETS).optional(),
	from: Day.optional(),
	to: Day.optional(),
	books: Slugs.optional(),
	authors: Slugs.optional(),
	modes: zod.array(zod.enum(ACTIVITY_MODES)).max(3).optional(),
	formats: zod.array(zod.enum(ACTIVITY_FORMATS)).max(5).optional(),
	minMinutes: Amount.optional(),
	maxMinutes: Amount.optional(),
	minPages: Amount.optional(),
	maxPages: Amount.optional(),
	minPercent: Amount.optional(),
	maxPercent: Amount.optional(),
	/** Pages per hour. */
	minSpeed: Amount.optional(),
	maxSpeed: Amount.optional(),
	finished: zod.boolean().optional(),
	targetMet: zod.boolean().optional(),
	/** Only the member can use this one; it is dropped for everyone else. */
	dayParts: zod.array(zod.enum(DAY_PARTS)).max(4).optional(),
	weekdays: zod.array(zod.number().int().min(0).max(6)).max(7).optional(),
});

const Username = zod.string().min(3).max(20);

export const ActivityOverviewInputSchema = ActivityFiltersSchema.extend({
	username: Username,
});

export const ActivitySessionsInputSchema = ActivityFiltersSchema.extend({
	username: Username,
	sortBy: zod.enum(ACTIVITY_SORT_FIELDS).default("date"),
	sortDirection: zod.enum(["asc", "desc"]).default("desc"),
	offset: zod.number().int().min(0).default(0),
	limit: zod.number().int().min(1).max(48).default(24),
});

const Count = zod.number().int().min(0);

const ScopeSchema = zod.object({
	progress: zod.boolean(),
	clock: zod.boolean(),
	finish: zod.boolean(),
});

const SummarySchema = zod.object({
	seconds: Count,
	sessions: Count,
	/** Null when the member keeps their progress hidden from this viewer. */
	pagesGained: Count.nullable(),
	books: Count,
	averageSeconds: Count,
	longestSeconds: Count,
	activeDays: Count,
});

const RankingRowSchema = zod.object({
	key: zod.string(),
	label: zod.string(),
	seconds: Count,
	sessions: Count,
	pages: Count.nullable(),
	share: zod.number().min(0).max(1),
});

const RangeSchema = zod.object({ from: zod.string(), to: zod.string() });

export const ActivityOverviewOutputSchema = zod.discriminatedUnion("access", [
	/** A private profile seen by a non-friend: nothing at all. */
	zod.object({ access: zod.literal("closed") }),
	/** The section is closed: a few totals with no names, no dates and no filters. */
	zod.object({
		access: zod.literal("numbers"),
		numbers: zod.object({
			seconds: Count,
			sessions: Count,
			books: Count,
			averageSeconds: Count,
			currentStreak: Count,
		}),
	}),
	zod.object({
		access: zod.literal("full"),
		isOwner: zod.boolean(),
		scope: ScopeSchema,
		/** Today in the club's time zone. */
		today: zod.string(),
		summary: SummarySchema,
		streak: zod.object({ longest: Count, current: Count }),
		bests: zod.object({
			longestSession: zod
				.object({ seconds: Count, bookTitle: zod.string(), day: zod.string() })
				.nullable(),
			mostPagesSession: zod
				.object({ pages: Count, bookTitle: zod.string(), day: zod.string() })
				.nullable(),
			bestDay: zod.object({ day: zod.string(), seconds: Count }).nullable(),
			mostPagesDay: zod.object({ day: zod.string(), pages: Count }).nullable(),
			mostSessionsDay: zod
				.object({ day: zod.string(), sessions: Count })
				.nullable(),
			bestWeek: zod
				.object({ from: zod.string(), to: zod.string(), seconds: Count })
				.nullable(),
			bestMonth: zod.object({ month: zod.string(), seconds: Count }).nullable(),
			longestStreak: zod
				.object({ days: Count, from: zod.string(), to: zod.string() })
				.nullable(),
			fastestSpeed: zod
				.object({
					speed: zod.number(),
					bookTitle: zod.string(),
					day: zod.string(),
				})
				.nullable(),
			topBook: zod
				.object({ slug: zod.string(), title: zod.string(), seconds: Count })
				.nullable(),
		}),
		/** This range against the one before; null for All time. */
		comparison: zod
			.object({
				range: RangeSchema,
				previousRange: RangeSchema,
				current: zod.object({ seconds: Count, sessions: Count }),
				previous: zod.object({ seconds: Count, sessions: Count }),
			})
			.nullable(),
		/** Every day with reading over the last 12 months, with every filter but the date. */
		calendar: zod.array(
			zod.object({
				day: zod.string(),
				seconds: Count,
				sessions: Count,
				/** Null when the member keeps progress hidden. */
				pages: Count.nullable(),
				/** The books read that day, most time first. */
				books: zod.array(zod.string()),
			}),
		),
		/** Days from the start of the range to its end (for "12 of 30 days"). */
		rangeDays: Count,
		modes: zod.array(
			zod.object({
				mode: zod.enum(ACTIVITY_MODES),
				seconds: Count,
				sessions: Count,
				targetRate: zod.number().min(0).max(1).nullable(),
			}),
		),
		speedByMonth: zod.array(
			zod.object({ month: zod.string(), speed: zod.number() }),
		),
		usualSpeed: zod.number().nullable(),
		rankings: zod.object({
			books: zod.array(
				RankingRowSchema.extend({ coverId: zod.number().int().nullable() }),
			),
			days: zod.array(RankingRowSchema),
			weeks: zod.array(RankingRowSchema),
			months: zod.array(RankingRowSchema),
			weekdays: zod.array(RankingRowSchema),
			/** Only for the member. */
			dayParts: zod.array(RankingRowSchema).nullable(),
		}),
		/** What the filter bar can offer, from the member's own sessions. */
		facets: zod.object({
			books: zod.array(zod.object({ slug: zod.string(), name: zod.string() })),
			authors: zod.array(
				zod.object({ slug: zod.string(), name: zod.string() }),
			),
			formats: zod.array(zod.enum(ACTIVITY_FORMATS)),
			maxMinutes: Count,
			maxPages: Count,
			maxSpeed: Count,
			firstDay: zod.string().nullable(),
		}),
		/** Books finished: from readings, not sessions. Null when the viewer may not see Reads. */
		finishedBlock: zod
			.object({
				/** True while a filter that cannot apply to it is active. */
				hidden: zod.boolean(),
				count: Count,
				averageDays: zod.number().nullable(),
				pagesPerDay: zod.number().nullable(),
				/** Books finished per month, oldest first (`YYYY-MM`). */
				perMonth: zod.array(zod.object({ month: zod.string(), count: Count })),
				items: zod.array(
					zod.object({
						slug: zod.string(),
						title: zod.string(),
						authors: zod.array(zod.string()),
						coverId: zod.number().int().nullable(),
						finishedAt: zod.coerce.date(),
						days: Count,
						totalPages: zod.number().int().nullable(),
					}),
				),
			})
			.nullable(),
	}),
]);

const SessionItemSchema = zod.object({
	id: zod.string(),
	/** The club day it ended on. Never a clock time, except in `detail`. */
	day: zod.string(),
	bookSlug: zod.string(),
	title: zod.string(),
	coverId: zod.number().int().nullable(),
	authors: zod.array(zod.string()),
	seconds: Count,
	mode: zod.enum(ACTIVITY_MODES),
	targetMinutes: Count.nullable(),
	targetMet: zod.boolean().nullable(),
	format: zod.enum(ACTIVITY_FORMATS).nullable(),
	/** Null when progress is hidden or the book has no page data. */
	pages: Count.nullable(),
	percent: Count.nullable(),
	/** Where in the book the session began and ended, in percent. Null when progress is hidden. */
	percentFrom: Count.nullable(),
	percentTo: Count.nullable(),
	/** The pages the session started and ended on. Null when progress is hidden or there are none. */
	pageFrom: Count.nullable(),
	pageTo: Count.nullable(),
	speed: zod.number().nullable(),
	/** Null when the viewer may not see the member's Reads. */
	finished: zod.boolean().nullable(),
	/** Only for the member (and admins). */
	detail: zod
		.object({
			startedAt: zod.coerce.date(),
			endedAt: zod.coerce.date(),
			pageFrom: zod.number().int().nullable(),
			pageTo: zod.number().int().nullable(),
			percentFrom: Count,
			percentTo: Count.nullable(),
			sameDay: zod.array(
				zod.object({
					id: zod.string(),
					startedAt: zod.coerce.date(),
					seconds: Count,
					title: zod.string(),
				}),
			),
		})
		.nullable(),
});

export const ActivitySessionsOutputSchema = zod.object({
	items: zod.array(SessionItemSchema),
	total: Count,
	nextOffset: Count.nullable(),
	/** For the filters in force. */
	summary: SummarySchema,
	scope: ScopeSchema,
	isOwner: zod.boolean(),
	usualSpeed: zod.number().nullable(),
});

export type ActivityFiltersInput = z.infer<typeof ActivityFiltersSchema>;
export type ActivityOverviewInput = z.infer<typeof ActivityOverviewInputSchema>;
export type ActivitySessionsInput = z.infer<typeof ActivitySessionsInputSchema>;
export type ActivityOverviewOutput = z.infer<
	typeof ActivityOverviewOutputSchema
>;
export type ActivitySessionsOutput = z.infer<
	typeof ActivitySessionsOutputSchema
>;
export type ActivitySessionItem = z.infer<typeof SessionItemSchema>;
