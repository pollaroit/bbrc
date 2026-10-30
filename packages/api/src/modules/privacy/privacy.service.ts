import type { Database } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import type { Context } from "../../context";
import {
	revalidateBookIsr,
	revalidatePostIsr,
	revalidateUserIsr,
	revalidateUserShelvesIsr,
} from "../../revalidate-isr";
import { countFriends } from "../friend/friend.service";
import { ensureWishlistShelf } from "../reading/wishlist.service";
import type {
	PrivacySettings,
	UpdatePrivacySettingsInput,
} from "./privacy.schema";

/** How many of a member's books and posts to refresh when their visibility changes. */
const REFRESH_LIMIT = 300;

export async function getPrivacySettings(
	db: Database,
	userId: string,
): Promise<PrivacySettings> {
	const [user, wishlist, friendCount] = await Promise.all([
		db.user.findUnique({
			where: { id: userId },
			select: {
				profileVisibility: true,
				autoAcceptFriends: true,
				readsVisibility: true,
				reviewsVisibility: true,
				favoritesVisibility: true,
				goalsVisibility: true,
				readingVisibility: true,
				defaultPostVisibility: true,
				defaultShelfVisibility: true,
				showReadingProgress: true,
				profile: {
					select: {
						dateOfBirthVisibility: true,
						genderVisibility: true,
						locationVisibility: true,
					},
				},
			},
		}),
		db.shelf.findFirst({
			where: { userId, isWishlist: true },
			select: { visibility: true },
		}),
		countFriends(db, userId),
	]);
	if (!user) throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	return {
		profileVisibility: user.profileVisibility,
		autoAcceptFriends: user.autoAcceptFriends,
		sections: {
			reads: user.readsVisibility,
			reviews: user.reviewsVisibility,
			favorites: user.favoritesVisibility,
			goals: user.goalsVisibility,
			reading: user.readingVisibility,
			wishlist: wishlist?.visibility ?? "private",
		},
		showReadingProgress: user.showReadingProgress,
		defaults: {
			post: user.defaultPostVisibility,
			shelf: user.defaultShelfVisibility,
		},
		details: {
			dateOfBirth: user.profile?.dateOfBirthVisibility ?? "private",
			gender: user.profile?.genderVisibility ?? "private",
			location: user.profile?.locationVisibility ?? "public",
		},
		friendCount,
	};
}

export async function updatePrivacySettings(
	db: Database,
	context: Context,
	userId: string,
	input: UpdatePrivacySettingsInput,
): Promise<PrivacySettings> {
	const current = await getPrivacySettings(db, userId);
	const profileVisibility =
		input.profileVisibility ?? current.profileVisibility;
	// Accepting everyone at once only makes sense for a public profile.
	const autoAcceptFriends =
		profileVisibility === "private"
			? false
			: (input.autoAcceptFriends ?? current.autoAcceptFriends);
	if (input.autoAcceptFriends === true && profileVisibility === "private") {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Make your profile public to accept friend requests automatically.",
		});
	}

	const sections = { ...current.sections, ...input.sections };
	const details = { ...current.details, ...input.details };
	const defaults = { ...current.defaults, ...input.defaults };

	await db.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: userId },
			data: {
				profileVisibility,
				autoAcceptFriends,
				readsVisibility: sections.reads,
				reviewsVisibility: sections.reviews,
				favoritesVisibility: sections.favorites,
				goalsVisibility: sections.goals,
				readingVisibility: sections.reading,
				defaultPostVisibility: defaults.post,
				defaultShelfVisibility: defaults.shelf,
				showReadingProgress:
					input.showReadingProgress ?? current.showReadingProgress,
			},
		});
		await tx.userProfile.upsert({
			where: { userId },
			create: {
				userId,
				dateOfBirthVisibility: details.dateOfBirth,
				genderVisibility: details.gender,
				locationVisibility: details.location,
			},
			update: {
				dateOfBirthVisibility: details.dateOfBirth,
				genderVisibility: details.gender,
				locationVisibility: details.location,
			},
		});
		if (input.sections?.wishlist) {
			await ensureWishlistShelf(tx, userId);
			await tx.shelf.updateMany({
				where: { userId, isWishlist: true },
				data: { visibility: sections.wishlist },
			});
		}
	});

	await refreshPagesOf(db, context, userId);
	return getPrivacySettings(db, userId);
}

/**
 * Cached pages show what an anonymous visitor may see, so when a member changes
 * who can see what, the pages that list or show them are refreshed: their own at
 * once, and (bounded) the books they read or reviewed and their posts.
 */
async function refreshPagesOf(db: Database, context: Context, userId: string) {
	try {
		const user = await db.user.findUnique({
			where: { id: userId },
			select: { username: true },
		});
		if (user) {
			revalidateUserIsr(context, user.username);
			revalidateUserShelvesIsr(context, user.username);
		}
		const [reads, reviews, favorites, posts] = await Promise.all([
			db.read.findMany({
				where: { userId },
				take: REFRESH_LIMIT,
				select: { book: { select: { slug: true } } },
			}),
			db.feedback.findMany({
				where: { authorId: userId },
				take: REFRESH_LIMIT,
				select: { book: { select: { slug: true } } },
			}),
			db.favorite.findMany({
				where: { userId },
				select: { book: { select: { slug: true } } },
			}),
			db.post.findMany({
				where: { authorId: userId },
				take: REFRESH_LIMIT,
				select: { slug: true },
			}),
		]);
		const bookSlugs = new Set(
			[...reads, ...reviews, ...favorites].map((row) => row.book.slug),
		);
		for (const slug of bookSlugs) revalidateBookIsr(context, slug);
		for (const post of posts) revalidatePostIsr(context, post.slug);
	} catch {
		// A stale page heals within the hour; the change itself is saved.
	}
}
