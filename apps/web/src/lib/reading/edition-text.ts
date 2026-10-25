import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";

/**
 * What to call the copy someone is reading: the edition's label, or, with no
 * edition (a PDF, an ebook, any copy), "Own copy · 320 pages" or "No edition".
 */
export function editionDisplayLabel(
	edition: ReadingItem["edition"],
	totalPages: number | null | undefined,
): string {
	if (edition?.label) return edition.label;
	if (edition) return "Edition";
	return totalPages ? `Own copy · ${totalPages} pages` : "No edition";
}
