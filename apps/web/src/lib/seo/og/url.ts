import { DEFAULT_LOCALE, type Locale, withLocalePrefix } from "@bbrc/i18n";
import { absoluteUrl } from "../site";
import { ogPathFromPagePath } from "./paths";

/**
 * The share-card address of a page. Another language than English adds its prefix
 * (`/og/az/books/x`), so each language has its own card (and its own cache entry in chat apps).
 */
export function openGraphImageForPath(
	pagePath: string,
	alt?: string,
	locale: Locale = DEFAULT_LOCALE,
): { url: string; width: number; height: number; alt: string } {
	const ogPath = ogPathFromPagePath(withLocalePrefix(pagePath, locale));
	return {
		url: absoluteUrl(ogPath),
		width: 1200,
		height: 630,
		alt: alt?.trim() || "BBRC preview",
	};
}
