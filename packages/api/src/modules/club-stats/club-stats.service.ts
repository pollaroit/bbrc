import type { Database, Prisma } from "@bbrc/db";
import {
	ACHIEVEMENTS,
	ANONYMOUS_VIEWER,
	activityBounds,
	authorRows,
	averageNumber,
	bookAuthorEntries,
	computeCumulativeReadSeries,
	countryRows,
	cumulativeByMonth,
	histogramFromValues,
	memberLevelsForPoints,
	monthlyPaceSeries,
	pagesBucketLabel,
	publicationHistogram,
	ratingHistogramForClubAverage,
	readFinishMonth,
	readsByMonthHistogram,
	readsByYearHistogram,
	richContentPreview,
	seriesRows,
	subjectBreakdown,
	type TasteBook,
	topBucketLabel,
	USER_STATS_PAGE_BUCKETS,
	type UserStatsPeriod,
} from "@bbrc/shared";
import { aggregateCountryBookCounts } from "../book/book-country-filter";
import type { StatsBook } from "../member-stats/member-stats-context";
import { statsPeriodLabel } from "../member-stats/member-stats-helpers";
import { postFeedWhere } from "../visibility/visibility-resources";
import type {
	ClubStatsClubLife,
	ClubStatsCommunity,
	ClubStatsInput,
	ClubStatsOverview,
	ClubStatsReading,
	ClubStatsTaste,
} from "./club-stats.schema";
import { booksOfReads, loadClubStatsContext } from "./club-stats-core";

