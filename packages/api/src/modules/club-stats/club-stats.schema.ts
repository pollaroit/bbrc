import zod from "zod";
import {
	ScoreboardTileSchema,
	StatsBookRefSchema,
} from "../member-stats/member-stats.schema";

/** The club page has fewer periods than a member's: All time, All books or one year. */
export const ClubStatsInputSchema = zod.object({
	periodType: zod.enum(["life", "none", "year"]).optional().default("life"),
	period: zod.string().optional(),
});
export type ClubStatsInput = zod.infer<typeof ClubStatsInputSchema>;

const Count = zod.number().int().min(0);
const Point = zod.object({ label: zod.string(), count: Count });
const ActivityMonth = zod.object({
	monthKey: zod.string(),
	label: zod.string(),
	added: Count,
	total: Count,
});

export const ClubStatsOverviewSchema = zod.object({
	title: zod.string(),
	periodLabel: zod.string(),
	firstYear: zod.number().int().nullable(),
	members: Count,
	scoreboard: zod.array(ScoreboardTileSchema),
	readsOverTime: zod.object({
		mode: zod.enum(["month", "year", "hidden"]),
		points: zod.array(Point),
	}),
	/** Members who finished the most books. A private profile shows as an anonymous row. */
	topReaders: zod.array(
		zod.object({
			rank: Count,
			books: Count,
			name: zod.string().nullable(),
			username: zod.string().nullable(),
			image: zod.string().nullable(),
		}),
	),
});

export const ClubStatsReadingSchema = zod.object({
	hasTimeAxis: zod.boolean(),
	progress: zod
		.array(
			zod.object({
				monthKey: zod.string(),
				label: zod.string(),
				books: Count,
				pages: Count,
				authors: Count,
				countries: Count,
			}),
		)
		.nullable(),
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
		})
		.nullable(),
	time: zod.object({
		seconds: Count,
		sessions: Count,
		readers: Count,
		averageSeconds: Count,
	}),
	pages: zod.array(Point),
	publication: zod.object({
		year: zod.array(Point),
		decade: zod.array(Point),
		century: zod.array(Point),
	}),
});

const ClubAuthorRow = zod.object({
	key: zod.string(),
	label: zod.string(),
	slug: zod.string().nullable(),
	photoUrl: zod.string().nullable(),
	count: Count,
	/** The average of the club's ratings of this author's books (null when none are rated). */
	average: zod.number().nullable(),
});

export const ClubStatsTasteSchema = zod.object({
	subjects: zod.array(
		zod.object({ subject: zod.string(), count: Count, percent: zod.number() }),
	),
	/** Subjects whose books the club rated highest, with at least two rated books. */
	subjectsRated: zod.array(
		zod.object({ subject: zod.string(), average: zod.number(), count: Count }),
	),
	authors: zod.array(ClubAuthorRow),
	/** Authors whose books the club rated highest, with at least two rated books. */
	authorsRated: zod.array(ClubAuthorRow),
	countries: zod.object({
		rows: zod.array(zod.object({ code: zod.string(), count: Count })),
		map: zod.array(zod.object({ code: zod.string(), count: Count })),
	}),
	series: zod.array(
		zod.object({
			slug: zod.string(),
			title: zod.string(),
			read: Count,
			total: Count.nullable(),
			books: zod.array(StatsBookRefSchema),
		}),
	),
	clubRating: zod.object({
		points: zod.array(Point),
		average: zod.number().nullable(),
		topBucket: zod.string().nullable(),
	}),
	/** The books read by the most members, and the best rated (at least two ratings). */
	mostRead: zod.array(StatsBookRefSchema.extend({ readers: Count })),
	topRated: zod.array(
		StatsBookRefSchema.extend({ average: zod.number(), ratings: Count }),
	),
});

