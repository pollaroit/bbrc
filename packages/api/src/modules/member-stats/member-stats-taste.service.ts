import type { Database, Prisma } from "@bbrc/db";
import {
	authorRows,
	averageNumber,
	countryRows,
	popularRows,
	ratedSubjectRows,
	ratedVersusClub,
	ratingHistogramForClubAverage,
	seriesRows,
	subjectBreakdown,
	type TasteBook,
	topBucketLabel,
	type Viewer,
} from "@bbrc/shared";
import { aggregateCountryBookCounts } from "../book/book-country-filter";
import { reviewVisibleWhere } from "../visibility/visibility-resources";
import type {
	MemberStatsInput,
	MemberStatsTasteOutput,
} from "./member-stats.schema";
import { loadMemberStatsContext, type StatsBook } from "./member-stats-context";

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

export async function getMemberStatsTaste(
	db: Database,
	viewer: Viewer,
	input: MemberStatsInput,
): Promise<MemberStatsTasteOutput> {
	const ctx = await loadMemberStatsContext(db, input, viewer);
	const { access } = ctx;

	// "All books" has no time axis, so every read counts; otherwise only the dated ones.
	const analytics = ctx.hasTimeAxis ? ctx.datedReads : ctx.reads;
	const rawBooks = analytics.map((read) => read.book);
	const books = rawBooks.map(toTasteBook);
	const ids = books.map((book) => book.id);

	// Ratings are the member's own reviews, and only the ones this viewer may see.
	const mine = new Map<string, number>();
	if (access.reads && access.reviews && ids.length > 0) {
		const rows = await db.feedback.findMany({
			where: {
				AND: [reviewVisibleWhere(viewer) as Prisma.FeedbackWhereInput],
				authorId: ctx.member.id,
				bookId: { in: ids },
			},
			select: { bookId: true, rating: true },
		});
		for (const row of rows) mine.set(row.bookId, row.rating);
	}
	const ratings = access.reviews ? mine : null;

	const [clubReadGroups, clubRatingGroups] =
		access.reads && ids.length > 0
			? await Promise.all([
					db.read.groupBy({
						by: ["bookId"],
						where: { bookId: { in: ids } },
						_count: { _all: true },
					}),
					ratings && mine.size > 0
						? db.feedback.groupBy({
								by: ["bookId"],
								where: { bookId: { in: [...mine.keys()] } },
								_sum: { rating: true },
								_count: { _all: true },
							})
						: Promise.resolve([]),
				])
			: [[], []];

	const clubReads = new Map(
		clubReadGroups.map((group) => [group.bookId, group._count._all]),
	);

	let ratedVsClub: MemberStatsTasteOutput["ratedVsClub"] = null;
	if (ratings) {
		const facts = new Map(
			clubRatingGroups.map((group) => [
				group.bookId,
				{
					ratingSum: group._sum.rating ?? 0,
					ratingCount: group._count._all,
				},
			]),
		);
		const byId = new Map(books.map((book) => [book.id, book]));
		const result = ratedVersusClub(
			[...mine.entries()].flatMap(([bookId, rating]) => {
				const club = facts.get(bookId);
				return club ? [{ bookId, mine: rating, club }] : [];
			}),
		);
		const rows = (list: typeof result.higher) =>
			list.flatMap((row) => {
				const book = byId.get(row.bookId);
				return book
					? [
							{
								book: {
									id: book.id,
									slug: book.slug,
									title: book.title,
									authors: book.authors,
									coverId: book.coverId,
								},
								mine: row.mine,
								othersAverage: row.othersAverage,
								othersCount: row.othersCount,
								delta: row.delta,
							},
						]
					: [];
			});
		ratedVsClub = {
			higher: rows(result.higher),
			lower: rows(result.lower),
			skipped: result.skipped,
		};
	}

	if (!access.reads) {
		return {
			access,
			hasTimeAxis: ctx.hasTimeAxis,
			subjects: { top: [], topRated: null },
			authors: { byCount: [], byRating: null },
			countries: { rows: [], map: [] },
			series: [],
			clubRating: { points: [], average: null, topBucket: null },
			popular: { most: [], least: [] },
			ratedVsClub: null,
		};
	}

	const clubRatingPoints = ratingHistogramForClubAverage(
		rawBooks.map((book) => book.averageRating),
	).filter((point) => point.label !== "unrated");

	return {
		access,
		hasTimeAxis: ctx.hasTimeAxis,
		subjects: {
			top: subjectBreakdown(books.map((book) => book.subjects)).map((row) => ({
				subject: row.subject,
				count: row.count,
				percent: row.percentage,
			})),
			topRated: ratings ? ratedSubjectRows(books, ratings) : null,
		},
		authors: authorRows(books, ratings),
		countries: {
			rows: countryRows(books, ratings),
			map: [...aggregateCountryBookCounts(books).entries()].map(
				([code, count]) => ({ code, count }),
			),
		},
		series: seriesRows(books),
		clubRating: {
			points: clubRatingPoints,
			average: averageNumber(
				rawBooks.flatMap((book) =>
					book.averageRating == null ? [] : [book.averageRating],
				),
			),
			topBucket: topBucketLabel(clubRatingPoints),
		},
		popular: popularRows(books, clubReads),
		ratedVsClub,
	};
}
