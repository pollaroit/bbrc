import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import {
	bucketByDecade,
	describeRelatedReasons,
	formatAuthorLifespan,
	formatSittingDisplayName,
	getBookCountryName,
	median,
	ratingDistribution,
	scoreRelatedAuthor,
} from "@bbrc/shared";
import { publicShelfWhere } from "../shelf/shelf-visibility";
import {
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "../user/user-visibility";
import type {
	AuthorFavoritesOutput,
	AuthorMoreOutput,
	AuthorSeriesOutput,
	AuthorShelvesOutput,
	AuthorSittingItem,
	AuthorSittingsOutput,
	AuthorStatsOutput,
	RelatedAuthor,
} from "./author.schema";
import {
	averageRatingOf,
	bookRef,
	EMPTY_AGGREGATE,
	loadAuthorAggregates,
	loadAuthorBookRows,
	nationalityList,
	offsetMetadata,
	pageInMemory,
	parseOffsetCursor,
} from "./author-data";
import { resolveAuthor } from "./author-resolve";
import { loadAuthorSeries } from "./author-series";

const RELATED_AUTHORS_LIMIT = 12;
const LEADERBOARD_LIMIT = 10;

type TabPaging = { cursor?: string; limit: number };

const byAuthor = (authorId: string) =>
	({ authorLinks: { some: { authorId } } }) satisfies Prisma.BookWhereInput;

const userRef = {
	select: { username: true, name: true, image: true },
} as const;

// ── Related authors ────────────────────────────────────────────────────────

export async function getAuthorMore(
	slug: string,
	db: Database,
	session: Session | null,
): Promise<AuthorMoreOutput> {
	const viewer = viewerFromSession(session);
	const resolved = await resolveAuthor(db, slug, viewer);
	const source = await db.author.findUniqueOrThrow({
		where: { id: resolved.id },
		select: { nationalities: true, birthYear: true },
	});

	const [candidates, sourceReads] = await Promise.all([
		db.author.findMany({
			where: { id: { not: resolved.id }, books: { some: {} } },
			select: {
				id: true,
				slug: true,
				name: true,
				nationalities: true,
				birthYear: true,
				deathYear: true,
				photoUrl: true,
			},
		}),
		db.read.findMany({
			where: { book: byAuthor(resolved.id), user: visibleOnSiteUserWhere },
			select: { userId: true },
		}),
	]);

	// Members who read this author, and which other authors they also read.
	const readerIds = [...new Set(sourceReads.map((row) => row.userId))];
	const coReaders = new Map<string, Set<string>>();
	if (readerIds.length > 0) {
		const others = await db.read.findMany({
			where: {
				userId: { in: readerIds },
				book: { authorLinks: { some: { authorId: { not: resolved.id } } } },
			},
			select: {
				userId: true,
				book: { select: { authorLinks: { select: { authorId: true } } } },
			},
		});
		for (const row of others) {
			for (const link of row.book.authorLinks) {
				if (link.authorId === resolved.id) continue;
				const members = coReaders.get(link.authorId) ?? new Set<string>();
				members.add(row.userId);
				coReaders.set(link.authorId, members);
			}
		}
	}

	const ranked = candidates
		.map((candidate) => ({
			candidate,
			...scoreRelatedAuthor({
				source,
				candidate,
				coReaders: coReaders.get(candidate.id)?.size ?? 0,
			}),
		}))
		.filter((entry) => entry.score > 0)
		.toSorted(
			(a, b) =>
				b.score - a.score || a.candidate.name.localeCompare(b.candidate.name),
		)
		.slice(0, RELATED_AUTHORS_LIMIT);

	const aggregates = await loadAuthorAggregates(
		db,
		ranked.map((entry) => entry.candidate.id),
	);

	const items: RelatedAuthor[] = ranked.map(({ candidate, score, reasons }) => {
		const aggregate = aggregates.get(candidate.id) ?? EMPTY_AGGREGATE;
		return {
			slug: candidate.slug,
			name: candidate.name,
			photoUrl: candidate.photoUrl,
			lifespan: formatAuthorLifespan({
				birth: { year: candidate.birthYear },
				death: { year: candidate.deathYear },
			}),
			nationalities: nationalityList(candidate.nationalities),
			bookCount: aggregate.bookCount,
			score,
			reasons,
			reasonText: describeRelatedReasons(
				reasons,
				(code) => getBookCountryName(code) ?? code,
			),
			coverIds: aggregate.coverIds,
		};
	});
	return { items };
}

// ── Sittings ───────────────────────────────────────────────────────────────

export async function getAuthorSittings(
	input: TabPaging & { slug: string },
	db: Database,
	session: Session | null,
): Promise<AuthorSittingsOutput> {
	const author = await resolveAuthor(
		db,
		input.slug,
		viewerFromSession(session),
	);
	const own = await db.bookAuthor.findMany({
		where: { authorId: author.id },
		select: { bookId: true },
	});
	const ownIds = new Set(own.map((row) => row.bookId));
	const bookSelect = {
		id: true,
		slug: true,
		title: true,
		authors: true,
		coverId: true,
	} as const;

	const sittings = await db.sitting.findMany({
		where: {
			OR: [
				{ selectedBook: byAuthor(author.id) },
				{ poll: { options: { some: { book: byAuthor(author.id) } } } },
			],
		},
		select: {
			slug: true,
			status: true,
			createdAt: true,
			deadline: true,
			readingStartedAt: true,
			selectedBookId: true,
			selectedBook: { select: bookSelect },
			participants: {
				where: { removedAt: null, user: visibleOnSiteUserWhere },
				select: { progress: true },
			},
			poll: {
				select: {
					deadline: true,
					options: { select: { book: { select: bookSelect } } },
				},
			},
		},
	});

	const items: AuthorSittingItem[] = sittings.map((sitting) => {
		const picked =
			sitting.selectedBookId != null && ownIds.has(sitting.selectedBookId);
		const outcome: AuthorSittingItem["outcome"] = picked
			? "picked"
			: sitting.status === "voting"
				? "in_poll"
				: "not_picked";

		const involved = new Map<string, ReturnType<typeof bookRef>>();
		if (sitting.selectedBook && ownIds.has(sitting.selectedBook.id)) {
			involved.set(sitting.selectedBook.id, bookRef(sitting.selectedBook));
		}
		for (const option of sitting.poll?.options ?? []) {
			if (ownIds.has(option.book.id)) {
				involved.set(option.book.id, bookRef(option.book));
			}
		}

		const date = sitting.poll?.deadline ?? sitting.createdAt;
		return {
			slug: sitting.slug,
			displayName: formatSittingDisplayName(
				sitting.slug,
				sitting.status,
				sitting.selectedBook?.title,
			),
			status: sitting.status,
			outcome,
			date: date.toISOString(),
			deadline: sitting.deadline.toISOString(),
			pollDeadline: sitting.poll?.deadline.toISOString() ?? null,
			readingStartedAt: sitting.readingStartedAt?.toISOString() ?? null,
			books: [...involved.values()],
			pickedBook: sitting.selectedBook ? bookRef(sitting.selectedBook) : null,
			participantCount: picked ? sitting.participants.length : 0,
			completedCount: picked
				? sitting.participants.filter((p) => p.progress === "completed").length
				: 0,
		};
	});

	items.sort((a, b) => b.date.localeCompare(a.date));
	return pageInMemory(items, input.cursor, input.limit);
}

// ── Favorites ──────────────────────────────────────────────────────────────

export async function getAuthorFavorites(
	input: TabPaging & { slug: string },
	db: Database,
	session: Session | null,
): Promise<AuthorFavoritesOutput> {
	const author = await resolveAuthor(
		db,
		input.slug,
		viewerFromSession(session),
	);
	const rows = await db.favorite.findMany({
		where: { book: byAuthor(author.id), user: visibleOnSiteUserWhere },
		orderBy: { createdAt: "desc" },
		select: {
			createdAt: true,
			userId: true,
			user: userRef,
			book: {
				select: { slug: true, title: true, authors: true, coverId: true },
			},
		},
	});

	const perBook = new Map<
		string,
		{ book: ReturnType<typeof bookRef>; count: number }
	>();
	const perMember = new Map<
		string,
		{
			member: (typeof rows)[number]["user"];
			books: ReturnType<typeof bookRef>[];
			favoritedAt: string;
		}
	>();
	for (const row of rows) {
		const entry = perBook.get(row.book.slug) ?? {
			book: bookRef(row.book),
			count: 0,
		};
		entry.count += 1;
		perBook.set(row.book.slug, entry);

		const member = perMember.get(row.userId) ?? {
			member: row.user,
			books: [],
			favoritedAt: row.createdAt.toISOString(),
		};
		member.books.push(bookRef(row.book));
		perMember.set(row.userId, member);
	}

	return {
		totalFavorites: rows.length,
		memberCount: perMember.size,
		books: [...perBook.values()].toSorted(
			(a, b) => b.count - a.count || a.book.title.localeCompare(b.book.title),
		),
		// Rows come newest first, so members are already ordered by their latest favorite.
		members: pageInMemory([...perMember.values()], input.cursor, input.limit),
	};
}

// ── Shelves ────────────────────────────────────────────────────────────────

export async function getAuthorShelves(
	input: TabPaging & { slug: string },
	db: Database,
	session: Session | null,
): Promise<AuthorShelvesOutput> {
	const author = await resolveAuthor(
		db,
		input.slug,
		viewerFromSession(session),
	);
	const where: Prisma.ShelfWhereInput = {
		...publicShelfWhere,
		books: { some: { book: byAuthor(author.id) } },
	};
	const skip = parseOffsetCursor(input.cursor);

	const [total, rows] = await Promise.all([
		skip === 0 ? db.shelf.count({ where }) : Promise.resolve(undefined),
		db.shelf.findMany({
			where,
			skip,
			take: input.limit + 1,
			orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
			select: {
				id: true,
				slug: true,
				title: true,
				description: true,
				coverImageUrl: true,
				type: true,
				updatedAt: true,
				user: userRef,
				_count: { select: { books: true } },
				books: {
					orderBy: { position: "asc" },
					take: 4,
					select: { book: { select: { coverId: true } } },
				},
			},
		}),
	]);

	const hasNextPage = rows.length > input.limit;
	const page = hasNextPage ? rows.slice(0, input.limit) : rows;
	const ownCounts =
		page.length === 0
			? []
			: await db.shelfBook.groupBy({
					by: ["shelfId"],
					where: {
						shelfId: { in: page.map((row) => row.id) },
						book: byAuthor(author.id),
					},
					_count: { _all: true },
				});
	const ownByShelf = new Map(
		ownCounts.map((row) => [row.shelfId, row._count._all]),
	);

	return {
		items: page.map((row) => ({
			slug: row.slug,
			title: row.title,
			description: row.description,
			coverImageUrl: row.coverImageUrl,
			type: row.type,
			owner: row.user,
			bookCount: row._count.books,
			authorBookCount: ownByShelf.get(row.id) ?? 0,
			updatedAt: row.updatedAt,
			coverPreviewCoverIds: row.books.map((entry) => entry.book.coverId),
		})),
		metadata: offsetMetadata({
			limit: input.limit,
			skip,
			shown: page.length,
			hasNextPage,
			total,
		}),
	};
}

// ── Series ─────────────────────────────────────────────────────────────────

export async function getAuthorSeries(
	slug: string,
	db: Database,
	session: Session | null,
): Promise<AuthorSeriesOutput> {
	const viewer = viewerFromSession(session);
	const author = await resolveAuthor(db, slug, viewer);
	return {
		items: await loadAuthorSeries(db, author.id, viewer?.userId ?? null),
	};
}

// ── Stats ──────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

export async function getAuthorStats(
	slug: string,
	db: Database,
	session: Session | null,
): Promise<AuthorStatsOutput> {
	const author = await resolveAuthor(db, slug, viewerFromSession(session));
	const books = await loadAuthorBookRows(db, author.id);
	const bookIds = books.map((book) => book.id);
	const refById = new Map(books.map((book) => [book.id, bookRef(book)]));

	const [reads, feedback, readings] =
		bookIds.length === 0
			? [[], [], []]
			: await Promise.all([
					db.read.findMany({
						where: { bookId: { in: bookIds }, user: visibleOnSiteUserWhere },
						select: {
							bookId: true,
							userId: true,
							readEndYear: true,
							user: userRef,
						},
					}),
					db.feedback.findMany({
						where: { bookId: { in: bookIds }, author: visibleOnSiteUserWhere },
						select: { bookId: true, rating: true },
					}),
					db.reading.findMany({
						where: {
							bookId: { in: bookIds },
							finishedAt: { not: null },
							user: visibleOnSiteUserWhere,
						},
						select: { bookId: true, startedAt: true, finishedAt: true },
					}),
				]);

	const ref = (bookId: string) => refById.get(bookId);

	const readsByBook = new Map<string, number>();
	for (const read of reads) {
		readsByBook.set(read.bookId, (readsByBook.get(read.bookId) ?? 0) + 1);
	}
	const reviewsByBook = new Map<string, { count: number; sum: number }>();
	for (const review of feedback) {
		const entry = reviewsByBook.get(review.bookId) ?? { count: 0, sum: 0 };
		entry.count += 1;
		entry.sum += review.rating;
		reviewsByBook.set(review.bookId, entry);
	}

	const top = <T>(
		entries: Iterable<[string, T]>,
		score: (value: T) => number,
	): [string, T] | null => {
		let best: [string, T] | null = null;
		for (const entry of entries) {
			if (score(entry[1]) <= 0) continue;
			if (
				!best ||
				score(entry[1]) > score(best[1]) ||
				(score(entry[1]) === score(best[1]) &&
					(ref(entry[0])?.title ?? "").localeCompare(
						ref(best[0])?.title ?? "",
					) < 0)
			) {
				best = entry;
			}
		}
		return best;
	};

	const mostRead = top(readsByBook, (count) => count);
	const mostReviewed = top(reviewsByBook, (entry) => entry.count);
	let highest: { bookId: string; rating: number; reviewCount: number } | null =
		null;
	for (const [bookId, entry] of reviewsByBook) {
		const rating = entry.sum / entry.count;
		if (
			!highest ||
			rating > highest.rating ||
			(rating === highest.rating && entry.count > highest.reviewCount)
		) {
			highest = { bookId, rating, reviewCount: entry.count };
		}
	}

	// Reading time, from finished readings.
	const daysByBook = new Map<string, number[]>();
	const allDays: number[] = [];
	for (const reading of readings) {
		if (!reading.finishedAt) continue;
		const days =
			(reading.finishedAt.getTime() - reading.startedAt.getTime()) / DAY_MS;
		if (days < 0) continue;
		allDays.push(days);
		const list = daysByBook.get(reading.bookId) ?? [];
		list.push(days);
		daysByBook.set(reading.bookId, list);
	}
	const round1 = (value: number) => Math.round(value * 10) / 10;
	const average = (values: number[]) =>
		values.reduce((sum, value) => sum + value, 0) / values.length;

	// Readers leaderboard and reads per year.
	const perMember = new Map<
		string,
		{ member: (typeof reads)[number]["user"]; count: number }
	>();
	const perYear = new Map<number, number>();
	for (const read of reads) {
		const entry = perMember.get(read.userId) ?? { member: read.user, count: 0 };
		entry.count += 1;
		perMember.set(read.userId, entry);
		if (read.readEndYear != null) {
			perYear.set(read.readEndYear, (perYear.get(read.readEndYear) ?? 0) + 1);
		}
	}

	const aggregates = await loadAuthorAggregates(db, [author.id]);
	const aggregate = aggregates.get(author.id) ?? EMPTY_AGGREGATE;

	const mostReadRef = mostRead ? ref(mostRead[0]) : undefined;
	const mostReviewedRef = mostReviewed ? ref(mostReviewed[0]) : undefined;
	const highestRef = highest ? ref(highest.bookId) : undefined;

	return {
		totalBooks: books.length,
		ratings: {
			average: averageRatingOf(aggregate),
			count: feedback.length,
			distribution: ratingDistribution(feedback.map((row) => row.rating)),
		},
		mostReadBook:
			mostRead && mostReadRef
				? { book: mostReadRef, readCount: mostRead[1] }
				: null,
		mostReviewedBook:
			mostReviewed && mostReviewedRef
				? { book: mostReviewedRef, reviewCount: mostReviewed[1].count }
				: null,
		highestRatedBook:
			highest && highestRef
				? {
						book: highestRef,
						rating: Math.round(highest.rating * 100) / 100,
						reviewCount: highest.reviewCount,
					}
				: null,
		readingTime: {
			finishedCount: allDays.length,
			averageDays: allDays.length > 0 ? round1(average(allDays)) : null,
			medianDays: (() => {
				const middle = median(allDays);
				return middle == null ? null : round1(middle);
			})(),
			perBook: [...daysByBook.entries()]
				.flatMap(([bookId, days]) => {
					const bookReference = ref(bookId);
					return bookReference
						? [
								{
									book: bookReference,
									averageDays: round1(average(days)),
									readers: days.length,
								},
							]
						: [];
				})
				.toSorted((a, b) => a.averageDays - b.averageDays),
		},
		leaderboard: [...perMember.values()]
			.toSorted(
				(a, b) =>
					b.count - a.count || a.member.name.localeCompare(b.member.name),
			)
			.slice(0, LEADERBOARD_LIMIT)
			.map((entry) => ({
				member: entry.member,
				readCount: entry.count,
				totalBooks: books.length,
			})),
		booksPerDecade: bucketByDecade(books.map((book) => book.publishedIn)),
		readsPerYear: [...perYear.entries()]
			.map(([year, count]) => ({ year, count }))
			.sort((a, b) => a.year - b.year),
	};
}

// Moved: kept here so server-side callers keep their import path.
export {
	getAuthorReads,
	getAuthorReviews,
} from "./author-activity.service";
export { getAuthorBooks } from "./author-books.service";
