import type { DatabaseTransaction } from "@bbrc/db";
import { generateUniqueSlug } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";

const BOOK_SLUG_MIN_LENGTH = 3;

async function isBookSlugAvailable(
	slug: string,
	db: DatabaseTransaction,
): Promise<boolean> {
	return (await db.book.findUnique({ where: { slug } })) == null;
}

/** Catalog slugs must satisfy Prisma/BookSchema min length (3). */
export async function generateBookSlug(
	title: string,
	db: DatabaseTransaction,
): Promise<string> {
	const candidates = [title.trim(), `book-${title.trim()}`, "book-club"];

	for (const seed of candidates) {
		if (!seed) {
			continue;
		}

		try {
			const slug = await generateUniqueSlug(seed, (candidate) =>
				isBookSlugAvailable(candidate, db),
			);

			if (slug.length >= BOOK_SLUG_MIN_LENGTH) {
				return slug;
			}
		} catch {}
	}

	throw new ORPCError("CONFLICT", {
		message: "Failed to generate book slug",
		data: { title },
	});
}
