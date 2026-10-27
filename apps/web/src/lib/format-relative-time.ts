import {
	DEFAULT_LOCALE,
	formatRelativeTime as formatLocaleRelativeTime,
	type Locale,
} from "@bbrc/i18n";

/** "3 days ago" in the language of the page (English when no language is given). */
export function formatRelativeTime(
	value: Date | string,
	now: Date = new Date(),
	locale: Locale = DEFAULT_LOCALE,
): string {
	return formatLocaleRelativeTime(locale, value, now);
}
