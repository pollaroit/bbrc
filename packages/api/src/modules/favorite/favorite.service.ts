import type { Database } from "@bbrc/db";
import { MAX_FAVORITES_PER_USER } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import {
	clubReadEligibilityHint,
	userCompletedClubRead,
} from "../book/book-read-eligibility";
import type {
	AddFavoriteInput,
	AddFavoriteOutput,
	GetBookFavoriteStateOutput,
	GetUserFavoritesOutput,
	GetViewerLibraryEngagementOutput,
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
	const [reads, favorites, feedbacks] = await Promise.all([
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

	const existing = await db.favorite.findUnique({
		where: {
			bookId_userId: {
				bookId: book.id,
				userId,
			},
		},
		select: { id: true },
	});

	if (existing) {
		throw new ORPCError("CONFLICT", {
			message: "This book is already in your favorites.",
		});
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
		throw new ORPCError("CONFLICT", {
			message: "This book is already in your favorites.",
		});
	}
}

export async function removeFavorite(
	input: RemoveFavoriteInput,
	userId: string,
	db: Database,
): Promise<{ removed: true }> {
	const book = await loadBookBySlug(input.bookSlug, db);

	const deleted = await db.favorite.deleteMany({
		where: {
			userId,
			bookId: book.id,
		},
	});

	if (deleted.count === 0) {
		throw new ORPCError("NOT_FOUND", {
			message: "Favorite not found",
		});
	}

	return { removed: true };
}
