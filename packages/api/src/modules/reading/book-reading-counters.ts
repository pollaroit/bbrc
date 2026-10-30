import type { Database, DatabaseTransaction } from "@bbrc/db";

type Db = Database | DatabaseTransaction;

/**
 * Keeps the copies on `Book` (`readingNowCount`, `wishlistCount`) in step, so
 * the library can sort by them. Counts include every member (counts never depend on privacy).
 */
export async function recomputeBookReadingCounters(db: Db, bookId: string) {
	const [readingNowCount, wishlistCount] = await Promise.all([
		db.reading.count({
			where: { bookId, finishedAt: null },
		}),
		db.shelfBook.count({
			where: {
				bookId,
				shelf: { isWishlist: true },
			},
		}),
	]);
	await db.book.update({
		where: { id: bookId },
		data: { readingNowCount, wishlistCount },
	});
}

/** Heals every book's copies (they only drift after a failure). */
export async function reconcileBookReadingCounters(db: Database) {
	const reading = await db.$executeRaw`
		UPDATE book b SET reading_now_count = coalesce(c.n, 0)
		FROM book b2
		LEFT JOIN (
			SELECT r.book_id, count(*)::int AS n FROM reading r
			WHERE r.finished_at IS NULL GROUP BY r.book_id
		) c ON c.book_id = b2.id
		WHERE b2.id = b.id AND b.reading_now_count <> coalesce(c.n, 0)`;
	const wishlist = await db.$executeRaw`
		UPDATE book b SET wishlist_count = coalesce(c.n, 0)
		FROM book b2
		LEFT JOIN (
			SELECT sb.book_id, count(*)::int AS n FROM shelf_book sb
			JOIN shelf s ON s.id = sb.shelf_id AND s.is_wishlist
			GROUP BY sb.book_id
		) c ON c.book_id = b2.id
		WHERE b2.id = b.id AND b.wishlist_count <> coalesce(c.n, 0)`;
	return reading + wishlist;
}
