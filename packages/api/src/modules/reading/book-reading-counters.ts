import type { Database, DatabaseTransaction } from "@bbrc/db";
import { visibleOnSiteUserWhere } from "../user/user-visibility";

type Db = Database | DatabaseTransaction;

/**
 * Keeps the copies on `Book` (`readingNowCount`, `wishlistCount`) in step, so
 * the library can sort by them. Counts visible members only.
 */
export async function recomputeBookReadingCounters(db: Db, bookId: string) {
	const [readingNowCount, wishlistCount] = await Promise.all([
		db.reading.count({
			where: { bookId, finishedAt: null, user: { ...visibleOnSiteUserWhere } },
		}),
		db.shelfBook.count({
			where: {
				bookId,
				shelf: { isWishlist: true, user: { ...visibleOnSiteUserWhere } },
			},
		}),
	]);
	await db.book.update({
		where: { id: bookId },
		data: { readingNowCount, wishlistCount },
	});
}

/** Heals every book's copies (they only drift when a member is hidden or after a failure). */
export async function reconcileBookReadingCounters(db: Database) {
	const reading = await db.$executeRaw`
		UPDATE book b SET reading_now_count = coalesce(c.n, 0)
		FROM book b2
		LEFT JOIN (
			SELECT r.book_id, count(*)::int AS n FROM reading r
			JOIN "user" u ON u.id = r.user_id
			WHERE r.finished_at IS NULL AND NOT u.is_hidden GROUP BY r.book_id
		) c ON c.book_id = b2.id
		WHERE b2.id = b.id AND b.reading_now_count <> coalesce(c.n, 0)`;
	const wishlist = await db.$executeRaw`
		UPDATE book b SET wishlist_count = coalesce(c.n, 0)
		FROM book b2
		LEFT JOIN (
			SELECT sb.book_id, count(*)::int AS n FROM shelf_book sb
			JOIN shelf s ON s.id = sb.shelf_id AND s.is_wishlist
			JOIN "user" u ON u.id = s.user_id
			WHERE NOT u.is_hidden GROUP BY sb.book_id
		) c ON c.book_id = b2.id
		WHERE b2.id = b.id AND b.wishlist_count <> coalesce(c.n, 0)`;
	return reading + wishlist;
}
