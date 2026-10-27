import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES } from "@bbrc/i18n";
import { defineRouting } from "next-intl/routing";

/**
 * English has no prefix (`/books`), every other language has one (`/az/books`).
 * There is no detection from the browser: everyone starts in English. A visitor who chose
 * another language is sent to it by `proxy.ts` (it reads the cookie).
 */
export const routing = defineRouting({
	locales: LOCALES,
	defaultLocale: DEFAULT_LOCALE,
	localePrefix: "as-needed",
	localeDetection: false,
	localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365 },
});
