import zod from "zod";

export const UserStatsPeriodTypeSchema = zod.enum([
	"life",
	"none",
	"year",
	"month",
	"custom",
]);

export const GetUserStatsInputSchema = zod.object({
	username: zod.string().min(1),
	periodType: UserStatsPeriodTypeSchema.optional().default("life"),
	period: zod.string().optional(),
	periodStart: zod.string().optional(),
	periodEnd: zod.string().optional(),
});

const StatsBookSchema = zod.object({
	id: zod.string().uuid(),
	slug: zod.string(),
	title: zod.string(),
	authors: zod.array(zod.string()),
	coverId: zod.number().int().nullable(),
});

const HistogramPointSchema = zod.object({
	label: zod.string(),
	count: zod.number().int().min(0),
});

const PaceSchema = zod.object({
	booksPerYear: zod.number(),
	booksPerMonth: zod.number(),
	booksPerWeek: zod.number(),
	booksPerDay: zod.number(),
	pagesPerYear: zod.number(),
	pagesPerMonth: zod.number(),
	pagesPerWeek: zod.number(),
	pagesPerDay: zod.number(),
});

const CumulativePointSchema = zod.object({
	monthKey: zod.string(),
	label: zod.string(),
	books: zod.number().int().min(0),
	pages: zod.number().int().min(0),
	authors: zod.number().int().min(0),
});

const AuthorCountryRowSchema = zod.object({
	key: zod.string(),
	label: zod.string(),
	bookCount: zod.number().int().min(0),
	topRatedBook: StatsBookSchema.nullable(),
	userAverageRating: zod.number().nullable(),
	books: zod.array(StatsBookSchema),
});

const RatingCompareBookSchema = StatsBookSchema.extend({
	userRating: zod.number(),
	clubRating: zod.number().nullable(),
	delta: zod.number(),
});

const ReviewHighlightSchema = zod.object({
	feedbackSlug: zod.string(),
	book: StatsBookSchema,
	likeCount: zod.number().int().min(0),
	commentCount: zod.number().int().min(0),
	engagement: zod.number().int().min(0),
});

const PopularReadSchema = StatsBookSchema.extend({
	clubReadCount: zod.number().int().min(0),
});

const SeriesRowSchema = zod.object({
	seriesSlug: zod.string(),
	seriesTitle: zod.string(),
	bookCount: zod.number().int().min(0),
	books: zod.array(StatsBookSchema),
});

export const GetUserStatsOutputSchema = zod.object({
	displayName: zod.string(),
	username: zod.string(),
	title: zod.string(),
	periodType: UserStatsPeriodTypeSchema,
	periodLabel: zod.string().nullable(),

	cards: zod.object({
		booksRead: zod.number().int().min(0),
		pagesRead: zod.number().int().min(0),
		distinctAuthors: zod.number().int().min(0),
		distinctCountries: zod.number().int().min(0),
		feedbacks: zod.number().int().min(0),
		posts: zod.number().int().min(0),
		shelves: zod.number().int().min(0),
		participations: zod.number().int().min(0),
		catalogAdditions: zod.number().int().min(0),
		catalogRequests: zod.number().int().min(0),
		comments: zod.number().int().min(0),
		sittingsCompleted: zod.number().int().min(0),
	}),

	catalogBooksRead: zod.number().int().min(0),
	catalogBooksTotal: zod.number().int().min(0),
	catalogCoveragePercent: zod.number().nullable(),
	firstDatedReadYear: zod.number().int().nullable(),
	readerPercentile: zod.number().nullable(),
	readerRank: zod.number().int().nullable(),
	readerPoolSize: zod.number().int().nullable(),

	readGrid: zod.object({
		books: zod.array(StatsBookSchema),
		allBooks: zod.array(StatsBookSchema),
		totalInPeriod: zod.number().int().min(0),
		hasMore: zod.boolean(),
	}),

	cumulativeSeries: zod.array(CumulativePointSchema),
	readingPace: PaceSchema.nullable(),

	readsTimeline: zod.object({
		mode: zod.enum(["year", "month", "hidden"]),
		points: zod.array(HistogramPointSchema),
	}),

	subjectBreakdown: zod.array(
		zod.object({
			subject: zod.string(),
			count: zod.number().int().min(0),
			percentage: zod.number(),
		}),
	),

	ratingHistogram: zod.object({
		points: zod.array(HistogramPointSchema),
		averageClubRating: zod.number().nullable(),
		topBucket: zod.string().nullable(),
	}),

	pagesHistogram: zod.object({
		points: zod.array(HistogramPointSchema),
		topBucket: zod.string().nullable(),
	}),

	publicationByYear: zod.array(HistogramPointSchema),
	publicationByDecade: zod.array(HistogramPointSchema),
	publicationByCentury: zod.array(HistogramPointSchema),
	publishYearsHistogram: zod.array(HistogramPointSchema),

	countryMapCounts: zod.array(
		zod.object({
			countryCode: zod.string(),
			count: zod.number().int().min(0),
		}),
	),

	topAuthors: zod.array(AuthorCountryRowSchema),
	topCountries: zod.array(AuthorCountryRowSchema),
	topAuthorsByRating: zod.array(AuthorCountryRowSchema),
	topCountriesByRating: zod.array(AuthorCountryRowSchema),

	ratedHigherThanClub: zod.array(RatingCompareBookSchema),
	ratedLowerThanClub: zod.array(RatingCompareBookSchema),

	topReviews: zod.array(ReviewHighlightSchema),
	mostPopularReads: zod.array(PopularReadSchema),
	leastPopularReads: zod.array(PopularReadSchema),

	topSeries: zod.array(SeriesRowSchema),
});

export type GetUserStatsInput = zod.infer<typeof GetUserStatsInputSchema>;
export type GetUserStatsOutput = zod.infer<typeof GetUserStatsOutputSchema>;
