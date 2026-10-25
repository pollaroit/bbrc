import type { AuthorProfile } from "@bbrc/api/modules/author/author.schema";

/** ISO 8601 with the precision we know ("1821", "1821-11", "1821-11-11"); BC years and unknown years give null. */
export function dateForJsonLd(date: AuthorProfile["birth"]): string | null {
	if (date.year == null || date.year < 1) {
		return null;
	}
	const year = String(date.year).padStart(4, "0");
	if (date.month == null) {
		return year;
	}
	const month = String(date.month).padStart(2, "0");
	if (date.day == null) {
		return `${year}-${month}`;
	}
	return `${year}-${month}-${String(date.day).padStart(2, "0")}`;
}

/** Outside pages about the same person (Wikipedia, Wikidata, Open Library, Goodreads, own website). */
export function authorSameAs(links: AuthorProfile["links"]): string[] {
	return links
		.map((link) => link.url)
		.filter((url) => url.startsWith("https://"));
}
