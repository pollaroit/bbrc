import type { Database } from "@bbrc/db";
import { authorNameToSlug } from "@bbrc/shared";

/**
 * Authors are only names on books, so a slug is matched back to a name by
 * looking for names that could produce it, then checking the slug exactly.
 */
export async function findAuthorBySlug(
	db: Database,
	slug: string,
): Promise<{ slug: string; name: string } | null> {
	const parts = slug.split("_").filter(Boolean);
	if (parts.length === 0) {
		return null;
	}
	const pattern = `%${parts.join("%")}%`;
	const rows = await db.$queryRaw<{ name: string }[]>`
		SELECT DISTINCT author AS name
		FROM book, unnest(authors) AS author
		WHERE author ILIKE ${pattern}
		LIMIT 50
	`;
	const match = rows.find((row) => authorNameToSlug(row.name) === slug);
	return match ? { slug, name: match.name } : null;
}

/** How many books the club has by an author, and a few covers for a card. */
export async function authorBookSummary(db: Database, name: string) {
	const [count, books] = await Promise.all([
		db.book.count({ where: { authors: { has: name } } }),
		db.book.findMany({
			where: { authors: { has: name } },
			orderBy: { title: "asc" },
			take: 4,
			select: { coverId: true },
		}),
	]);
	return { bookCount: count, coverIds: books.map((book) => book.coverId) };
}