/** "The club's 2026 in books": the page title for the club's period. */
export function clubTitle(period: UserStatsPeriod): string {
	if (period.type === "year") return `The club's ${period.year} in books`;
	if (period.type === "none") return "Every book the club has read";
	return "The club's life in books";
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
const TOP = 5;

function toTasteBook(book: StatsBook): TasteBook {
	const series = book.seriesMembership?.series;
	return {
		id: book.id,
		slug: book.slug,
		title: book.title,
		authors: book.authors,
		authorLinks: book.authorLinks,
		coverId: book.coverId,
		countries: book.countries,
		subjects: book.subjects,
		seriesMembership: series
			? {
					series: {
						id: series.id,
						slug: series.slug,
						title: series.title,
						bookCount: series._count.books,
					},
				}
			: null,
	};
}

const bookRef = (book: StatsBook) => ({
	id: book.id,
	slug: book.slug,
	title: book.title,
	authors: book.authors,
	coverId: book.coverId,
});

/* --------------------------------------------------------------- overview */

export async function getClubStatsOverview(
	db: Database,
	input: ClubStatsInput,
): Promise<ClubStatsOverview> {
	const ctx = await loadClubStatsContext(db, input);
	const { period, bounds, hasTimeAxis } = ctx;

	const [members, ratings, sessions] = await Promise.all([
		db.user.count(),
		db.feedback.findMany({ where: ctx.range, select: { rating: true } }),
		db.readingSession.aggregate({
			where: {
				endedAt: ctx.range.createdAt
					? {
							not: null,
							gte: ctx.range.createdAt.gte,
							lt: ctx.range.createdAt.lt,
						}
					: { not: null },
				readingId: { not: null },
			},
			_sum: { activeSeconds: true },
		}),
	]);

	const readsBooks = booksOfReads(ctx, ctx.reads);
	const pages = sum(readsBooks.map((book) => book.pages));
	const readers = new Set(ctx.reads.map((read) => read.userId));

	const monthly = hasTimeAxis
		? monthlyPaceSeries(
				ctx.datedReads.flatMap((read) => {
					const finish = readFinishMonth(read);
					const book = ctx.books.get(read.bookId);
					return finish && book ? [{ finish, pages: book.pages }] : [];
				}),
				bounds,
			).slice(-36)
		: [];

	const seconds = sessions._sum.activeSeconds ?? 0;
	const hours = seconds / 3600;
	const topSubject = subjectBreakdown(
		readsBooks.map((book) => book.subjects),
	)[0];
	const average = averageNumber(ratings.map((row) => row.rating));

	const tiles: ClubStatsOverview["scoreboard"] = [
		{
			id: "books",
			label: "Books read",
			value: String(ctx.reads.length),
			unit: ctx.reads.length === 1 ? "book" : "books",
			note: null,
			change: null,
			spark: monthly.length > 1 ? monthly.map((month) => month.books) : null,
			bars: null,
			to: { tab: "overview", section: "reads-over-time" },
		},
		{
			id: "pages",
			label: "Pages read",
			value: pages.toLocaleString("en-US"),
			unit: "pages",
			note: null,
			change: null,
			spark: monthly.length > 1 ? monthly.map((month) => month.pages) : null,
			bars: null,
			to: { tab: "reading", section: "pace" },
		},
		{
			id: "readers",
			label: "Active readers",
			value: String(readers.size),
			unit: `of ${members}`,
			note: null,
			change: null,
			spark: null,
			bars: null,
			to: { tab: "overview", section: "top-readers" },
		},
		{
			id: "time",
			label: "Time read",
			value:
				hours < 1
					? String(Math.round(seconds / 60))
					: hours >= 100
						? String(Math.round(hours))
						: hours.toFixed(1),
			unit: hours < 1 ? "min" : "h",
			note: "all time",
			change: null,
			spark: null,
			bars: null,
			to: { tab: "reading", section: "reading-time" },
		},
	];
	if (average != null) {
		tiles.push({
			id: "rating",
			label: "Average rating given",
			value: average.toFixed(1),
			unit: "★",
			note: `from ${ratings.length} ratings`,
			change: null,
			spark: null,
			bars: [1, 2, 3, 4, 5].map((star) => ({
				label: `${star}★`,
				value: ratings.filter((row) => Math.round(row.rating) === star).length,
			})),
			to: { tab: "community", section: "reviews" },
		});
	}
	if (topSubject) {
		tiles.push({
			id: "subject",
			label: "Favourite subject",
			value: topSubject.subject,
			unit: null,
			note: `${topSubject.count} reads`,
			change: null,
			spark: null,
			bars: null,
			to: { tab: "taste", section: "subjects" },
		});
	}

	const finishes = ctx.datedReads.flatMap((read) => {
		const finish = readFinishMonth(read);
		return finish ? [{ finish }] : [];
	});
	const timeline = !hasTimeAxis
		? { mode: "hidden" as const, points: [] }
		: period.type === "year"
			? { mode: "month" as const, points: readsByMonthHistogram(finishes) }
			: { mode: "year" as const, points: readsByYearHistogram(finishes) };

	// A leaderboard row names the member only when their profile and reads are public.
	const perReader = new Map<string, number>();
	for (const read of hasTimeAxis ? ctx.datedReads : ctx.reads) {
		perReader.set(read.userId, (perReader.get(read.userId) ?? 0) + 1);
	}
	const top = [...perReader.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, TOP);
	const people = top.length
		? await db.user.findMany({
				where: { id: { in: top.map(([id]) => id) } },
				select: {
					id: true,
					name: true,
					username: true,
					image: true,
					profileVisibility: true,
					readsVisibility: true,
				},
			})
		: [];
	const byId = new Map(people.map((person) => [person.id, person]));

	return {
		title: clubTitle(period),
		periodLabel: statsPeriodLabel(period),
		firstYear: ctx.firstDatedRead?.year ?? null,
		members,
		scoreboard: tiles,
		readsOverTime: timeline,
		topReaders: top.map(([id, books], index) => {
			const person = byId.get(id);
			const open =
				person?.profileVisibility === "public" &&
				person.readsVisibility === "public";
			return {
				rank: index + 1,
				books,
				name: open ? (person?.name ?? null) : null,
				username: open ? (person?.username ?? null) : null,
				image: open ? (person?.image ?? null) : null,
			};
		}),
	};
}

/* ---------------------------------------------------------------- reading */

export async function getClubStatsReading(
	db: Database,
	input: ClubStatsInput,
): Promise<ClubStatsReading> {
	const ctx = await loadClubStatsContext(db, input);
	const { bounds, hasTimeAxis } = ctx;

	const sessionWhere: Prisma.ReadingSessionWhereInput = {
		endedAt: ctx.range.createdAt
			? { not: null, gte: ctx.range.createdAt.gte, lt: ctx.range.createdAt.lt }
			: { not: null },
		readingId: { not: null },
	};
	const [totals, readerGroups] = await Promise.all([
		db.readingSession.aggregate({
			where: sessionWhere,
			_sum: { activeSeconds: true },
			_count: { _all: true },
		}),
		db.readingSession.groupBy({ by: ["userId"], where: sessionWhere }),
	]);

	const dated = ctx.datedReads.flatMap((read) => {
		const finish = readFinishMonth(read);
		const book = ctx.books.get(read.bookId);
		return finish && book
			? [
					{
						finish,
						pages: book.pages,
						authorKeys: bookAuthorEntries(book).map((author) => author.key),
						countries: book.countries,
					},
				]
			: [];
	});

	const analytics = booksOfReads(ctx, hasTimeAxis ? ctx.datedReads : ctx.reads);
	const years = analytics
		.map((book) => book.publishedIn)
		.filter((year) => Number.isFinite(year) && year > 0);
	const sessions = totals._count._all;
	const seconds = totals._sum.activeSeconds ?? 0;

	return {
		hasTimeAxis,
		progress: hasTimeAxis
			? computeCumulativeReadSeries(dated, bounds, "en-US")
			: null,
		pace: hasTimeAxis
			? { series: monthlyPaceSeries(dated, bounds, 3, "en-US") }
			: null,
		time: {
			seconds,
			sessions,
			readers: readerGroups.length,
			averageSeconds: sessions ? Math.round(seconds / sessions) : 0,
		},
		pages: histogramFromValues(
			analytics.map((book) => pagesBucketLabel(book.pages)),
			USER_STATS_PAGE_BUCKETS,
		),
		publication: {
			year: publicationHistogram(years, "year"),
			decade: publicationHistogram(years, "decade"),
			century: publicationHistogram(years, "century"),
		},
	};
}

/* ------------------------------------------------------------------ taste */

export async function getClubStatsTaste(
	db: Database,
	input: ClubStatsInput,
): Promise<ClubStatsTaste> {
	const ctx = await loadClubStatsContext(db, input);
	const reads = ctx.hasTimeAxis ? ctx.datedReads : ctx.reads;
	const stats = booksOfReads(ctx, reads);
	const taste = stats.map(toTasteBook);

	const readersByBook = new Map<string, number>();
	for (const read of reads) {
		readersByBook.set(read.bookId, (readersByBook.get(read.bookId) ?? 0) + 1);
	}
	const ids = [...readersByBook.keys()];
	const rated = ids.length
		? await db.feedback.groupBy({
				by: ["bookId"],
				where: { bookId: { in: ids } },
				_avg: { rating: true },
				_count: { _all: true },
			})
		: [];

	const distinct = [...new Map(stats.map((book) => [book.id, book])).values()];
	const clubRatingPoints = ratingHistogramForClubAverage(
		distinct.map((book) => book.averageRating),
	).filter((point) => point.label !== "unrated");

	return {
		subjects: subjectBreakdown(stats.map((book) => book.subjects)).map(
			(row) => ({
				subject: row.subject,
				count: row.count,
				percent: row.percentage,
			}),
		),
		authors: authorRows(taste, null).byCount.map((row) => ({
			key: row.key,
			label: row.label,
			slug: row.slug,
			photoUrl: row.photoUrl,
			count: row.count,
		})),
		countries: {
			rows: countryRows(taste, null).map(({ code, count }) => ({
				code,
				count,
			})),
			map: [...aggregateCountryBookCounts(stats).entries()].map(
				([code, count]) => ({
					code,
					count,
				}),
			),
		},
		series: seriesRows(taste),
		clubRating: {
			points: clubRatingPoints,
			average: averageNumber(
				distinct.flatMap((book) =>
					book.averageRating == null ? [] : [book.averageRating],
				),
			),
			topBucket: topBucketLabel(clubRatingPoints),
		},
		mostRead: distinct
			.map((book) => ({
				...bookRef(book),
				readers: readersByBook.get(book.id) ?? 0,
			}))
			.sort((a, b) => b.readers - a.readers || a.title.localeCompare(b.title))
			.slice(0, 6),
		topRated: rated
			.filter((row) => row._count._all >= 2 && row._avg.rating != null)
			.flatMap((row) => {
				const book = distinct.find((item) => item.id === row.bookId);
				return book
					? [
							{
								...bookRef(book),
								average: round1(row._avg.rating ?? 0),
								ratings: row._count._all,
							},
						]
					: [];
			})
			.sort((a, b) => b.average - a.average || b.ratings - a.ratings)
			.slice(0, 6),
	};
}

/* -------------------------------------------------------------- community */

export async function getClubStatsCommunity(
	db: Database,
	input: ClubStatsInput,
): Promise<ClubStatsCommunity> {
	const ctx = await loadClubStatsContext(db, input);
	const fixed = ctx.range.createdAt != null;

	const [reviews, posts, publicPosts, shelves, pairs, members] =
		await Promise.all([
			db.feedback.findMany({
				where: ctx.range,
				select: {
					rating: true,
					createdAt: true,
					_count: { select: { likes: true, comments: true } },
				},
			}),
			db.post.findMany({
				where: { status: "published", ...ctx.range },
				select: {
					createdAt: true,
					poll: { select: { id: true } },
					tierlist: { select: { id: true } },
					_count: { select: { likes: true, comments: true } },
				},
			}),
			// Only what an anonymous visitor may see is named.
			db.post.findMany({
				where: {
					AND: [postFeedWhere(ANONYMOUS_VIEWER) as Prisma.PostWhereInput],
					...ctx.range,
				},
				select: {
					slug: true,
					content: true,
					_count: { select: { likes: true, comments: true } },
				},
			}),
			db.shelf.findMany({
				where: { isWishlist: false, ...ctx.range },
				select: { _count: { select: { books: true } } },
			}),
			db.friendship.count({ where: { status: "accepted" } }),
			db.user.count(),
		]);

	return {
		reviews: {
			count: reviews.length,
			average: averageNumber(reviews.map((row) => row.rating)),
			spread: [1, 2, 3, 4, 5].map((star) => ({
				label: `${star}★`,
				count: reviews.filter((row) => Math.round(row.rating) === star).length,
			})),
			likes: sum(reviews.map((row) => row._count.likes)),
			comments: sum(reviews.map((row) => row._count.comments)),
			cumulative: cumulativeByMonth(
				reviews.map((row) => row.createdAt),
				activityBounds(
					reviews.map((row) => row.createdAt),
					ctx.bounds,
					fixed,
				),
				"en-US",
			),
		},
		posts: {
			count: posts.length,
			likes: sum(posts.map((row) => row._count.likes)),
			comments: sum(posts.map((row) => row._count.comments)),
			polls: posts.filter((row) => row.poll).length,
			tierlists: posts.filter((row) => row.tierlist).length,
			cumulative: cumulativeByMonth(
				posts.map((row) => row.createdAt),
				activityBounds(
					posts.map((row) => row.createdAt),
					ctx.bounds,
					fixed,
				),
				"en-US",
			),
			top: publicPosts
				.map((row) => ({
					slug: row.slug,
					preview: richContentPreview(row.content, 110),
					likes: row._count.likes,
					comments: row._count.comments,
				}))
				.filter((row) => row.likes + row.comments > 0)
				.sort((a, b) => b.likes + b.comments - (a.likes + a.comments))
				.slice(0, TOP),
		},
		shelves: {
			count: shelves.length,
			books: sum(shelves.map((row) => row._count.books)),
		},
		friends: {
			pairs,
			averagePerMember: members ? round1((pairs * 2) / members) : 0,
		},
	};
}

/* -------------------------------------------------------------- club life */

export async function getClubStatsClubLife(
	db: Database,
	input: ClubStatsInput,
): Promise<ClubStatsClubLife> {
	const ctx = await loadClubStatsContext(db, input);
	const year =
		ctx.period.type === "year" ? ctx.period.year : new Date().getUTCFullYear();

	const [sittingGroups, progressGroups, votes, goals, awards, people] =
		await Promise.all([
			db.sitting.groupBy({
				by: ["status"],
				where: ctx.range,
				_count: { _all: true },
			}),
			db.participation.groupBy({
				by: ["progress"],
				where: { OR: [{ removedAt: null }, { progress: "dnf" }], ...ctx.range },
				_count: { _all: true },
			}),
			db.pollVote.count({ where: ctx.range }),
			db.goal.findMany({ where: { year }, select: { userId: true } }),
			db.userAchievement.findMany({
				where: { revokedAt: null },
				distinct: ["userId", "achievementKey"],
				select: { userId: true, achievementKey: true },
			}),
			db.user.findMany({ select: { xp: true, rp: true } }),
		]);

	const status = (name: string) =>
		sittingGroups.find((row) => row.status === name)?._count._all ?? 0;
	const progress = (name: string) =>
		progressGroups.find((row) => row.progress === name)?._count._all ?? 0;
	const completed = progress("completed");
	const finished = completed + progress("dnf");

	const holders = new Map<string, number>();
	for (const row of awards) {
		holders.set(row.achievementKey, (holders.get(row.achievementKey) ?? 0) + 1);
	}
	const listed = ACHIEVEMENTS.filter((definition) => !definition.isHidden).map(
		(definition) => ({
			slug: definition.slug,
			name: definition.name,
			earnedBy: holders.get(definition.key) ?? 0,
		}),
	);

	const levels = new Map<string, { min: number; count: number }>();
	for (const person of people) {
		const level = memberLevelsForPoints(person.xp, person.rp).xpLevel;
		const row = levels.get(level.label) ?? {
			min: level.minInclusive,
			count: 0,
		};
		row.count += 1;
		levels.set(level.label, row);
	}

	return {
		sittings: {
			total: sum(sittingGroups.map((row) => row._count._all)),
			voting: status("voting"),
			reading: status("reading"),
			finished: status("finished"),
			participations: sum(progressGroups.map((row) => row._count._all)),
			completionRate:
				finished > 0 ? Math.round((completed / finished) * 100) : null,
			votes,
			progress: [
				{ label: "Finished", count: completed },
				{ label: "Reading", count: progress("in_progress") },
				{ label: "Did not finish", count: progress("dnf") },
				{ label: "Not started", count: progress("not_started") },
			],
		},
		goals: {
			year,
			set: goals.length,
			members: new Set(goals.map((row) => row.userId)).size,
		},
		achievements: {
			awards: awards.length,
			members: new Set(awards.map((row) => row.userId)).size,
			mostEarned: [...listed]
				.sort((a, b) => b.earnedBy - a.earnedBy)
				.slice(0, TOP),
			rarest: listed
				.filter((item) => item.earnedBy > 0)
				.sort((a, b) => a.earnedBy - b.earnedBy || a.name.localeCompare(b.name))
				.slice(0, TOP),
		},
		standing: {
			totalXp: sum(people.map((row) => row.xp)),
			totalRp: sum(people.map((row) => row.rp)),
			levels: [...levels.entries()]
				.sort((a, b) => a[1].min - b[1].min)
				.map(([label, row]) => ({ label, count: row.count })),
		},
	};
}
