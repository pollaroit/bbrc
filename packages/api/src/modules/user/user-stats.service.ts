import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import {
	averageNumber,
	compareMonths,
	computeCumulativeReadSeries,
	computeReadingPace,
	formatUserStatsPeriodTitle,
	histogramFromValues,
	pagesBucketLabel,
	parseUserStatsPeriod,
	percentileRankBetterThan,
	publicationHistogram,
	ratingHistogramForClubAverage,
	readCountsForPeriod,
	readFinishMonth,
	readHasFinishMonth,
	readsByMonthHistogram,
	readsByYearHistogram,
	resolveUserStatsPeriodBounds,
	subjectBreakdown,
	topBucketLabel,
	USER_STATS_PAGE_BUCKETS,
	type UserStatsMonth,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { aggregateCountryBookCounts } from "../book/book-country-filter";
import type {
	GetUserStatsInput,
	GetUserStatsOutput,
} from "./user-stats.schema";
import {
	assertMemberVisible,
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "./user-visibility";

function resolveUserStatsPeriodInput(
	input: GetUserStatsInput,
): ReturnType<typeof parseUserStatsPeriod> {
	const now = new Date();
	const defaultYear = now.getUTCFullYear();
	const defaultMonth = now.getUTCMonth() + 1;
	const defaultYm = `${defaultYear}-${String(defaultMonth).padStart(2, "0")}`;

	const normalized = {
		periodType: input.periodType ?? "life",
		period:
			input.periodType === "year" && !input.period?.trim()
				? String(defaultYear)
				: input.periodType === "month" && !input.period?.trim()
					? defaultYm
					: input.period,
		periodStart:
			input.periodType === "custom" && !input.periodStart?.trim()
				? defaultYm
				: input.periodStart,
		periodEnd:
			input.periodType === "custom" && !input.periodEnd?.trim()
				? defaultYm
				: input.periodEnd,
	};

	try {
		return parseUserStatsPeriod(normalized);
	} catch {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid stats period" });
	}
}

const readBookSelect = {
	id: true,
	slug: true,
	title: true,
	authors: true,
	pages: true,
	countries: true,
	subjects: true,
	publishedIn: true,
	averageRating: true,
	coverId: true,
	status: true,
	seriesMembership: {
		select: {
			series: { select: { id: true, slug: true, title: true } },
		},
	},
} satisfies Prisma.BookSelect;

function mapStatsBook(book: {
	id: string;
	slug: string;
	title: string;
	authors: string[];
	coverId: number | null;
}) {
	return {
		id: book.id,
		slug: book.slug,
		title: book.title,
		authors: book.authors,
		coverId: book.coverId,
	};
}

function datedReadWhereForBounds(bounds: {
	start: UserStatsMonth;
	end: UserStatsMonth;
}): Prisma.ReadWhereInput {
	return {
		readEndYear: { not: null },
		readEndMonth: { not: null },
		AND: [
			{
				OR: [
					{ readEndYear: { gt: bounds.start.year } },
					{
						readEndYear: bounds.start.year,
						readEndMonth: { gte: bounds.start.month },
					},
				],
			},
			{
				OR: [
					{ readEndYear: { lt: bounds.end.year } },
					{
						readEndYear: bounds.end.year,
						readEndMonth: { lte: bounds.end.month },
					},
				],
			},
		],
	};
}

function createdAtRangeForBounds(bounds: {
	start: UserStatsMonth;
	end: UserStatsMonth;
}): { gte: Date; lt: Date } {
	const gte = new Date(Date.UTC(bounds.start.year, bounds.start.month - 1, 1));
	const endMonth = bounds.end.month === 12 ? 1 : bounds.end.month + 1;
	const endYear =
		bounds.end.month === 12 ? bounds.end.year + 1 : bounds.end.year;
	const lt = new Date(Date.UTC(endYear, endMonth - 1, 1));
	return { gte, lt };
}

export async function getUserStats(
	input: GetUserStatsInput,
	db: Database,
	session: Session | null,
): Promise<GetUserStatsOutput> {
	const period = resolveUserStatsPeriodInput(input);

	const viewer = viewerFromSession(session);
	const user = await db.user.findUnique({
		where: { username: input.username },
		select: { id: true, username: true, name: true, isHidden: true },
	});
	assertMemberVisible(user, viewer);
	const userId = user.id;

	const allReads = await db.read.findMany({
		where: { userId },
		select: {
			readEndYear: true,
			readEndMonth: true,
			createdAt: true,
			bookId: true,
			book: { select: readBookSelect },
		},
	});

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
	const activityRange =
		period.type === "life" || period.type === "none"
			? null
			: createdAtRangeForBounds(bounds);

	const readsInPeriod = allReads.filter((read) => {
		const gate = readCountsForPeriod(read, period, bounds);
		return gate.inPeriod || gate.includeUndatedInTotals;
	});

	const datedReadsInPeriod = readsInPeriod.filter((read) =>
		readHasFinishMonth(read),
	);

	const totalBooksRead = readsInPeriod.length;
	const totalPagesRead = readsInPeriod.reduce(
		(sum, read) => sum + read.book.pages,
		0,
	);

	const authorSet = new Set<string>();
	const countrySet = new Set<string>();
	for (const read of readsInPeriod) {
		for (const author of read.book.authors) {
			authorSet.add(author.trim().toLowerCase());
		}
		for (const country of read.book.countries) {
			const code = country.trim().toUpperCase();
			if (code) countrySet.add(code);
		}
	}

	const [
		feedbacks,
		posts,
		shelves,
		participations,
		catalogAdditions,
		catalogRequests,
		comments,
		sittingsCompleted,
		catalogBookCount,
		memberReadCounts,
		clubReadCountsByBook,
		userFeedbacksInPeriod,
	] = await Promise.all([
		db.feedback.count({
			where: {
				authorId: userId,
				...(activityRange ? { createdAt: activityRange } : {}),
			},
		}),
		db.post.count({
			where: {
				authorId: userId,
				...(activityRange ? { createdAt: activityRange } : {}),
			},
		}),
		db.shelf.count({
			where: {
				userId,
				...(activityRange ? { createdAt: activityRange } : {}),
			},
		}),
		db.participation.count({
			where: {
				userId,
				OR: [{ removedAt: null }, { progress: "dnf" }],
				...(activityRange ? { createdAt: activityRange } : {}),
			},
		}),
		db.book.count({
			where: {
				approvedById: userId,
				...(activityRange ? { createdAt: activityRange } : {}),
			},
		}),
		db.book.count({
			where: {
				requestedById: userId,
				...(activityRange ? { createdAt: activityRange } : {}),
			},
		}),
		db.comment.count({
			where: {
				authorId: userId,
				...(activityRange ? { createdAt: activityRange } : {}),
			},
		}),
		db.participation.count({
			where: {
				userId,
				progress: "completed",
				...(activityRange ? { createdAt: activityRange } : {}),
			},
		}),
		db.book.count(),
		period.type === "none"
			? Promise.resolve(new Map<string, number>())
			: loadMemberReadCountsForPeriod(db, period, bounds),
		loadClubReadCountsByBook(db),
		db.feedback.findMany({
			where: {
				authorId: userId,
				...(activityRange ? { createdAt: activityRange } : {}),
			},
			select: {
				slug: true,
				rating: true,
				bookId: true,
				book: { select: readBookSelect },
				_count: { select: { likes: true, comments: true } },
			},
		}),
	]);

	const userDatedCount =
		period.type === "life"
			? allReads.filter((read) => readHasFinishMonth(read)).length
			: datedReadsInPeriod.length;
	const readerPercentileData =
		period.type === "none"
			? null
			: percentileRankBetterThan(userDatedCount, [
					...memberReadCounts.values(),
				]);

	const catalogBooksRead = readsInPeriod.length;
	const catalogCoveragePercent =
		catalogBookCount > 0
			? Math.min(
					100,
					Math.round((catalogBooksRead / catalogBookCount) * 1000) / 10,
				)
			: null;
	const firstDatedReadYear = firstDatedRead?.year ?? null;

	const sortedReads = [...readsInPeriod].sort((a, b) => {
		const aFinish = readFinishMonth(a);
		const bFinish = readFinishMonth(b);
		if (!aFinish && !bFinish) return 0;
		if (!aFinish) return 1;
		if (!bFinish) return -1;
		return bFinish.year - aFinish.year || bFinish.month - aFinish.month;
	});

	const gridLimit = 143;
	const gridBooks = sortedReads
		.slice(0, gridLimit)
		.map((read) => mapStatsBook(read.book));
	const totalInPeriod = sortedReads.length;

	const analyticsReads =
		period.type === "none" ? readsInPeriod : datedReadsInPeriod;
	const analyticsRows = analyticsReads.map((read) => ({
		pages: read.book.pages,
		authorKeys: read.book.authors.map((a) => a.trim().toLowerCase()),
		book: read.book,
	}));

	const datedForAnalytics = datedReadsInPeriod.map((read) => {
		const finish = readFinishMonth(read)!;
		return {
			finish,
			pages: read.book.pages,
			authorKeys: read.book.authors.map((a) => a.trim().toLowerCase()),
			book: read.book,
		};
	});

	let cumulativeSeries: ReturnType<typeof computeCumulativeReadSeries> = [];
	let readingPace: ReturnType<typeof computeReadingPace> | null = null;
	let readsTimelineMode: "year" | "month" | "hidden" = "hidden";
	let readsTimelinePoints: { label: string; count: number }[] = [];

	if (period.type !== "none") {
		cumulativeSeries = computeCumulativeReadSeries(datedForAnalytics, bounds);

		readingPace =
			datedForAnalytics.length > 0
				? computeReadingPace(
						datedForAnalytics.length,
						datedForAnalytics.reduce((sum, row) => sum + row.pages, 0),
						bounds,
						period,
					)
				: null;

		if (period.type === "month") {
			readsTimelineMode = "hidden";
		} else if (period.type === "year") {
			readsTimelineMode = "month";
			readsTimelinePoints = readsByMonthHistogram(
				datedForAnalytics.map((row) => ({ finish: row.finish })),
			);
		} else if (
			period.type === "life" ||
			(period.type === "custom" && bounds.start.year !== bounds.end.year)
		) {
			readsTimelineMode = "year";
			readsTimelinePoints = readsByYearHistogram(
				datedForAnalytics.map((row) => ({ finish: row.finish })),
			);
		} else if (period.type === "custom") {
			readsTimelineMode = "month";
			readsTimelinePoints = readsByMonthHistogram(
				datedForAnalytics.map((row) => ({ finish: row.finish })),
			);
		}
	}

	const subjects = subjectBreakdown(
		analyticsRows.map((row) => row.book.subjects),
	);

	const clubRatings = analyticsRows.map((row) => row.book.averageRating);
	const ratingPoints = ratingHistogramForClubAverage(clubRatings).filter(
		(row) => row.label !== "unrated",
	);

	const pagesPoints = histogramFromValues(
		analyticsRows.map((row) => pagesBucketLabel(row.book.pages)),
		USER_STATS_PAGE_BUCKETS,
	);

	const publishYears = analyticsRows.map((row) => row.book.publishedIn);

	const countryMap = aggregateCountryBookCounts(
		analyticsRows.map((row) => ({ countries: row.book.countries })),
	);

	const feedbackByBookId = new Map(
		userFeedbacksInPeriod.map((feedback) => [feedback.bookId, feedback]),
	);

	const topAuthors = buildAuthorCountryRows(
		analyticsRows,
		"authors",
		feedbackByBookId,
	);
	const topCountries = buildAuthorCountryRows(
		analyticsRows,
		"countries",
		feedbackByBookId,
	);
	const topAuthorsByRating = sortAuthorCountryByRating(topAuthors);
	const topCountriesByRating = sortAuthorCountryByRating(topCountries);

	const ratedCompare = buildRatingCompare(analyticsRows, feedbackByBookId);

	const topReviews = [...userFeedbacksInPeriod]
		.map((feedback) => ({
			feedbackSlug: feedback.slug,
			book: mapStatsBook(feedback.book),
			likeCount: feedback._count.likes,
			commentCount: feedback._count.comments,
			engagement: feedback._count.likes + feedback._count.comments,
		}))
		.filter((review) => review.engagement > 0)
		.sort((a, b) => b.engagement - a.engagement)
		.slice(0, 5);

	const bookIdsInPeriod = new Set(analyticsRows.map((row) => row.book.id));
	const popularRows = [...bookIdsInPeriod]
		.map((bookId) => {
			const read = analyticsRows.find((row) => row.book.id === bookId)!;
			return {
				...mapStatsBook(read.book),
				clubReadCount: clubReadCountsByBook.get(bookId) ?? 0,
			};
		})
		.sort((a, b) => b.clubReadCount - a.clubReadCount);

	const mostPopularReads = popularRows.slice(0, 10);
	const leastPopularReads = [...popularRows]
		.sort((a, b) => a.clubReadCount - b.clubReadCount)
		.slice(0, 10);

	const topSeries = buildSeriesRows(analyticsRows);

	const title = formatUserStatsPeriodTitle(user.name, period);
	const periodLabel =
		period.type === "year"
			? String(period.year)
			: period.type === "month"
				? `${period.year}-${String(period.month).padStart(2, "0")}`
				: period.type === "custom"
					? `${period.start.year}-${String(period.start.month).padStart(2, "0")}_${period.end.year}-${String(period.end.month).padStart(2, "0")}`
					: null;

	return {
		displayName: user.name,
		username: user.username,
		title,
		periodType: period.type,
		periodLabel,
		cards: {
			booksRead: totalBooksRead,
			pagesRead: totalPagesRead,
			distinctAuthors: authorSet.size,
			distinctCountries: countrySet.size,
			feedbacks,
			posts,
			shelves,
			participations,
			catalogAdditions,
			catalogRequests,
			comments,
			sittingsCompleted,
		},
		catalogBooksRead,
		catalogBooksTotal: catalogBookCount,
		catalogCoveragePercent,
		firstDatedReadYear,
		readerPercentile:
			readerPercentileData && readerPercentileData.memberCount >= 2
				? readerPercentileData.percentile
				: null,
		readerRank:
			readerPercentileData && readerPercentileData.memberCount >= 2
				? readerPercentileData.rank
				: null,
		readerPoolSize:
			readerPercentileData && readerPercentileData.memberCount >= 2
				? readerPercentileData.memberCount
				: null,
		readGrid: {
			books: gridBooks,
			allBooks: sortedReads.map((read) => mapStatsBook(read.book)),
			totalInPeriod,
			hasMore: totalInPeriod > gridLimit,
		},
		cumulativeSeries,
		readingPace,
		readsTimeline: {
			mode: readsTimelineMode,
			points: readsTimelinePoints,
		},
		subjectBreakdown: subjects,
		ratingHistogram: {
			points: ratingPoints,
			averageClubRating: averageNumber(
				clubRatings.filter((value): value is number => value != null),
			),
			topBucket: topBucketLabel(ratingPoints),
		},
		pagesHistogram: {
			points: pagesPoints,
			topBucket: topBucketLabel(pagesPoints),
		},
		publicationByYear: publicationHistogram(publishYears, "year"),
		publicationByDecade: publicationHistogram(publishYears, "decade"),
		publicationByCentury: publicationHistogram(publishYears, "century"),
		publishYearsHistogram: publicationHistogram(publishYears, "year"),
		countryMapCounts: [...countryMap.entries()].map(([countryCode, count]) => ({
			countryCode,
			count,
		})),
		topAuthors,
		topCountries,
		topAuthorsByRating,
		topCountriesByRating,
		ratedHigherThanClub: ratedCompare.higher,
		ratedLowerThanClub: ratedCompare.lower,
		topReviews,
		mostPopularReads,
		leastPopularReads,
		topSeries,
	};
}

function readWhereForStatsPeriod(
	period: ReturnType<typeof parseUserStatsPeriod>,
	bounds: { start: UserStatsMonth; end: UserStatsMonth },
): Prisma.ReadWhereInput {
	const base: Prisma.ReadWhereInput = {
		user: visibleOnSiteUserWhere,
		readEndYear: { not: null },
		readEndMonth: { not: null },
	};
	if (period.type === "life") {
		return base;
	}
	return { ...base, ...datedReadWhereForBounds(bounds) };
}

async function loadMemberReadCountsForPeriod(
	db: Database,
	period: ReturnType<typeof parseUserStatsPeriod>,
	bounds: { start: UserStatsMonth; end: UserStatsMonth },
): Promise<Map<string, number>> {
	const groups = await db.read.groupBy({
		by: ["userId"],
		where: readWhereForStatsPeriod(period, bounds),
		_count: { _all: true },
	});
	return new Map(groups.map((row) => [row.userId, row._count._all]));
}

async function loadClubReadCountsByBook(
	db: Database,
): Promise<Map<string, number>> {
	const groups = await db.read.groupBy({
		by: ["bookId"],
		where: {
			user: visibleOnSiteUserWhere,
		},
		_count: { _all: true },
	});
	return new Map(groups.map((row) => [row.bookId, row._count._all]));
}

function sortAuthorCountryByRating<
	TRow extends { userAverageRating: number | null; bookCount: number },
>(rows: TRow[]): TRow[] {
	return [...rows]
		.filter((row) => row.userAverageRating != null)
		.sort(
			(a, b) =>
				(b.userAverageRating ?? 0) - (a.userAverageRating ?? 0) ||
				b.bookCount - a.bookCount,
		)
		.slice(0, 5);
}

function buildAuthorCountryRows(
	reads: {
		book: {
			id: string;
			slug: string;
			title: string;
			authors: string[];
			coverId: number | null;
			countries: string[];
		};
	}[],
	mode: "authors" | "countries",
	feedbackByBookId: Map<
		string,
		{ rating: number; book: (typeof reads)[number]["book"] }
	>,
) {
	const map = new Map<
		string,
		{
			label: string;
			books: (typeof reads)[number]["book"][];
		}
	>();

	for (const read of reads) {
		const keys =
			mode === "authors"
				? read.book.authors.map((author) => ({
						key: author.trim().toLowerCase(),
						label: author.trim(),
					}))
				: read.book.countries.map((country) => {
						const code = country.trim().toUpperCase();
						return { key: code, label: code };
					});

		for (const { key, label } of keys) {
			if (!key) continue;
			const entry = map.get(key) ?? { label, books: [] };
			entry.books.push(read.book);
			map.set(key, entry);
		}
	}

	return [...map.entries()]
		.map(([key, entry]) => {
			const ratings = entry.books
				.map((book) => feedbackByBookId.get(book.id)?.rating)
				.filter((value): value is number => value != null);
			const topRated = entry.books
				.map((book) => ({
					book,
					rating: feedbackByBookId.get(book.id)?.rating ?? -1,
				}))
				.sort((a, b) => b.rating - a.rating)[0]?.book;

			return {
				key,
				label: entry.label,
				bookCount: entry.books.length,
				topRatedBook: topRated ? mapStatsBook(topRated) : null,
				userAverageRating: averageNumber(ratings),
				books: entry.books.map(mapStatsBook),
			};
		})
		.sort((a, b) => b.bookCount - a.bookCount)
		.slice(0, 5);
}

function buildRatingCompare(
	reads: {
		book: {
			id: string;
			slug: string;
			title: string;
			authors: string[];
			coverId: number | null;
			averageRating: number | null;
		};
	}[],
	feedbackByBookId: Map<string, { rating: number }>,
) {
	const rows = reads
		.map((read) => {
			const feedback = feedbackByBookId.get(read.book.id);
			if (!feedback || read.book.averageRating == null) {
				return null;
			}
			const delta = feedback.rating - read.book.averageRating;
			return {
				...mapStatsBook(read.book),
				userRating: feedback.rating,
				clubRating: read.book.averageRating,
				delta,
			};
		})
		.filter((row): row is NonNullable<typeof row> => row != null);

	return {
		higher: rows
			.filter((row) => row.delta > 0)
			.sort((a, b) => b.delta - a.delta)
			.slice(0, 4),
		lower: rows
			.filter((row) => row.delta < 0)
			.sort((a, b) => a.delta - b.delta)
			.slice(0, 4),
	};
}

function buildSeriesRows(
	reads: {
		book: {
			id: string;
			slug: string;
			title: string;
			authors: string[];
			coverId: number | null;
			seriesMembership: {
				series: { slug: string; title: string };
			} | null;
		};
	}[],
) {
	const map = new Map<
		string,
		{
			seriesSlug: string;
			seriesTitle: string;
			books: ReturnType<typeof mapStatsBook>[];
		}
	>();

	for (const read of reads) {
		const series = read.book.seriesMembership?.series;
		if (!series) continue;
		const entry = map.get(series.slug) ?? {
			seriesSlug: series.slug,
			seriesTitle: series.title,
			books: [],
		};
		entry.books.push(mapStatsBook(read.book));
		map.set(series.slug, entry);
	}

	return [...map.values()]
		.map((entry) => ({
			seriesSlug: entry.seriesSlug,
			seriesTitle: entry.seriesTitle,
			bookCount: entry.books.length,
			books: entry.books,
		}))
		.sort((a, b) => b.bookCount - a.bookCount)
		.slice(0, 10);
}
