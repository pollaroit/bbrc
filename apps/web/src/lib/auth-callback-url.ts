import { type Locale, stripLocalePrefix, withLocalePrefix } from "@bbrc/i18n";
import type { Route } from "next";

const AUTH_PATHS = ["/sign-in", "/sign-up"] as const;

/** Never a protocol-relative or backslash address: those leave the site. */
function isInternalPath(path: string): boolean {
	return (
		path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")
	);
}

/**
 * Safe internal path to return to after auth. It is returned WITHOUT a language prefix (the
 * router puts the visitor's language back), so `/az/books` and `/books` both give `/books`.
 */
export function safeCallbackUrl(raw: string | null | undefined): Route {
	if (!raw) {
		return "/";
	}

	let decoded: string;
	try {
		decoded = decodeURIComponent(raw).trim();
	} catch {
		return "/";
	}

	if (!isInternalPath(decoded)) {
		return "/";
	}

	// Strip first, then check again: `/az//evil.com` is `//evil.com` once the prefix is gone.
	const path = stripLocalePrefix(decoded);
	if (!isInternalPath(path)) {
		return "/";
	}

	for (const authPath of AUTH_PATHS) {
		if (
			path === authPath ||
			path.startsWith(`${authPath}?`) ||
			path.startsWith(`${authPath}/`)
		) {
			return "/";
		}
	}

	return path as Route;
}

/**
 * The sign-in or sign-up address with an optional way back. Pass `locale` where the address
 * is used outside the language-aware `Link` and router (a server `redirect()`), so the
 * visitor stays in their language; with `Link` leave it out.
 */
export function authPageHref(
	path: "/sign-in" | "/sign-up",
	callbackUrl?: string | null,
	locale?: Locale,
): Route {
	const base = locale ? withLocalePrefix(path, locale) : path;
	const safe = callbackUrl ? safeCallbackUrl(callbackUrl) : "/";
	if (safe === "/") {
		return base as Route;
	}
	return `${base}?callback_url=${encodeURIComponent(safe)}` as Route;
}

/** Current location for use in client components (path + query). */
export function currentPageCallbackUrl(
	pathname: string,
	search: string,
): string {
	const path = search ? `${pathname}?${search.replace(/^\?/, "")}` : pathname;
	return path;
}
