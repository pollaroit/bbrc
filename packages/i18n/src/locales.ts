/**
 * The languages of the app. Adding one means a new folder under `messages/` and one entry
 * here; nothing else in the app needs to change. English is the source of every text.
 */
export const LOCALES = ["en", "az"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Each language in its own words, for the language picker. */
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
	en: "English",
	az: "Azərbaycanca",
};

/** The BCP 47 tag used for `Intl` formatting (dates, numbers, plural rules). */
export const LOCALE_INTL_TAGS: Record<Locale, string> = {
	en: "en-US",
	az: "az-AZ",
};

/** Name of the cookie that remembers the visitor's language. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
	return (
		typeof value === "string" && (LOCALES as readonly string[]).includes(value)
	);
}

/** The language for a value of unknown origin (a cookie, a header, a stored setting). */
export function toLocale(value: unknown): Locale {
	return isLocale(value) ? value : DEFAULT_LOCALE;
}
