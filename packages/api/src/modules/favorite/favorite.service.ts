import type { Database } from "@bbrc/db";
import { MAX_FAVORITES_PER_USER } from "@bbrc/shared";
import { appError } from "../../lib/app-error";
import {
	clubReadEligibilityHint,
	clubReadEligibilityKey,
	userCompletedClubRead,
} from "../book/book-read-eligibility";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import type {
	AddFavoriteInput,
	AddFavoriteOutput,
	GetBookFavoriteStateOutput,
	GetUserFavoritesOutput,
	GetViewerLibraryEngagementOutput,
	ListBookFavoritesInput,
	ListBookFavoritesOutput,
	ListMyFavoritesOutput,
	RemoveFavoriteInput,
} from "./favorite.schema";
import { favoriteItemSelect } from "./favorite.schema";

async function loadBookBySlug(slug: string, db: Database) {
	const book = await db.book.findUnique({
		where: { slug },
		select: { id: true, slug: true },
	});

	if (!book) {
		throw appError("NOT_FOUND", "book.notFound", { data: { slug } });
	}

	return book;
}

async function loadUserByUsername(username: string, db: Database) {
	const user = await db.user.findUnique({
		where: { username },
		select: { id: true, username: true },
	});

	if (!user) {
		throw appError("NOT_FOUND", "favorite.memberNotFound", {
			data: { username },
		});
	}

	return user;
}

export async function getUserFavorites(
	username: string,
	db: Database,
): Promise<GetUserFavoritesOutput> {
	const user = await loadUserByUsername(username, db);

	return db.favorite.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: "asc" },
		select: favoriteItemSelect,
	});
}

export async function getViewerLibraryEngagement(
	userId: string,
	db: Database,
): Promise<GetViewerLibraryEngagementOutput> {
	const [reads, favorites, feedbacks, wishlist, readings] = await Promise.all([
		db.read.findMany({
			where: { userId },
			select: { book: { select: { slug: true } } },
		}),
		db.favorite.findMany({
			where: { userId },
			select: { book: { select: { slug: true } } },
		}),
		db.feedback.findMany({
			where: { authorId: userId },
			select: {
				rating: true,
				book: { select: { slug: true } },
			},
		}),
		db.shelfBook.findMany({
			where: { shelf: { userId, isWishlist: true } },
			select: { book: { select: { slug: true } } },
		}),
		db.reading.findMany({
			where: { userId, finishedAt: null },
			select: { book: { select: { slug: true } } },
		}),
	]);

	const readSlugs = reads.map((row) => row.book.slug);

	const favoriteSlugs = favorites.map((row) => row.book.slug);

	const feedbackRatings = feedbacks.map((row) => ({
		bookSlug: row.book.slug,
		rating: row.rating,
	}));

	const feedbackBookSlugs = feedbackRatings.map((row) => row.bookSlug);

	return {
		readSlugs,
		favoriteSlugs,
		feedbackBookSlugs,
		feedbackRatings,
		wishlistSlugs: wishlist.map((row) => row.book.slug),
		readingSlugs: readings.map((row) => row.book.slug),
		slotsUsed: favorites.length,
		maxSlots: MAX_FAVORITES_PER_USER,
	};
}

export async function listMyFavorites(
	userId: string,
	db: Database,
): Promise<ListMyFavoritesOutput> {
	return db.favorite.findMany({
		where: { userId },
		orderBy: { createdAt: "asc" },
		select: favoriteItemSelect,
	});
}

