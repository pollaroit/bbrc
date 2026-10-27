import { createLooseTranslator, DEFAULT_LOCALE, type Locale } from "@bbrc/i18n";

/** The name of a genre, subgenre or category ("Science Fiction"), by its slug, in a language. */
export function genreName(slug: string, locale: Locale = DEFAULT_LOCALE) {
	return createLooseTranslator(locale, "genres.names")(slug);
}
