import type { Route } from "next";

export type AuthorTabId =
	| "overview"
	| "books"
	| "about"
	| "more"
	| "reads"
	| "reviews"
	| "posts"
	| "sittings"
	| "favorites"
	| "shelves"
	| "series"
	| "followers"
	| "stats";

export type AuthorTab = {
	id: AuthorTabId;
	label: string;
	/** Path segment under `/authors/<slug>`; empty for the overview. */
	segment: string;
};

/** One list for the tab bar, the pages' metadata and the sitemap. */
export const AUTHOR_TABS: readonly AuthorTab[] = [
	{ id: "overview", label: "Overview", segment: "" },
	{ id: "books", label: "Books", segment: "books" },
	{ id: "about", label: "About", segment: "about" },
	{ id: "more", label: "More", segment: "more" },
	{ id: "reads", label: "Reads", segment: "reads" },
	{ id: "reviews", label: "Reviews", segment: "reviews" },
	{ id: "posts", label: "Posts", segment: "posts" },
	{ id: "sittings", label: "Sittings", segment: "sittings" },
	{ id: "favorites", label: "Favorites", segment: "favorites" },
	{ id: "shelves", label: "Shelves", segment: "shelves" },
	{ id: "series", label: "Series", segment: "series" },
	{ id: "followers", label: "Followers", segment: "followers" },
	{ id: "stats", label: "Stats", segment: "stats" },
];

export function authorTabHref(slug: string, tab: AuthorTab): Route {
	return (
		tab.segment ? `/authors/${slug}/${tab.segment}` : `/authors/${slug}`
	) as Route;
}

export function authorTabFromPathname(
	slug: string,
	pathname: string,
): AuthorTabId {
	const base = `/authors/${slug}`;
	for (const tab of AUTHOR_TABS) {
		if (!tab.segment) {
			continue;
		}
		const href = `${base}/${tab.segment}`;
		if (pathname === href || pathname.startsWith(`${href}/`)) {
			return tab.id;
		}
	}
	return "overview";
}
