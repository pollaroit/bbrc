import type { Database, Prisma } from "@bbrc/db";
import { MAX_FAVORITES_PER_USER, type Viewer } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import {
	clubReadEligibilityHint,
	userCompletedClubRead,
} from "../book/book-read-eligibility";
import { canViewerSeeSection, isBlockedFrom } from "../read/section-access";
import { favoriteVisibleWhere } from "../visibility/visibility-resources";
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
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug },
		});
	}

	return book;
}

async function loadUserByUsername(username: string, db: Database) {
	const user = await db.user.findUnique({
		where: { username },
		select: { id: true, username: true },
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "Member not found",
			data: { username },
		});
	}

	return user;
}

export async function getUserFavorites(
	username: string,
	db: Database,
	viewer: Viewer,
): Promise<GetUserFavoritesOutput> {
	const user = await loadUserByUsername(username, db);
	if (isBlockedFrom(viewer, user.id)) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username },
		});
	}
	if (!(await canViewerSeeSection(db, viewer, user.id, "favorites"))) {
		return [];
	}

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
		const hint = await clubReadEligibilityHint(userId, book.id, db);
		throw new ORPCError("FORBIDDEN", { message: hint });
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
			throw new ORPCError("BAD_REQUEST", {
				message: `You can keep at most ${MAX_FAVORITES_PER_USER} favorites. Choose one to replace.`,
			});
		}

		const toReplace = favorites.find((f) => f.id === input.replaceFavoriteId);
		if (!toReplace) {
			throw new ORPCError("BAD_REQUEST", {
				message: "That favorite slot is not yours.",
			});
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
		throw new ORPCError("CONFLICT", {
			message: "Could not add this favorite. Try again.",
		});
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
	viewer: Viewer,
): Promise<ListBookFavoritesOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);
	const limit = input.limit ?? 100;

	// Totals count everyone; only the named rows follow the viewer.
	const favoriteWhere = { bookId: book.id };
	const visibleFavoriteWhere: Prisma.FavoriteWhereInput = {
		AND: [
			favoriteWhere,
			favoriteVisibleWhere(viewer) as Prisma.FavoriteWhereInput,
		],
	};

	const [total, visibleTotal, rows] = await Promise.all([
		db.favorite.count({ where: favoriteWhere }),
		db.favorite.count({ where: visibleFavoriteWhere }),
		db.favorite.findMany({
			where: visibleFavoriteWhere,
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
		privateCount: Math.max(0, total - visibleTotal),
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
