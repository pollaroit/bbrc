import type { Database } from "@bbrc/db";

import type { Context } from "../../context";
import { revalidateAuthorIsr } from "../../revalidate-isr";

/** Slugs of authors by id (a missing id is skipped). */
export async function authorSlugsByIds(db: Database, ids: string[]) {
	if (ids.length === 0) return [];
	const rows = await db.author.findMany({
		where: { id: { in: ids } },
		select: { slug: true },
	});
	return rows.map((row) => row.slug);
}

/** Slugs of the authors linked to a book. */
export async function authorSlugsOfBook(db: Database, bookSlug: string) {
	const rows = await db.bookAuthor.findMany({
		where: { book: { slug: bookSlug } },
		select: { author: { select: { slug: true } } },
	});
	return rows.map((row) => row.author.slug);
}

/** Refreshes the cached pages of these authors. Never fails the mutation. */
export function revalidateAuthorSlugs(
	context: Context,
	slugs: Iterable<string>,
) {
	for (const slug of new Set(slugs)) {
		try {
			revalidateAuthorIsr(context, slug);
		} catch {
			// A stale page heals within the hour.
		}
	}
}

export async function revalidateAuthorsByIds(context: Context, ids: string[]) {
	try {
		revalidateAuthorSlugs(context, await authorSlugsByIds(context.db, ids));
	} catch {
		// Same: never fail the mutation.
	}
}
