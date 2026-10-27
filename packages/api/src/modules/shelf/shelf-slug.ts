import type { Database, DatabaseTransaction } from "@bbrc/db";
import { generateUniqueSlug } from "@bbrc/shared";
import { appError } from "../../lib/app-error";

const SHELF_SLUG_MIN_LENGTH = 3;
const RESERVED_WISHLIST_SLUG = "wishlist";

async function isShelfSlugAvailable(
	userId: string,
	slug: string,
	db: Database | DatabaseTransaction,
): Promise<boolean> {
	// "wishlist" belongs to the member's Wishlist shelf.
	if (slug === RESERVED_WISHLIST_SLUG) return false;
	const existing = await db.shelf.findUnique({
		where: { userId_slug: { userId, slug } },
		select: { id: true },
	});
	return existing == null;
}

export async function generateShelfSlug(
	title: string,
	userId: string,
	db: Database | DatabaseTransaction,
): Promise<string> {
	const trimmed = title.trim();
	const seeds =
		trimmed.length >= SHELF_SLUG_MIN_LENGTH
			? [trimmed, "my-shelf"]
			: ["my-shelf"];

	for (const seed of seeds) {
		try {
			const slug = await generateUniqueSlug(seed, (candidate) =>
				isShelfSlugAvailable(userId, candidate, db),
			);
			if (slug.length >= SHELF_SLUG_MIN_LENGTH) {
				return slug;
			}
		} catch {
			// try next seed
		}
	}

	throw appError("CONFLICT", "shelf.slugFailed");
}
