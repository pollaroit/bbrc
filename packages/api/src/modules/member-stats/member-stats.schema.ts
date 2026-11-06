import zod from "zod";

export const StatsPeriodTypeSchema = zod.enum([
	"life",
	"none",
	"year",
	"month",
	"custom",
]);

/** Every stats tab takes the member and the period, nothing else. */
export const MemberStatsInputSchema = zod.object({
	username: zod.string().min(1),
	periodType: StatsPeriodTypeSchema.optional().default("life"),
	period: zod.string().optional(),
	periodStart: zod.string().optional(),
	periodEnd: zod.string().optional(),
});
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

/* ------------------------------------------------------------------ taste */

const BookRefSchema = StatsBookRefSchema;

const AuthorRowSchema = zod.object({
	key: zod.string(),
	label: zod.string(),
	slug: zod.string().nullable(),
	photoUrl: zod.string().nullable(),
	count: Count,
	average: zod.number().nullable(),
	topBook: BookRefSchema.nullable(),
	books: zod.array(BookRefSchema),
});

const PopularRowSchema = BookRefSchema.extend({ clubReads: Count });

const RatedRowSchema = zod.object({
	book: BookRefSchema,
	mine: zod.number(),
	othersAverage: zod.number(),
	othersCount: Count,
	delta: zod.number(),
});

export const MemberStatsTasteOutputSchema = zod.object({
	access: StatsAccessSchema,
	hasTimeAxis: zod.boolean(),
	subjects: zod.object({
		top: zod.array(
			zod.object({
				subject: zod.string(),
				count: Count,
				percent: zod.number(),
			}),
		),
		/** The member's highest-rated subjects; null when their ratings are not visible. */
		topRated: zod
			.array(
				zod.object({
					subject: zod.string(),
					average: zod.number(),
					count: Count,
				}),
			)
			.nullable(),
	}),
	authors: zod.object({
		byCount: zod.array(AuthorRowSchema),
		byRating: zod.array(AuthorRowSchema).nullable(),
	}),
	countries: zod.object({
		rows: zod.array(
			zod.object({
				code: zod.string(),
				count: Count,
				average: zod.number().nullable(),
			}),
		),
		map: zod.array(zod.object({ code: zod.string(), count: Count })),
	}),
	series: zod.array(
		zod.object({
			slug: zod.string(),
			title: zod.string(),
			read: Count,
			total: Count.nullable(),
			books: zod.array(BookRefSchema),
		}),
	),
	clubRating: zod.object({
		points: zod.array(HistogramPointSchema),
		average: zod.number().nullable(),
		topBucket: zod.string().nullable(),
	}),
	popular: zod.object({
		most: zod.array(PopularRowSchema),
		least: zod.array(PopularRowSchema),
	}),
	/** Null when the member's reviews are not visible to this viewer. */
	ratedVsClub: zod
		.object({
			higher: zod.array(RatedRowSchema),
			lower: zod.array(RatedRowSchema),
			skipped: Count,
		})
		.nullable(),
});

export type MemberStatsTasteOutput = zod.infer<
	typeof MemberStatsTasteOutputSchema
>;

/* -------------------------------------------------------------- community */

const ActivityMonthSchema = zod.object({
	monthKey: zod.string(),
	label: zod.string(),
	added: Count,
	total: Count,
});

export const MemberStatsCommunityOutputSchema = zod.object({
	access: StatsAccessSchema,
	reviews: zod
		.object({
			count: Count,
			average: zod.number().nullable(),
			spread: zod.array(HistogramPointSchema),
			likes: Count,
			comments: Count,
			cumulative: zod.array(ActivityMonthSchema),
			top: zod.array(
				zod.object({
					slug: zod.string(),
					book: StatsBookRefSchema,
					rating: zod.number(),
					likes: Count,
					comments: Count,
				}),
			),
			rank: StatsRankSchema,
		})
		.nullable(),
	posts: zod.object({
		count: Count,
		likes: Count,
		comments: Count,
		polls: Count,
		tierlists: Count,
		cumulative: zod.array(ActivityMonthSchema),
		top: zod.array(
			zod.object({
				slug: zod.string(),
				preview: zod.string(),
				likes: Count,
				comments: Count,
			}),
		),
		rank: StatsRankSchema,
	}),
	shelves: zod.object({
		count: Count,
		books: Count,
		top: zod.array(
			zod.object({
				slug: zod.string(),
				title: zod.string(),
				username: zod.string(),
				books: Count,
				views: Count,
			}),
		),
		rank: StatsRankSchema,
	}),
	friends: zod.object({ count: Count }),
});

export type MemberStatsCommunityOutput = zod.infer<
	typeof MemberStatsCommunityOutputSchema
>;

/* -------------------------------------------------------------- club life */

export const MemberStatsClubLifeOutputSchema = zod.object({
	access: StatsAccessSchema,
	sittings: zod.object({
		joined: Count,
		completed: Count,
		didNotFinish: Count,
		inProgress: Count,
		/** Of the sittings that are over: how many they finished. Null before any is over. */
		completionRate: zod.number().nullable(),
		votesCast: Count,
		/** Votes that went to the book the sitting then picked. */
		votesThatWon: Count,
		booksAdded: Count,
		booksRequested: Count,
		progress: zod.array(HistogramPointSchema),
		rank: StatsRankSchema,
	}),
	/** Null when the member's goals are not visible to this viewer. */
	goals: zod
		.object({
			total: Count,
			completed: Count,
			active: zod.array(
				zod.object({
					slug: zod.string(),
					title: zod.string(),
					year: zod.number().int(),
					current: Count,
					target: Count,
					percent: Count,
				}),
			),
		})
		.nullable(),
	achievements: zod.object({
		earned: Count,
		total: Count,
		recent: zod.array(
			zod.object({
				key: zod.string(),
				slug: zod.string(),
				name: zod.string(),
				tier: Count,
				earnedAt: zod.coerce.date(),
			}),
		),
		/** The member's rarest: how many members have each, out of all. */
		rarest: zod.array(
			zod.object({
				slug: zod.string(),
				name: zod.string(),
				earnedBy: Count,
				members: Count,
			}),
		),
		byCategory: zod.array(HistogramPointSchema),
		rank: StatsRankSchema,
	}),
	standing: zod.object({
		xp: Count,
		rp: Count,
		xpLevel: zod.string(),
		rpLevel: zod.string(),
		xpRank: StatsRankSchema,
		rpRank: StatsRankSchema,
	}),
});

export type MemberStatsClubLifeOutput = zod.infer<
	typeof MemberStatsClubLifeOutputSchema
>;
