import type { Database, Prisma } from "@bbrc/db";
import { authorNameToSlug } from "@bbrc/shared";

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
			existing.name = name;
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

export async function resolveAuthorSlugsToNames(
	slugs: string[],
	db: Database,
): Promise<string[]> {
	if (slugs.length === 0) {
		return [];
	}

	const slugSet = new Set(slugs);
	const matched = new Map<string, string>();

	const rows = await db.book.findMany({
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

	return slugs.flatMap((slug) => {
		const name = matched.get(slug);
		return name != null ? [name] : [];
	});
}

export async function listAuthorFacetsForBooks(
	db: Database,
	where: Prisma.BookWhereInput,
	pinnedSlugs: string[] = [],
): Promise<BookAuthorFacet[]> {
	const bySlug = new Map<string, AuthorFacetAccumulator>();

	const rows = await db.book.findMany({
		where,
		select: { authors: true },
	});

	for (const row of rows) {
		addBookAuthorsToFacets(row.authors, bySlug);
	}

	if (pinnedSlugs.length > 0) {
		const pinnedNames = await resolveAuthorSlugsToNames(pinnedSlugs, db);

		for (const name of pinnedNames) {
			const slug = authorNameToSlug(name);
			if (!bySlug.has(slug)) {
				bySlug.set(slug, { name, bookCount: 0 });
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
