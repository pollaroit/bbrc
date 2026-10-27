import { DEFAULT_LOCALE, LOCALES, type Locale } from "./locales";

const PREFIX = new RegExp(`^/(${LOCALES.join("|")})(?=/|\\?|#|$)`);

/** The language a path starts with (`/az/books` is "az"), or null when it has no language prefix. */
export function getLocaleFromPath(path: string): Locale | null {
	const match = PREFIX.exec(path);
	return (match?.[1] as Locale | undefined) ?? null;
}

/**
 * The path without its language prefix, keeping the query and hash:
 * `/az/books/x?tab=a` becomes `/books/x?tab=a`, `/az` becomes `/`, other paths are unchanged.
 */
export function stripLocalePrefix(path: string): string {
	const stripped = path.replace(PREFIX, "");
	if (stripped === path) return path;
	return stripped === "" || stripped.startsWith("?") || stripped.startsWith("#")
		? `/${stripped}`
		: stripped;
}

/**
 * The address of a page in a language: English has no prefix, every other language has one.
 * A path that already carries a prefix is replaced, never doubled.
 */
export function withLocalePrefix(path: string, locale: Locale): string {
	const bare = stripLocalePrefix(path);
	if (locale === DEFAULT_LOCALE) return bare;
	// The home page has no path of its own: `/az`, `/az?a=1`.
	if (bare === "/" || bare.startsWith("/?") || bare.startsWith("/#")) {
		return `/${locale}${bare.slice(1)}`;
	}
	return `/${locale}${bare}`;
}
