import type { Database, Prisma } from "@bbrc/db";
import { authorNameKey, authorNameToSlug } from "@bbrc/shared";

export type BookAuthorFacet = {
	slug: string;
	name: string;
	bookCount: number;
};

type AuthorFacetAccumulator = {
	name: string;
	bookCount: number;
};

function addBookAuthorsToFacets(
	authorNames: string[],
	target: Map<string, AuthorFacetAccumulator>,
) {
	const slugsOnBook = new Set<string>();

	for (const rawName of authorNames) {
		const name = rawName.trim();
		if (!name) {
			continue;
		}

		const slug = authorNameToSlug(name);
		slugsOnBook.add(slug);

		const existing = target.get(slug);
		if (existing) {
			continue;
		}

		target.set(slug, { name, bookCount: 0 });
	}

	for (const slug of slugsOnBook) {
		const entry = target.get(slug);
		if (entry) {
			entry.bookCount += 1;
		}
	}
}

/** What an author filter (slugs from the URL) points at. */
export type AuthorFilter = {
	/** Author records the slugs resolve to (canonical, merged, old and alias slugs all work). */
	authorIds: string[];
	/** Names for slugs that match no author record (books that are not linked to authors yet). */
	legacyNames: string[];
};

/**
 * Turns author slugs into author ids. A slug that matches no Author record falls back to the
 * old name match, so filters keep working for books the backfill has not reached.
 */
export async function resolveAuthorFilter(
	slugs: string[],
	db: Database,
): Promise<AuthorFilter> {
	const asked = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
	if (asked.length === 0) {
		return { authorIds: [], legacyNames: [] };
	}

	const [authors, redirects] = await Promise.all([
		db.author.findMany({
			where: { slug: { in: asked } },
			select: { id: true, slug: true },
		}),
		db.authorSlugRedirect.findMany({
			where: { slug: { in: asked } },
			select: { slug: true, authorId: true },
		}),
	]);

	const ids = new Set<string>();
	const resolved = new Set<string>();
	for (const author of authors) {
		ids.add(author.id);
		resolved.add(author.slug);
	}
	for (const redirect of redirects) {
		ids.add(redirect.authorId);
		resolved.add(redirect.slug);
	}

	const unresolved = asked.filter((slug) => !resolved.has(slug));
	if (unresolved.length === 0) {
		return { authorIds: [...ids], legacyNames: [] };
	}

	// An old name-based slug (`j_r_r_tolkien`) may be an alias of an author.
	const keys = unresolved
		.map((slug) => authorNameKey(slug.replace(/[_-]+/g, " ")))
		.filter(Boolean);
	const aliasHits =
		keys.length > 0
			? await db.authorAlias.findMany({
					where: { key: { in: keys } },
					select: { key: true, authorId: true },
				})
			: [];
	const aliasKeys = new Set<string>();
	for (const hit of aliasHits) {
		ids.add(hit.authorId);
		aliasKeys.add(hit.key);
	}

	const stillUnresolved = unresolved.filter(
		(slug) => !aliasKeys.has(authorNameKey(slug.replace(/[_-]+/g, " "))),
	);
	const legacyNames =
		stillUnresolved.length > 0
			? await legacyNamesForSlugs(stillUnresolved, db)
			: [];

	return { authorIds: [...ids], legacyNames };
}

async function legacyNamesForSlugs(
	slugs: string[],
	db: Database,
): Promise<string[]> {
	const slugSet = new Set(slugs);
	const matched = new Map<string, string>();

	const rows = await db.book.findMany({
		where: { authorLinks: { none: {} } },
		select: { authors: true },
	});

	for (const row of rows) {
		for (const name of row.authors) {
			const slug = authorNameToSlug(name);
			if (slugSet.has(slug) && !matched.has(slug)) {
				matched.set(slug, name);
			}
		}
	}

	return [...matched.values()];
}

export function isEmptyAuthorFilter(filter: AuthorFilter): boolean {
	return filter.authorIds.length === 0 && filter.legacyNames.length === 0;
}

/** Books by any of the filtered authors, matched by author id (names only for unlinked books). */
export function buildAuthorFilterWhere(
	filter: AuthorFilter | undefined,
): Prisma.BookWhereInput | undefined {
	if (!filter || isEmptyAuthorFilter(filter)) {
		return undefined;
	}

	const clauses: Prisma.BookWhereInput[] = [];
	if (filter.authorIds.length > 0) {
		clauses.push({
			authorLinks: { some: { authorId: { in: filter.authorIds } } },
		});
	}
	if (filter.legacyNames.length > 0) {
		clauses.push({
			authorLinks: { none: {} },
			authors: { hasSome: filter.legacyNames },
		});
	}

	return clauses.length === 1 ? clauses[0] : { OR: clauses };
}

export async function listAuthorFacetsForBooks(
	db: Database,
	where: Prisma.BookWhereInput,
	pinnedSlugs: string[] = [],
): Promise<BookAuthorFacet[]> {
	const bySlug = new Map<string, AuthorFacetAccumulator>();

	const [counts, unlinked] = await Promise.all([
		db.bookAuthor.groupBy({
			by: ["authorId"],
			where: { book: where },
			_count: { bookId: true },
		}),
		db.book.findMany({
			where: { AND: [where, { authorLinks: { none: {} } }] },
			select: { authors: true },
		}),
	]);

	if (counts.length > 0) {
		const authors = await db.author.findMany({
			where: { id: { in: counts.map((row) => row.authorId) } },
			select: { id: true, slug: true, name: true },
		});
		const byId = new Map(authors.map((author) => [author.id, author]));
		for (const row of counts) {
			const author = byId.get(row.authorId);
			if (!author) continue;
			bySlug.set(author.slug, {
				name: author.name,
				bookCount: row._count.bookId,
			});
		}
	}

	// Books the backfill has not linked yet still show their names.
	for (const row of unlinked) {
		addBookAuthorsToFacets(row.authors, bySlug);
	}

	if (pinnedSlugs.length > 0) {
		const pinned = await db.author.findMany({
			where: { slug: { in: pinnedSlugs } },
			select: { slug: true, name: true },
		});
		for (const author of pinned) {
			if (!bySlug.has(author.slug)) {
				bySlug.set(author.slug, { name: author.name, bookCount: 0 });
			}
		}

		for (const slug of pinnedSlugs) {
			if (!bySlug.has(slug)) {
				bySlug.set(slug, {
					name: slug.replaceAll("_", " "),
					bookCount: 0,
				});
			}
		}
	}

	return [...bySlug.entries()]
		.map(([slug, { name, bookCount }]) => ({ slug, name, bookCount }))
		.sort((a, b) => {
			if (b.bookCount !== a.bookCount) {
				return b.bookCount - a.bookCount;
			}

			return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
		});
}
