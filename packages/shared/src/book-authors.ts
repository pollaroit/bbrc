import { authorNameToSlug } from "./author-slug";

/** The authors of a book as the app groups and counts them. */
export type BookAuthorEntry = {
	/** Author id, or the lower-case name for a book the backfill has not linked yet. */
	key: string;
	label: string;
	/** Author slug; for an unlinked name, the slug it would get. */
	slug: string;
};

type BookWithAuthors = {
	/** The synced names copy (`Book.authors`). */
	authors: string[];
	/** `BookAuthor` rows in position order, when loaded. */
	authorLinks?: { author: { id: string; slug: string; name: string } }[];
};

/**
 * Who wrote a book, for anything that counts or groups by author. Linked books use the Author
 * records (so a renamed or merged author counts once); a book without links yet falls back
 * to its names, so stats do not drop to zero before the backfill has run.
 */
export function bookAuthorEntries(book: BookWithAuthors): BookAuthorEntry[] {
	if (book.authorLinks && book.authorLinks.length > 0) {
		return book.authorLinks.map(({ author }) => ({
			key: author.id,
			label: author.name,
			slug: author.slug,
		}));
	}

	const seen = new Set<string>();
	const entries: BookAuthorEntry[] = [];
	for (const raw of book.authors) {
		const label = raw.trim();
		const key = label.toLowerCase();
		if (!key || seen.has(key)) continue;
		seen.add(key);
		entries.push({ key, label, slug: authorNameToSlug(label) });
	}
	return entries;
}
