import type {
	EditionCore,
	EditionPage,
	EditionSummary,
} from "@bbrc/api/modules/edition/edition.schema";
import type { Formatters } from "@bbrc/i18n";

/** `/books/dune/editions/OL123M` */
export const editionPath = (bookSlug: string, key: string) =>
	`/books/${bookSlug}/editions/${key}`;

/** "Oct 2026", or just the year when the month is unknown. */
export function readMonthLabel(
	f: Formatters,
	year: number | null,
	month: number | null,
): string | null {
	if (year == null) return null;
	if (month == null || month < 1 || month > 12) return String(year);
	return f.monthYear({ year, month }, "short");
}

/** The name at the top of the page: the edition's own title, else the book's. */
export function editionHeadline(
	book: EditionPage["book"],
	edition: Pick<EditionCore, "title">,
): string {
	return edition.title?.trim() || book.title;
}

/** "Turkish · Paperback · 416 pages · 2003" */
export function editionFactsLine(
	edition: Pick<EditionCore, "language" | "format" | "pages" | "publishedYear">,
): string {
	return [
		edition.language,
		edition.format,
		edition.pages ? `${edition.pages.toLocaleString("en-US")} pages` : null,
		edition.publishedYear ? String(edition.publishedYear) : null,
	]
		.filter(Boolean)
		.join(" · ");
}

/** The browser/search title, e.g. "Dune — Turkish paperback edition (2003)". */
export function editionSeoTitle(
	book: EditionPage["book"],
	edition: EditionCore,
): string {
	const kind = [edition.language, edition.format?.toLowerCase()]
		.filter(Boolean)
		.join(" ");
	const year = edition.publishedYear ? ` (${edition.publishedYear})` : "";
	return `${editionHeadline(book, edition)} — ${kind ? `${kind} ` : ""}edition${year}`;
}

export function editionSeoDescription(
	page: Pick<EditionPage, "book" | "edition" | "stats">,
): string {
	const { book, edition, stats } = page;
	const facts = editionFactsLine(edition);
	const readers = stats.finished + stats.readingNow;
	const bits = [
		`${editionHeadline(book, edition)} by ${book.authors.join(", ") || "an unknown author"}`,
		facts ? `${facts}` : null,
		edition.publishers[0] ? `Published by ${edition.publishers[0]}` : null,
		edition.isbn13 ? `ISBN ${edition.isbn13}` : null,
		readers > 0
			? `${readers} ${readers === 1 ? "member has" : "members have"} read it or are reading it on BBRC`
			: null,
	].filter(Boolean);
	return `${bits.join(". ")}.`;
}

/** A line that tells a summary apart in a strip or a table. */
export function summaryLine(summary: EditionSummary): string {
	return (
		[
			summary.language,
			summary.format,
			summary.pages ? `${summary.pages} pp.` : null,
			summary.publishedYear ? String(summary.publishedYear) : null,
		]
			.filter(Boolean)
			.join(" · ") || "No details yet"
	);
}

export function coverSrc(
	cover: { coverId: number | null; url: string | null } | undefined,
	size: "S" | "M" | "L" = "M",
): string | null {
	if (!cover) return null;
	if (cover.url) return cover.url;
	if (cover.coverId != null) {
		return `https://covers.openlibrary.org/b/id/${cover.coverId}-${size}.jpg`;
	}
	return null;
}
