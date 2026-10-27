import { DEFAULT_LOCALE, type Locale, toLocale } from "@bbrc/i18n";
import type { Context } from "../context";

/** Name of the request header the web app sends with the language of the current page. */
export const LOCALE_HEADER = "x-locale";

/** The language of the page that made this call (what the member is looking at right now). */
export function resolveRequestLocale(context: Pick<Context, "locale">): Locale {
	return context.locale ?? DEFAULT_LOCALE;
}

/** The language of a request header value; anything unknown is English. */
export function localeFromHeader(value: string | null | undefined): Locale {
	return toLocale(value);
}

/**
 * The language to write text IN for somebody else (a notification, a push message): the one
 * that member saved, English when none.
 */
export function recipientLocale(user: { locale?: string | null }): Locale {
	return toLocale(user.locale);
}
