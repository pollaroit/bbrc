import type { BookEditionItem } from "@bbrc/api/modules/book-edition/book-edition.schema";
import { DEFAULT_LOCALE, type Locale } from "@bbrc/i18n";
import { formatEditionLanguage } from "@bbrc/shared";

export const EDITION_LANGUAGE_LABELS: Record<string, string> = {
	eng: "English",
	tur: "Turkish",
	rus: "Russian",
	aze: "Azerbaijani",
};

export const EDITION_FORMAT_LABELS: Record<BookEditionItem["format"], string> =
	{
		paperback: "Paperback",
		hardcover: "Hardcover",
		ebook: "E-book",
		audiobook: "Audiobook",
		other: "Other",
	};

/** "Turkish" for `tur` or `/languages/tur`; never the raw Open Library key. */
export const languageLabel = (code: string, locale: Locale = DEFAULT_LOCALE) =>
	formatEditionLanguage(code, locale);

/** "Penguin · 2003 · eng": a short line that tells editions apart. */
export function editionLabelFromParts(parts: {
	title?: string | null;
	publisher?: string | null;
	year?: number | string | null;
	language?: string | null;
}) {
	return (
		[
			parts.title,
			parts.publisher,
			parts.year,
			parts.language ? formatEditionLanguage(parts.language) : null,
		]
			.filter((part) => part != null && String(part).trim() !== "")
			.join(" · ") || null
	);
}

/** The snapshot stored with a reading when a member edition is chosen. */
export function memberEditionLabel(edition: BookEditionItem) {
	return editionLabelFromParts({
		title: edition.title,
		publisher: edition.publisher,
		year: edition.publishedYear,
		language: edition.language,
	});
}
