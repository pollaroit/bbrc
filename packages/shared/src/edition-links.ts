/**
 * Free places to find an edition, built from what we know about it. Only links
 * that have the data they need are returned. No shops and no affiliate links.
 */

export type EditionLinkId =
	| "open_library"
	| "internet_archive"
	| "internet_archive_search"
	| "worldcat"
	| "google_books"
	| "goodreads"
	| "librarything"
	| "library_of_congress";

export type EditionExternalLinkData = {
	id: EditionLinkId;
	label: string;
	href: string;
	hint: string;
};

export type EditionLinkInput = {
	/** The Open Library edition (OL…M) behind the edition, when there is one. */
	olid?: string | null;
	isbn10?: string | null;
	isbn13?: string | null;
	/** Internet Archive item id (`ocaid`). */
	ocaid?: string | null;
	goodreads?: string[];
	librarything?: string[];
	lccn?: string[];
	/** The Internet Archive copy can be borrowed right now (from the availability check). */
	borrowable?: boolean | null;
};

const enc = encodeURIComponent;

export function editionExternalLinks(
	input: EditionLinkInput,
): EditionExternalLinkData[] {
	const isbn = input.isbn13 || input.isbn10 || null;
	const links: EditionExternalLinkData[] = [];

	if (input.olid) {
		links.push({
			id: "open_library",
			label: "Open Library",
			href: `https://openlibrary.org/books/${enc(input.olid)}`,
			hint: "The full record, covers and other editions",
		});
	} else if (isbn) {
		links.push({
			id: "open_library",
			label: "Open Library",
			href: `https://openlibrary.org/isbn/${enc(isbn)}`,
			hint: "Look this ISBN up on Open Library",
		});
	}

	if (input.ocaid) {
		links.push({
			id: "internet_archive",
			label: "Internet Archive",
			href: `https://archive.org/details/${enc(input.ocaid)}`,
			hint:
				input.borrowable === true
					? "Free to borrow or read"
					: "Borrow or read a scanned copy for free",
		});
	} else if (isbn) {
		links.push({
			id: "internet_archive_search",
			label: "Internet Archive",
			href: `https://archive.org/search?query=${enc(`isbn:${isbn}`)}`,
			hint: "Search for a free scanned copy",
		});
	}

	if (isbn) {
		links.push({
			id: "worldcat",
			label: "WorldCat",
			href: `https://search.worldcat.org/search?q=${enc(`bn:${isbn}`)}`,
			hint: "Find it in a library near you",
		});
		links.push({
			id: "google_books",
			label: "Google Books",
			href: `https://books.google.com/books?vid=ISBN${enc(isbn)}`,
			hint: "Free preview when available",
		});
	}

	const goodreads = input.goodreads?.find((id) => /^\d+$/.test(id));
	if (goodreads) {
		links.push({
			id: "goodreads",
			label: "Goodreads",
			href: `https://www.goodreads.com/book/show/${enc(goodreads)}`,
			hint: "Ratings and shelves from other readers",
		});
	}

	const librarything = input.librarything?.find((id) => /^\d+$/.test(id));
	if (librarything) {
		links.push({
			id: "librarything",
			label: "LibraryThing",
			href: `https://www.librarything.com/work/${enc(librarything)}`,
			hint: "Tags and reviews from LibraryThing members",
		});
	}

	const lccn = input.lccn?.map((value) => value.trim()).find(Boolean);
	if (lccn) {
		links.push({
			id: "library_of_congress",
			label: "Library of Congress",
			href: `https://lccn.loc.gov/${enc(lccn.replace(/\s+/g, ""))}`,
			hint: "The catalogue record",
		});
	}

	return links;
}
