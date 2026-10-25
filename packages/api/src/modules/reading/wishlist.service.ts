import type { Database, DatabaseTransaction } from "@bbrc/db";
import { MAX_BOOKS_PER_SHELF } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { activeParticipationWhere } from "../sitting/participation-active";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import { recomputeBookReadingCounters } from "./book-reading-counters";
import { checkReadingAchievements } from "./reading-achievements";

type Db = Database | DatabaseTransaction;

export const WISHLIST_SLUG = "wishlist";

type WishlistShelf = {
	id: string;
	slug: string;
	visibility: "public" | "private";
};

/** The member's Wishlist shelf; made on the spot if they somehow have none. */
export async function ensureWishlistShelf(
	db: Db,
	userId: string,
): Promise<WishlistShelf> {
	const existing = await db.shelf.findFirst({
		where: { userId, isWishlist: true },
		select: { id: true, slug: true, visibility: true },
	});
	if (existing) return existing;
	try {
		return await db.shelf.create({
			data: {
				userId,
				slug: WISHLIST_SLUG,
				title: "Wishlist",
				description: "Books I want to read.",
				status: "active",
				type: "ordered",
				visibility: "private",
				isWishlist: true,
			},
			select: { id: true, slug: true, visibility: true },
		});
	} catch (error) {
		// Two requests raced to make it: use the one that won.
		const winner = await db.shelf.findFirst({
			where: { userId, isWishlist: true },
			select: { id: true, slug: true, visibility: true },
		});
		if (winner) return winner;
		throw error;
	}
}

export async function getWishlist(db: Database, userId: string) {
	const shelf = await ensureWishlistShelf(db, userId);
	const books = await db.shelfBook.findMany({
		where: { shelfId: shelf.id },
		orderBy: { position: "asc" },
		select: { book: { select: { slug: true } } },
	});
	return {
		slug: shelf.slug,
		count: books.length,
		isPrivate: shelf.visibility === "private",
		bookSlugs: books.map((row) => row.book.slug),
	};
}

export async function addToWishlist(
	db: Database,
	userId: string,
	bookSlug: string,
) {
	const result = await addToWishlistInTransaction(db, userId, bookSlug);
	void checkReadingAchievements(db, userId);
	return result;
}

async function addToWishlistInTransaction(
	db: Database,
	userId: string,
	bookSlug: string,
) {
	return db.$transaction(async (tx) => {
		const book = await tx.book.findUnique({
			where: { slug: bookSlug },
			select: { id: true },
		});
		if (!book) {
			throw new ORPCError("NOT_FOUND", { message: "Book not found" });
		}
		const hasRead = await tx.read.findUnique({
			where: { userId_bookId: { userId, bookId: book.id } },
			select: { userId: true },
		});
		if (hasRead) {
			throw new ORPCError("BAD_REQUEST", {
				message: "You have already read this book.",
			});
		}
		const shelf = await ensureWishlistShelf(tx, userId);
		const existing = await tx.shelfBook.findUnique({
			where: { shelfId_bookId: { shelfId: shelf.id, bookId: book.id } },
			select: { id: true },
		});
		const count = await tx.shelfBook.count({ where: { shelfId: shelf.id } });
		if (existing) return { inWishlist: true, count };
		if (count >= MAX_BOOKS_PER_SHELF) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Your wishlist can hold ${MAX_BOOKS_PER_SHELF} books.`,
			});
		}
		const max = await tx.shelfBook.aggregate({
			where: { shelfId: shelf.id },
			_max: { position: true },
		});
		await tx.shelfBook.create({
			data: {
				shelfId: shelf.id,
				bookId: book.id,
				position: (max._max.position ?? -1) + 1,
				addedById: userId,
				updatedById: userId,
			},
		});
		await tx.shelf.update({
			where: { id: shelf.id },
			data: { updatedAt: new Date() },
		});
		await recomputeBookReadingCounters(tx, book.id);
		return { inWishlist: true, count: count + 1 };
	});
}

export async function removeFromWishlist(
	db: Database,
	userId: string,
	bookSlug: string,
) {
	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: { id: true },
	});
	if (!book) {
		throw new ORPCError("NOT_FOUND", { message: "Book not found" });
	}
	await removeBookFromWishlist(db, userId, book.id);
	const shelf = await db.shelf.findFirst({
		where: { userId, isWishlist: true },
		select: { id: true },
	});
	const count = shelf
		? await db.shelfBook.count({ where: { shelfId: shelf.id } })
		: 0;
	return { inWishlist: false, count };
}

/** Used when a book is marked read: it no longer belongs on the wishlist. */
export async function removeBookFromWishlist(
	db: Db,
	userId: string,
	bookId: string,
) {
	const removed = await db.shelfBook.deleteMany({
		where: { bookId, shelf: { userId, isWishlist: true } },
	});
	if (removed.count > 0) await recomputeBookReadingCounters(db, bookId);
}

/**
 * Books these members have on their wishlists, most wanted first. Counts only:
 * it never says whose wishlist. `onlyBookIds` limits it to books that could be
 * chosen (for a poll, the books that pass its filters).
 */
export async function wishlistPopularityForUsers(
	db: Database,
	userIds: string[],
	limit: number,
	onlyBookIds?: string[],
) {
	if (userIds.length === 0) return { items: [] };

	const grouped = await db.shelfBook.groupBy({
		by: ["bookId"],
		where: {
			shelf: {
				isWishlist: true,
				userId: { in: userIds },
				user: { ...visibleOnSiteUserWhere },
			},
			bookId: onlyBookIds ? { in: onlyBookIds } : undefined,
			// Books they have already read are not candidates.
			book: { reads: { none: { userId: { in: userIds } } } },
		},
		_count: { _all: true },
		orderBy: { _count: { bookId: "desc" } },
		take: limit,
	});
	if (grouped.length === 0) return { items: [] };

	const books = await db.book.findMany({
		where: { id: { in: grouped.map((row) => row.bookId) } },
		select: { id: true, slug: true, title: true, authors: true, coverId: true },
	});
	const byId = new Map(books.map((book) => [book.id, book]));
	return {
		items: grouped.flatMap((row) => {
			const book = byId.get(row.bookId);
			return book
				? [
						{
							id: book.id,
							slug: book.slug,
							title: book.title,
							authors: book.authors,
							coverId: book.coverId,
							wishlisted: row._count._all,
						},
					]
				: [];
		}),
	};
}

/** The same for a sitting's current participants. */
export async function wishlistPopularityForSitting(
	db: Database,
	sittingSlug: string,
	limit: number,
) {
	const sitting = await db.sitting.findUnique({
		where: { slug: sittingSlug },
		select: {
			participants: {
				where: { ...activeParticipationWhere },
				select: { userId: true },
			},
		},
	});
	if (!sitting) {
		throw new ORPCError("NOT_FOUND", { message: "Sitting not found" });
	}
	const { items } = await wishlistPopularityForUsers(
		db,
		sitting.participants.map((row) => row.userId),
		limit,
	);
	return {
		items: items.map(({ id: _id, ...item }) => item),
	};
}
