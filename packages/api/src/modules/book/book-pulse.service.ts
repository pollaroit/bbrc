import type { Database } from "@bbrc/db";
import { ANONYMOUS_VIEWER } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { shelfVisibleWhere } from "../shelf/shelf-visibility";
import { countBookSittings } from "./book-sittings.service";

/** One bar of the rating histogram: whole stars (a half star rounds up to the next bar). */
export type BookRatingBar = { stars: 1 | 2 | 3 | 4 | 5; count: number };

/**
 * What the book header and its section tabs show at a glance: how the club
 * rated it, and how much there is to open behind each tab. Counts include
 * every member (privacy only hides names), so it is safe on a cached page.
 */
export type BookPulse = {
	/** Standing among all books (1 = top); null when the book has no such activity yet. */
	ranks: BookRanks;
	reviews: number;
	/** Reviews per whole-star bar, 5 stars first. */
	ratingBars: BookRatingBar[];
	documents: number;
	shelves: number;
	sittings: number;
};

export type BookRanks = {
	rating: number | null;
	reads: number | null;
	reading: number | null;
	wishlists: number | null;
};

/** Competition rank: 1 plus the number of books strictly ahead, so ties share a place. Null for no activity. */
export function standing(
	value: number,
	others: Iterable<number>,
): number | null {
	if (!(value > 0)) return null;
	let ahead = 0;
	for (const other of others) if (other > value) ahead += 1;
	return ahead + 1;
}

const STARS = [5, 4, 3, 2, 1] as const;

export function bucketRatings(
	rows: { rating: number; count: number }[],
): BookRatingBar[] {
	const counts = new Map<number, number>(STARS.map((stars) => [stars, 0]));
	for (const row of rows) {
		const stars = Math.min(5, Math.max(1, Math.ceil(row.rating)));
		counts.set(stars, (counts.get(stars) ?? 0) + row.count);
	}
	return STARS.map((stars) => ({ stars, count: counts.get(stars) ?? 0 }));
}

export async function getBookPulse(
	bookSlug: string,
	db: Database,
): Promise<BookPulse> {
	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: {
			id: true,
			averageRating: true,
			readingNowCount: true,
			wishlistCount: true,
		},
	});
	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug: bookSlug },
		});
	}

	const [ratingRows, documents, shelves, sittings, readGroups, aheadRows] =
		await Promise.all([
			db.feedback.groupBy({
				by: ["rating"],
				where: { bookId: book.id },
				_count: { _all: true },
			}),
			db.document.count({ where: { bookId: book.id, status: "approved" } }),
			db.shelf.count({
				where: {
					books: { some: { bookId: book.id } },
					isWishlist: false,
					...shelfVisibleWhere(ANONYMOUS_VIEWER, { listing: true }),
				},
			}),
			countBookSittings(bookSlug, db),
			db.read.groupBy({ by: ["bookId"], _count: { _all: true } }),
			Promise.all([
				book.averageRating != null
					? db.book.count({
							where: { averageRating: { gt: book.averageRating } },
						})
					: Promise.resolve(0),
				db.book.count({
					where: { readingNowCount: { gt: book.readingNowCount } },
				}),
				db.book.count({ where: { wishlistCount: { gt: book.wishlistCount } } }),
			]),
		]);

	const [ratingAhead, readingAhead, wishlistAhead] = aheadRows;
	const readsByBook = readGroups.map((row) => row._count._all);
	const myReads =
		readGroups.find((row) => row.bookId === book.id)?._count._all ?? 0;

	const ratingBars = bucketRatings(
		ratingRows.map((row) => ({
			rating: row.rating,
			count: row._count._all,
		})),
	);

	return {
		ranks: {
			rating: book.averageRating != null ? ratingAhead + 1 : null,
			reads: standing(myReads, readsByBook),
			reading: book.readingNowCount > 0 ? readingAhead + 1 : null,
			wishlists: book.wishlistCount > 0 ? wishlistAhead + 1 : null,
		},
		reviews: ratingBars.reduce((sum, bar) => sum + bar.count, 0),
		ratingBars,
		documents,
		shelves,
		sittings,
	};
}
