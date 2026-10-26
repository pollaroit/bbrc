import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";
import {
	bucketByDecade,
	bucketPageCounts,
	bucketReadingDays,
	compareStat,
	cumulativeSeries,
	daysBetween,
	fillMonthSeries,
	getBookCountryName,
	mean,
	median,
	monthKey,
	monthKeyOfDate,
	previousRange,
	ratingDistribution,
	roundTo,
	seasonality,
} from "@bbrc/shared";
import { resolveAuthor } from "../author/author-resolve";
import {
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "../user/user-visibility";
import type { AuthorInsightStatsOutput } from "./author-insights.schema";
import { bookRef, byAuthor, memberRefSelect } from "./insights-common";

const LEADERBOARD_LIMIT = 10;
const SUBJECT_LIMIT = 12;
const COUNTRY_LIMIT = 12;

type Window = { from?: Date; to?: Date };

type BookRow = {
	id: string;
	slug: string;
	title: string;
	authors: string[];
	coverId: number | null;
	publishedIn: number;
	pages: number;
	subjects: string[];
	countries: string[];
	wishlistCount: number;
	readingNowCount: number;
};

type ReadRow = {
	userId: string;
	bookId: string;
	readEndYear: number | null;
	readEndMonth: number | null;
	user: { username: string; name: string; image: string | null };
};

type FeedbackRow = { bookId: string; rating: number; createdAt: Date };
type ReadingRow = { bookId: string; startedAt: Date; finishedAt: Date };

function isOpenWindow(window: Window) {
	return !window.from && !window.to;
}

/** A read counts when its finish month overlaps the window; undated reads only without a window. */
function readInWindow(read: ReadRow, window: Window): boolean {
	if (isOpenWindow(window)) return true;
	if (read.readEndYear == null) return false;
	const month = read.readEndMonth ?? 1;
	const start = Date.UTC(read.readEndYear, month - 1, 1);
	// A read with a year only covers the whole year.
	const end =
		read.readEndMonth == null
			? Date.UTC(read.readEndYear + 1, 0, 1) - 1
			: Date.UTC(read.readEndYear, month, 1) - 1;
	if (window.from && end < window.from.getTime()) return false;
	if (window.to && start > window.to.getTime()) return false;
	return true;
}

function dateInWindow(date: Date, window: Window): boolean {
	if (window.from && date < window.from) return false;
	if (window.to && date > window.to) return false;
	return true;
}

function readMonthKey(read: ReadRow): string | null {
	if (read.readEndYear == null || read.readEndMonth == null) return null;
	return monthKey(read.readEndYear, read.readEndMonth);
}

type Headline = {
	readers: number;
	reads: number;
	reviews: number;
	averageRating: number;
	pagesRead: number;
	averageDays: number;
	followers: number;
};

function headline(
	window: Window,
	data: {
		books: Map<string, BookRow>;
		reads: ReadRow[];
		feedback: FeedbackRow[];
		readings: ReadingRow[];
		followDates: Date[];
	},
): Headline {
	const reads = data.reads.filter((read) => readInWindow(read, window));
	const feedback = data.feedback.filter((row) =>
		dateInWindow(row.createdAt, window),
	);
	const readings = data.readings.filter((row) =>
		dateInWindow(row.finishedAt, window),
	);
	return {
		readers: new Set(reads.map((read) => read.userId)).size,
		reads: reads.length,
		reviews: feedback.length,
		averageRating: roundTo(mean(feedback.map((row) => row.rating)) ?? 0, 2),
		pagesRead: reads.reduce(
			(sum, read) => sum + (data.books.get(read.bookId)?.pages ?? 0),
			0,
		),
		averageDays: roundTo(
			mean(readings.map((row) => daysBetween(row.startedAt, row.finishedAt))) ??
				0,
			1,
		),
		followers: data.followDates.filter((date) => dateInWindow(date, window))
			.length,
	};
}

export async function getAuthorInsightStats(
	input: {
		slug: string;
		bookSlugs?: string[];
		readerUsernames?: string[];
		rangeMin?: Date;
		rangeMax?: Date;
	},
	db: Database,
	session: Session | null,
): Promise<AuthorInsightStatsOutput> {
	const author = await resolveAuthor(
		db,
		input.slug,
		viewerFromSession(session),
	);
	const window: Window = { from: input.rangeMin, to: input.rangeMax };
	const previous = previousRange(window);
	const readerFilter = input.readerUsernames?.length
		? { username: { in: input.readerUsernames } }
		: {};

	const bookRows: BookRow[] = await db.book.findMany({
		where: {
			...byAuthor(author.id),
			...(input.bookSlugs?.length ? { slug: { in: input.bookSlugs } } : {}),
		},
		select: {
			id: true,
			slug: true,
			title: true,
			authors: true,
			coverId: true,
			publishedIn: true,
			pages: true,
			subjects: true,
			countries: true,
			wishlistCount: true,
			readingNowCount: true,
		},
	});
	const books = new Map(bookRows.map((book) => [book.id, book]));
	const bookIds = bookRows.map((book) => book.id);

	const [reads, feedback, readings, follows] = await Promise.all([
		bookIds.length === 0
			? Promise.resolve([] as ReadRow[])
			: db.read.findMany({
					where: {
						bookId: { in: bookIds },
						user: { ...visibleOnSiteUserWhere, ...readerFilter },
					},
					select: {
						userId: true,
						bookId: true,
						readEndYear: true,
						readEndMonth: true,
						user: memberRefSelect,
					},
				}),
		bookIds.length === 0
			? Promise.resolve([] as FeedbackRow[])
			: db.feedback.findMany({
					where: {
						bookId: { in: bookIds },
						author: { ...visibleOnSiteUserWhere, ...readerFilter },
					},
					select: { bookId: true, rating: true, createdAt: true },
				}),
		bookIds.length === 0
			? Promise.resolve([] as ReadingRow[])
			: db.reading
					.findMany({
						where: {
							bookId: { in: bookIds },
							finishedAt: { not: null },
							user: { ...visibleOnSiteUserWhere, ...readerFilter },
						},
						select: { bookId: true, startedAt: true, finishedAt: true },
					})
					.then((rows) =>
						rows.flatMap((row) =>
							row.finishedAt
								? [
										{
											bookId: row.bookId,
											startedAt: row.startedAt,
											finishedAt: row.finishedAt,
										},
									]
								: [],
						),
					),
		db.follow.findMany({
			where: { authorId: author.id },
			select: { createdAt: true },
		}),
	]);

	const followDates = follows.map((follow) => follow.createdAt);
	const data = {
		books,
		reads: reads as ReadRow[],
		feedback,
		readings,
		followDates,
	};

	// ── Cards ────────────────────────────────────────────────────────────────
	const current = headline(window, data);
	const before = previous ? headline(previous, data) : null;
	const pick = (key: keyof Headline) =>
		compareStat(current[key], before ? before[key] : null);

	const inWindowReads = (reads as ReadRow[]).filter((read) =>
		readInWindow(read, window),
	);
	const hasRange = !isOpenWindow(window);
	const undatedReads = (reads as ReadRow[]).filter(
		(read) => read.readEndYear == null,
	).length;

	// ── Reads in time ────────────────────────────────────────────────────────
	const perMonth = new Map<string, number>();
	const perYear = new Map<number, number>();
	for (const read of inWindowReads) {
		if (read.readEndYear != null) {
			perYear.set(read.readEndYear, (perYear.get(read.readEndYear) ?? 0) + 1);
		}
		const key = readMonthKey(read);
		if (key) perMonth.set(key, (perMonth.get(key) ?? 0) + 1);
	}

	// First read of each member (by month) → readers growth.
	const firstRead = new Map<string, string>();
	for (const read of inWindowReads) {
		const key = readMonthKey(read);
		if (!key) continue;
		const known = firstRead.get(read.userId);
		if (!known || key < known) firstRead.set(read.userId, key);
	}
	const newReaders = new Map<string, number>();
	for (const key of firstRead.values()) {
		newReaders.set(key, (newReaders.get(key) ?? 0) + 1);
	}

	// ── Reviews ──────────────────────────────────────────────────────────────
	const feedbackInWindow = feedback.filter((row) =>
		dateInWindow(row.createdAt, window),
	);
	const reviewsPerMonth = new Map<string, number>();
	const ratingSumPerMonth = new Map<string, number>();
	const reviewsByBook = new Map<string, { count: number; sum: number }>();
	for (const row of feedbackInWindow) {
		const key = monthKeyOfDate(row.createdAt);
		reviewsPerMonth.set(key, (reviewsPerMonth.get(key) ?? 0) + 1);
		ratingSumPerMonth.set(key, (ratingSumPerMonth.get(key) ?? 0) + row.rating);
		const entry = reviewsByBook.get(row.bookId) ?? { count: 0, sum: 0 };
		entry.count += 1;
		entry.sum += row.rating;
		reviewsByBook.set(row.bookId, entry);
	}
	const reviewSeries = fillMonthSeries(reviewsPerMonth);

	// ── Per book ─────────────────────────────────────────────────────────────
	const readsByBook = new Map<string, number>();
	for (const read of inWindowReads) {
		readsByBook.set(read.bookId, (readsByBook.get(read.bookId) ?? 0) + 1);
	}
	const bookStat = (book: BookRow) => ({
		book: bookRef(book),
		publishedIn: book.publishedIn,
		pages: book.pages,
	});
	const averageOf = (bookId: string) => {
		const entry = reviewsByBook.get(bookId);
		return entry ? roundTo(entry.sum / entry.count, 2) : null;
	};

	// ── Reading time ─────────────────────────────────────────────────────────
	const readingsInWindow = readings.filter((row) =>
		dateInWindow(row.finishedAt, window),
	);
	const dayValues: number[] = [];
	const daysByBook = new Map<string, number[]>();
	for (const row of readingsInWindow) {
		const days = daysBetween(row.startedAt, row.finishedAt);
		dayValues.push(days);
		const list = daysByBook.get(row.bookId) ?? [];
		list.push(days);
		daysByBook.set(row.bookId, list);
	}
	const medianDays = median(dayValues);

	// ── Subjects, origins and pages (one count per read) ─────────────────────
	const subjectCounts = new Map<string, number>();
	const countryCounts = new Map<string, number>();
	const pageValues: number[] = [];
	for (const read of inWindowReads) {
		const book = books.get(read.bookId);
		if (!book) continue;
		pageValues.push(book.pages);
		for (const subject of book.subjects) {
			subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + 1);
		}
		for (const code of book.countries) {
			countryCounts.set(code, (countryCounts.get(code) ?? 0) + 1);
		}
	}

	// ── Leaderboard ──────────────────────────────────────────────────────────
	const perMember = new Map<
		string,
		{ member: ReadRow["user"]; count: number }
	>();
	for (const read of inWindowReads) {
		const entry = perMember.get(read.userId) ?? { member: read.user, count: 0 };
		entry.count += 1;
		perMember.set(read.userId, entry);
	}

	// ── Follower growth (counts only) ────────────────────────────────────────
	const followsPerMonth = new Map<string, number>();
	for (const date of followDates) {
		if (!dateInWindow(date, window)) continue;
		const key = monthKeyOfDate(date);
		followsPerMonth.set(key, (followsPerMonth.get(key) ?? 0) + 1);
	}

	return {
		redirectTo: author.redirectTo,
		scope: {
			bookCount: bookRows.length,
			hasRange,
			hasComparison: previous != null,
			undatedReads,
		},
		cards: {
			books: compareStat(bookRows.length, null),
			readers: pick("readers"),
			reads: pick("reads"),
			reviews: pick("reviews"),
			averageRating: pick("averageRating"),
			pagesRead: pick("pagesRead"),
			averageDaysToFinish: pick("averageDays"),
			followers: hasRange
				? pick("followers")
				: compareStat(followDates.length, null),
		},
		readsPerMonth: fillMonthSeries(perMonth),
		readsPerYear: [...perYear.entries()]
			.map(([year, count]) => ({ year, count }))
			.sort((a, b) => a.year - b.year),
		readsByMonthOfYear: seasonality(
			inWindowReads.map((read) => read.readEndMonth),
		),
		readersGrowth: cumulativeSeries(fillMonthSeries(newReaders)),
		ratingDistribution: ratingDistribution(
			feedbackInWindow.map((row) => row.rating),
		),
		ratingOverTime: reviewSeries.map((point) => ({
			month: point.month,
			average:
				point.count === 0
					? 0
					: roundTo((ratingSumPerMonth.get(point.month) ?? 0) / point.count, 2),
			count: point.count,
		})),
		reviewsPerMonth: reviewSeries,
		ratingsPerBook: bookRows
			.map((book) => ({
				...bookStat(book),
				average: averageOf(book.id),
				reviewCount: reviewsByBook.get(book.id)?.count ?? 0,
			}))
			.toSorted(
				(a, b) =>
					(b.average ?? -1) - (a.average ?? -1) ||
					b.reviewCount - a.reviewCount ||
					a.book.title.localeCompare(b.book.title),
			),
		readsPerBook: bookRows
			.map((book) => ({
				...bookStat(book),
				readCount: readsByBook.get(book.id) ?? 0,
				readersNow: book.readingNowCount,
				wishlistCount: book.wishlistCount,
			}))
			.toSorted(
				(a, b) =>
					b.readCount - a.readCount || a.book.title.localeCompare(b.book.title),
			),
		booksPerDecade: bucketByDecade(bookRows.map((book) => book.publishedIn)),
		publicationTimeline: bookRows
			.map((book) => ({
				...bookStat(book),
				readCount: readsByBook.get(book.id) ?? 0,
				average: averageOf(book.id),
			}))
			.toSorted((a, b) => a.publishedIn - b.publishedIn),
		readingTime: {
			finishedCount: dayValues.length,
			averageDays:
				dayValues.length > 0 ? roundTo(mean(dayValues) ?? 0, 1) : null,
			medianDays: medianDays == null ? null : roundTo(medianDays, 1),
			distribution: bucketReadingDays(dayValues),
			perBook: [...daysByBook.entries()]
				.flatMap(([bookId, days]) => {
					const book = books.get(bookId);
					return book
						? [
								{
									book: bookRef(book),
									averageDays: roundTo(mean(days) ?? 0, 1),
									readers: days.length,
								},
							]
						: [];
				})
				.toSorted((a, b) => a.averageDays - b.averageDays),
		},
		pageCounts: bucketPageCounts(pageValues),
		subjects: [...subjectCounts.entries()]
			.map(([subject, count]) => ({ subject, count }))
			.sort((a, b) => b.count - a.count || a.subject.localeCompare(b.subject))
			.slice(0, SUBJECT_LIMIT),
		originCountries: [...countryCounts.entries()]
			.map(([code, count]) => ({
				code,
				name: getBookCountryName(code) ?? code,
				count,
			}))
			.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
			.slice(0, COUNTRY_LIMIT),
		leaderboard: [...perMember.values()]
			.toSorted(
				(a, b) =>
					b.count - a.count || a.member.name.localeCompare(b.member.name),
			)
			.slice(0, LEADERBOARD_LIMIT)
			.map((entry) => ({
				member: entry.member,
				readCount: entry.count,
				totalBooks: bookRows.length,
			})),
		followerGrowth: cumulativeSeries(fillMonthSeries(followsPerMonth)),
		funnel: {
			totals: {
				wishlist: bookRows.reduce((sum, book) => sum + book.wishlistCount, 0),
				readingNow: bookRows.reduce(
					(sum, book) => sum + book.readingNowCount,
					0,
				),
				read: inWindowReads.length,
			},
			perBook: bookRows
				.map((book) => ({
					book: bookRef(book),
					wishlist: book.wishlistCount,
					readingNow: book.readingNowCount,
					read: readsByBook.get(book.id) ?? 0,
				}))
				.toSorted(
					(a, b) =>
						b.read +
							b.readingNow +
							b.wishlist -
							(a.read + a.readingNow + a.wishlist) ||
						a.book.title.localeCompare(b.book.title),
				),
		},
	};
}
