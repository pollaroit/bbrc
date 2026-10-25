import type { Route } from "next";

/** The page of one edition: `/books/<book>/editions/<key>` (key = `OL123M` or `m-…`). */
export function editionHref(bookSlug: string, key: string): Route {
	return `/books/${bookSlug}/editions/${key}` as Route;
}
