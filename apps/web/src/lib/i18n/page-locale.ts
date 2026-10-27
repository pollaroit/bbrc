import { type Locale, toLocale } from "@bbrc/i18n";

/** The language the page in this browser is in (the `<html lang>` that the layout sets). */
export function getPageLocale(): Locale {
	if (typeof document === "undefined") return toLocale(undefined);
	return toLocale(document.documentElement.lang);
}

/** The cookie that remembers the language, one year, for the whole site. */
export function writeLocaleCookie(locale: Locale, cookieName: string): void {
	document.cookie = `${cookieName}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** Set once per browser tab session after the sign-in sync (or a pick) so nothing redirects twice. */
export const LOCALE_SYNC_KEY = "bbrc:locale-synced";

export function readSyncedUser(): string | null {
	try {
		return sessionStorage.getItem(LOCALE_SYNC_KEY);
	} catch {
		return null;
	}
}

export function markSyncedUser(userId: string): void {
	try {
		sessionStorage.setItem(LOCALE_SYNC_KEY, userId);
	} catch {
		// Private mode: the sync then runs again on the next page, which is harmless.
	}
}
