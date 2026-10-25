import type { Database, DatabaseTransaction } from "@bbrc/db";
import { authorNameKey, authorNameToSlug } from "@bbrc/shared";

type Db = Database | DatabaseTransaction;

/** An author a slug points at. `id` is null only for names the backfill has not turned into records yet. */
export type AuthorRef = { id: string | null; slug: string; name: string };

/**
 * Finds the author an address (post attachment, link, poll option) points at: the canonical
 * slug, a merged author's old slug, or an alias / old name-based slug. The slug and name come
 * from the author record, so a renamed or merged author stays consistent. Authors without
 * books are not found. Before the backfill (no records yet) it falls back to matching names
 * on books.
 */
export async function findAuthorBySlug(
	db: Db,
	slug: string,
): Promise<AuthorRef | null> {
	const asked = slug.trim();
	if (!asked) {
		return null;
	}

	const record = await findAuthorRecord(db, asked);
	if (record) {
		const hasBooks = await db.bookAuthor.findFirst({
			where: { authorId: record.id },
			select: { bookId: true },
		});
		return hasBooks ? record : null;
	}

	return findLegacyAuthorBySlug(db, asked);
}

async function findAuthorRecord(
	db: Db,
	slug: string,
): Promise<{ id: string; slug: string; name: string } | null> {
	const direct = await db.author.findUnique({
		where: { slug },
		select: { id: true, slug: true, name: true },
	});
	if (direct) {
		return direct;
	}

	const redirect = await db.authorSlugRedirect.findUnique({
		where: { slug },
		select: { author: { select: { id: true, slug: true, name: true } } },
	});
	if (redirect) {
		return redirect.author;
	}

	const key = authorNameKey(slug.replace(/[_-]+/g, " "));
	if (!key) {
		return null;
	}
	const alias = await db.authorAlias.findUnique({
		where: { key },
		select: { author: { select: { id: true, slug: true, name: true } } },
	});
	return alias?.author ?? null;
}

/** The old way: a slug is matched back to a name by looking for names that could produce it. */
async function findLegacyAuthorBySlug(
	db: Db,
	slug: string,
): Promise<AuthorRef | null> {
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
	return match ? { id: null, slug, name: match.name } : null;
}

/** How many books the club has by an author, and a few covers for a card. */
export async function authorBookSummary(db: Db, author: AuthorRef) {
	const where = author.id
		? { authorLinks: { some: { authorId: author.id } } }
		: { authors: { has: author.name } };

	const [count, books] = await Promise.all([
		db.book.count({ where }),
		db.book.findMany({
			where,
			orderBy: { title: "asc" },
			take: 4,
			select: { coverId: true },
		}),
	]);
	return { bookCount: count, coverIds: books.map((book) => book.coverId) };
}
