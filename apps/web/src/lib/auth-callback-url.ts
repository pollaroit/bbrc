import type { Route } from "next";

const AUTH_PATHS = ["/sign-in", "/sign-up"] as const;

/** Safe internal path to return to after auth. */
export function safeCallbackUrl(raw: string | null | undefined): Route {
	if (!raw) {
		return "/";
	}

	const decoded = decodeURIComponent(raw).trim();

	if (!decoded.startsWith("/") || decoded.startsWith("//")) {
		return "/";
	}

	for (const authPath of AUTH_PATHS) {
		if (decoded === authPath || decoded.startsWith(`${authPath}?`)) {
			return "/";
		}
	}

	return decoded as Route;
}

export function authPageHref(
	path: "/sign-in" | "/sign-up",
	callbackUrl?: string | null,
): Route {
	const safe = callbackUrl ? safeCallbackUrl(callbackUrl) : "/";
	if (safe === "/") {
		return path;
	}
	return `${path}?callback_url=${encodeURIComponent(safe)}` as Route;
}

/** Current location for use in client components (path + query). */
export function currentPageCallbackUrl(
	pathname: string,
	search: string,
): string {
	const path = search ? `${pathname}?${search.replace(/^\?/, "")}` : pathname;
	return path;
}