export async function getBookFavoriteState(
	bookSlug: string,
	userId: string,
	db: Database,
): Promise<GetBookFavoriteStateOutput> {
	const book = await loadBookBySlug(bookSlug, db);

	const [existing, slotsUsed] = await Promise.all([
		db.favorite.findUnique({
			where: {
				bookId_userId: {
					bookId: book.id,
					userId,
				},
			},
			select: { id: true },
		}),
		db.favorite.count({ where: { userId } }),
	]);

	if (existing) {
		return {
			isFavorite: true,
			favoriteId: existing.id,
			canFavorite: false,
			slotsUsed,
			maxSlots: MAX_FAVORITES_PER_USER,
			hint: null,
		};
	}

	const canFavorite = await userCompletedClubRead(userId, book.id, db);

	if (canFavorite) {
		return {
			isFavorite: false,
			favoriteId: null,
			canFavorite: true,
			slotsUsed,
			maxSlots: MAX_FAVORITES_PER_USER,
			hint: null,
		};
	}

	const hint = await clubReadEligibilityHint(userId, book.id, db);

	return {
		isFavorite: false,
		favoriteId: null,
		canFavorite: false,
		slotsUsed,
		maxSlots: MAX_FAVORITES_PER_USER,
		hint,
	};
}

export async function addFavorite(
	input: AddFavoriteInput,
	userId: string,
	db: Database,
): Promise<AddFavoriteOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);

	const canFavorite = await userCompletedClubRead(userId, book.id, db);
	if (!canFavorite) {
		throw appError(
			"FORBIDDEN",
			await clubReadEligibilityKey(userId, book.id, db),
		);
	}

	// Idempotent: adding a book that is already a favorite just returns it, so a
	// repeated or retried request can never fail the second time.
	const existing = await db.favorite.findUnique({
		where: {
			bookId_userId: {
				bookId: book.id,
				userId,
			},
		},
		select: favoriteItemSelect,
	});

	if (existing) {
		return existing;
	}

	const favorites = await db.favorite.findMany({
		where: { userId },
		select: { id: true },
		orderBy: { createdAt: "asc" },
	});

	if (favorites.length >= MAX_FAVORITES_PER_USER) {
		if (!input.replaceFavoriteId) {
			throw appError("BAD_REQUEST", "favorite.limitReached", {
				params: { max: MAX_FAVORITES_PER_USER },
			});
		}

		const toReplace = favorites.find((f) => f.id === input.replaceFavoriteId);
		if (!toReplace) {
			throw appError("BAD_REQUEST", "favorite.slotNotYours");
		}

		await db.favorite.delete({ where: { id: toReplace.id } });
	}

	try {
		return await db.favorite.create({
			data: {
				userId,
				bookId: book.id,
			},
			select: favoriteItemSelect,
		});
	} catch {
		// Lost a race with a parallel add of the same book: it is there now.
		const raced = await db.favorite.findUnique({
			where: { bookId_userId: { bookId: book.id, userId } },
			select: favoriteItemSelect,
		});
		if (raced) {
			return raced;
		}
		throw appError("CONFLICT", "favorite.addFailed");
	}
}

export async function removeFavorite(
	input: RemoveFavoriteInput,
	userId: string,
	db: Database,
): Promise<{ removed: true }> {
	const book = await loadBookBySlug(input.bookSlug, db);

	// Idempotent: removing something that is already gone is a success.
	await db.favorite.deleteMany({
		where: {
			userId,
			bookId: book.id,
		},
	});

	return { removed: true };
}

export async function listBookFavorites(
	input: ListBookFavoritesInput,
	db: Database,
): Promise<ListBookFavoritesOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);
	const limit = input.limit ?? 100;

	const favoriteWhere = {
		bookId: book.id,
		user: visibleOnSiteUserWhere,
	};

	const [total, rows] = await Promise.all([
		db.favorite.count({ where: favoriteWhere }),
		db.favorite.findMany({
			where: favoriteWhere,
			orderBy: { createdAt: "desc" },
			take: limit,
			select: {
				createdAt: true,
				user: {
					select: {
						username: true,
						name: true,
						image: true,
						_count: { select: { favorites: true } },
					},
				},
			},
		}),
	]);

	return {
		total,
		items: rows.map((row) => ({
			favoritedAt: row.createdAt,
			slotsUsed: row.user._count.favorites,
			maxSlots: MAX_FAVORITES_PER_USER,
			user: {
				username: row.user.username,
				name: row.user.name,
				image: row.user.image,
			},
		})),
	};
}