export const ClubStatsCommunitySchema = zod.object({
	reviews: zod.object({
		count: Count,
		average: zod.number().nullable(),
		spread: zod.array(Point),
		likes: Count,
		comments: Count,
		cumulative: zod.array(ActivityMonth),
	}),
	posts: zod.object({
		count: Count,
		likes: Count,
		comments: Count,
		polls: Count,
		tierlists: Count,
		cumulative: zod.array(ActivityMonth),
		/** Only public posts are named. */
		top: zod.array(
			zod.object({
				slug: zod.string(),
				preview: zod.string(),
				likes: Count,
				comments: Count,
			}),
		),
	}),
	shelves: zod.object({ count: Count, books: Count }),
	friends: zod.object({ pairs: Count, averagePerMember: zod.number() }),
});

const Change = zod
	.object({
		percent: zod.number().nullable(),
		direction: zod.enum(["up", "down", "same"]),
	})
	.nullable();

const Share = zod.object({ label: zod.string(), count: Count, percent: Count });

const Person = zod.object({
	rank: Count,
	count: Count,
	name: zod.string().nullable(),
	username: zod.string().nullable(),
	image: zod.string().nullable(),
});

/** The club's sittings in detail: the numbers, how they compare, how they ended and how people took part. */
const SittingsDetail = zod.object({
	summary: zod.object({
		total: Count,
		finished: Count,
		reading: Count,
		voting: Count,
		participations: Count,
		participants: Count,
		averageParticipants: zod.number(),
		completed: Count,
		didNotFinish: Count,
		inProgress: Count,
		notStarted: Count,
		completionRate: Count.nullable(),
		dnfRate: Count.nullable(),
		votes: Count,
		voters: Count,
		turnout: Count.nullable(),
		averageVotesPerSitting: zod.number(),
		averageBookPages: Count.nullable(),
		longestBook: zod.object({ title: zod.string(), pages: Count }).nullable(),
		shortestBook: zod.object({ title: zod.string(), pages: Count }).nullable(),
	}),
	/** Against the period before (a year against the year before); null for All time and All books. */
	comparison: zod
		.object({
			label: zod.string(),
			sittings: Change,
			participations: Change,
			participants: Change,
			/** Percentage points, positive when more people finished than before. */
			completionRatePoints: zod.number().nullable(),
		})
		.nullable(),
	monthly: zod.array(
		zod.object({
			monthKey: zod.string(),
			label: zod.string(),
			sittings: Count,
			joined: Count,
		}),
	),
	progress: zod.array(Share),
	sizes: zod.array(Point),
	joinTypes: zod.array(Share),
	joinSources: zod.array(Share),
	pages: zod.array(Point),
	/** Public sittings only: a private or unlisted one is never named. */
	recent: zod.array(
		zod.object({
			slug: zod.string(),
			status: zod.enum(["voting", "reading", "finished"]),
			bookTitle: zod.string().nullable(),
			bookSlug: zod.string().nullable(),
			coverId: zod.number().int().nullable(),
			participants: Count,
			completed: Count,
			rate: Count.nullable(),
		}),
	),
	topFinishers: zod.array(Person),
});

export const ClubStatsClubLifeSchema = zod.object({
	sittings: SittingsDetail,
	goals: zod.object({ year: zod.number().int(), set: Count, members: Count }),
	achievements: zod.object({
		awards: Count,
		members: Count,
		mostEarned: zod.array(
			zod.object({ slug: zod.string(), name: zod.string(), earnedBy: Count }),
		),
		rarest: zod.array(
			zod.object({ slug: zod.string(), name: zod.string(), earnedBy: Count }),
		),
	}),
	standing: zod.object({
		totalXp: Count,
		totalRp: Count,
		levels: zod.array(Point),
	}),
});

export type ClubStatsOverview = zod.infer<typeof ClubStatsOverviewSchema>;
export type ClubStatsReading = zod.infer<typeof ClubStatsReadingSchema>;
export type ClubStatsTaste = zod.infer<typeof ClubStatsTasteSchema>;
export type ClubStatsCommunity = zod.infer<typeof ClubStatsCommunitySchema>;
export type ClubStatsClubLife = zod.infer<typeof ClubStatsClubLifeSchema>;
