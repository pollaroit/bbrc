import { DEFAULT_LOCALE, LOCALES, type Locale } from "./locales";
import { stripLocalePrefix, withLocalePrefix } from "./paths";

export type PageLanguageUrls = {
	/** The address search engines should treat as the page itself. */
	canonical: string;
	/**
	 * The same page in every language (`hreflang`), plus `x-default` (English). Left out when the
	 * page has no real translation to offer.
	 */
	languages?: Record<string, string>;
};

/**
 * Canonical and alternate-language addresses of a page.
 *
 * - Pages whose text is the app's own (home, lists, achievements, books, authors...): each
 *   language is its own canonical and they list each other as alternates.
 * - Pages whose main content is written by members (posts, comments, reviews, shelves, profiles)
 *   look the same in every language: a non-English version names the English page as its
 *   canonical and is not offered as an alternate (no duplicate content).
 */
export function buildPageLanguageUrls(
	path: string,
	locale: Locale,
	options: { memberContent?: boolean } = {},
): PageLanguageUrls {
	const bare = stripLocalePrefix(path);

	if (options.memberContent) {
		return { canonical: withLocalePrefix(bare, DEFAULT_LOCALE) };
	}

	const languages: Record<string, string> = Object.fromEntries(
		LOCALES.map((code) => [code, withLocalePrefix(bare, code)]),
	);
	languages["x-default"] = withLocalePrefix(bare, DEFAULT_LOCALE);
	return { canonical: withLocalePrefix(bare, locale), languages };
}
