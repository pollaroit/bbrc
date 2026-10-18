import type { Route } from "next";
import { parseAsString, useQueryState } from "nuqs";

/** After save, return to this path segment (e.g. `books` → `/books`). */
export function useEditBookRedirect() {
	return useQueryState("redirect", parseAsString);
}

export function editBookPageHref(
	slug: string,
	redirect?: string | null,
): Route {
	const base = `/books/${slug}/edit`;
	if (!redirect) {
		return base as Route;
	}
	return `${base}?redirect=${encodeURIComponent(redirect)}` as Route;
}
