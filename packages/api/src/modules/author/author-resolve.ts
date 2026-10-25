import type { Database } from "@bbrc/db";
import { authorNameKey } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import type { ViewerContext } from "../user/user-visibility";

export type ResolvedAuthor = {
	id: string;
	/** The author's canonical slug. */
	slug: string;
	/** The canonical slug when the one asked for was a merged, old or alias slug; otherwise null. */
	redirectTo: string | null;
};

function notFound(slug: string): never {
	throw new ORPCError("NOT_FOUND", {
		message: "Author not found",
		data: { slug },
	});
}

/**
 * Finds the author a slug points to: the canonical slug, then the slug of an author
 * that was merged into another (`AuthorSlugRedirect`), then an alias or name key (an
 * old name-based slug such as `j_r_r_tolkien`). Authors without books are only
 * visible to admins.
 */
export async function resolveAuthor(
	db: Database,
	slug: string,
	viewer: ViewerContext,
): Promise<ResolvedAuthor> {
	const asked = slug.trim();
	if (!asked) notFound(slug);

	let found: { id: string; slug: string } | null = await db.author.findUnique({
		where: { slug: asked },
		select: { id: true, slug: true },
	});

	if (!found) {
		const redirect = await db.authorSlugRedirect.findUnique({
			where: { slug: asked },
			select: { author: { select: { id: true, slug: true } } },
		});
		found = redirect?.author ?? null;
	}

	if (!found) {
		const key = authorNameKey(asked.replace(/[_-]+/g, " "));
		if (key) {
			const alias = await db.authorAlias.findUnique({
				where: { key },
				select: { author: { select: { id: true, slug: true } } },
			});
			found =
				alias?.author ??
				(await db.author.findFirst({
					where: { nameKey: key },
					orderBy: { createdAt: "asc" },
					select: { id: true, slug: true },
				}));
		}
	}

	if (!found) notFound(slug);

	if (!viewer?.isAdmin) {
		const hasBooks = await db.bookAuthor.findFirst({
			where: { authorId: found.id },
			select: { bookId: true },
		});
		if (!hasBooks) notFound(slug);
	}

	return {
		id: found.id,
		slug: found.slug,
		redirectTo: found.slug === asked ? null : found.slug,
	};
}

/** The canonical slug plus every slug that redirects to the author (for post attachments, which store a slug). */
export async function authorSlugSet(
	db: Database,
	author: { id: string; slug: string },
): Promise<string[]> {
	const redirects = await db.authorSlugRedirect.findMany({
		where: { authorId: author.id },
		select: { slug: true },
	});
	return [author.slug, ...redirects.map((row) => row.slug)];
}
