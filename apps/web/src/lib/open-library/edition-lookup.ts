import { isbnPair, normalizeIsbn } from "@bbrc/shared";

/** What Open Library knows about one edition, shaped for the "add an edition" form. */
export type OpenLibraryEditionPrefill = {
	title: string | null;
	pages: number | null;
	publisher: string | null;
	publishedYear: number | null;
	language: string | null;
	format: "paperback" | "hardcover" | "ebook" | "audiobook" | "other" | null;
	isbn13: string | null;
	isbn10: string | null;
};

type EditionJson = {
	title?: string;
	subtitle?: string;
	number_of_pages?: number;
	pagination?: string;
	publishers?: string[];
	publish_date?: string;
	languages?: { key?: string }[];
	physical_format?: string;
	isbn_13?: string[];
	isbn_10?: string[];
};

function formatFrom(
	value: string | undefined,
): OpenLibraryEditionPrefill["format"] {
	const text = value?.toLowerCase() ?? "";
	if (!text) return null;
	if (text.includes("hard")) return "hardcover";
	if (text.includes("paper") || text.includes("mass market"))
		return "paperback";
	if (
		text.includes("ebook") ||
		text.includes("e-book") ||
		text.includes("kindle")
	)
		return "ebook";
	if (text.includes("audio")) return "audiobook";
	return "other";
}

/** Looks an ISBN up on Open Library from the browser; null when there is no match. */
export async function fetchOpenLibraryEditionByIsbn(
	isbn: string,
): Promise<OpenLibraryEditionPrefill | null> {
	const pair = isbnPair(normalizeIsbn(isbn));
	const wanted = pair.isbn13 ?? pair.isbn10;
	if (!wanted) return null;

	const response = await fetch(`https://openlibrary.org/isbn/${wanted}.json`, {
		headers: { Accept: "application/json" },
	});
	if (response.status === 404) return null;
	if (!response.ok) {
		throw new Error(
			"Open Library is not answering right now. Try again in a moment.",
		);
	}
	const edition = (await response.json()) as EditionJson;

	const year = edition.publish_date?.match(/\b(1[0-9]{3}|20[0-9]{2})\b/)?.[0];
	const language = edition.languages?.[0]?.key?.split("/").pop() ?? null;
	const pages =
		edition.number_of_pages ??
		(edition.pagination ? Number.parseInt(edition.pagination, 10) : null);

	return {
		title: edition.title
			? [edition.title, edition.subtitle].filter(Boolean).join(": ")
			: null,
		pages: pages != null && Number.isFinite(pages) && pages > 0 ? pages : null,
		publisher: edition.publishers?.[0] ?? null,
		publishedYear: year ? Number(year) : null,
		language,
		format: formatFrom(edition.physical_format),
		isbn13: edition.isbn_13?.[0] ?? pair.isbn13,
		isbn10: edition.isbn_10?.[0] ?? pair.isbn10,
	};
}
