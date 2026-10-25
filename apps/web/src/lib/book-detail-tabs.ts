import type { Route } from "next";

export type BookDetailTabId =
	| "overview"
	| "about"
	| "editions"
	| "documents"
	| "shelves"
	| "reviews"
	| "reads"
	| "reading"
	| "sittings"
	| "stats"
	| "favorites"
	| "quizzes"
	| "insights"
	| "more";

export type BookDetailTab = {
	id: BookDetailTabId;
	label: string;
	href: (slug: string) => Route;
};

export const BOOK_DETAIL_TABS: BookDetailTab[] = [
	{
		id: "overview",
		label: "Overview",
		href: (slug) => `/books/${slug}` as Route,
	},
	{
		id: "about",
		label: "About",
		href: (slug) => `/books/${slug}/about` as Route,
	},
	{
		id: "editions",
		label: "Editions",
		href: (slug) => `/books/${slug}/editions` as Route,
	},
	{
		id: "documents",
		label: "Documents",
		href: (slug) => `/books/${slug}/documents` as Route,
	},
	{
		id: "shelves",
		label: "Shelves",
		href: (slug) => `/books/${slug}/shelves` as Route,
	},
	{
		id: "reviews",
		label: "Reviews",
		href: (slug) => `/books/${slug}/reviews` as Route,
	},
	{
		id: "reads",
		label: "Reads",
		href: (slug) => `/books/${slug}/reads` as Route,
	},
	{
		id: "reading",
		label: "Reading",
		href: (slug) => `/books/${slug}/reading` as Route,
	},
	{
		id: "sittings",
		label: "Sittings",
		href: (slug) => `/books/${slug}/sittings` as Route,
	},
	{
		id: "stats",
		label: "Stats",
		href: (slug) => `/books/${slug}/stats` as Route,
	},
	{
		id: "favorites",
		label: "Favorites",
		href: (slug) => `/books/${slug}/favorites` as Route,
	},
	{
		id: "quizzes",
		label: "Quizzes",
		href: (slug) => `/books/${slug}/quizzes` as Route,
	},
	{
		id: "insights",
		label: "Insights",
		href: (slug) => `/books/${slug}/insights` as Route,
	},
	{
		id: "more",
		label: "More",
		href: (slug) => `/books/${slug}/more` as Route,
	},
];

export function bookDetailTabFromPathname(
	slug: string,
	pathname: string,
): BookDetailTabId {
	const base = `/books/${slug}`;
	if (pathname === base || pathname === `${base}/`) {
		return "overview";
	}
	for (const tab of BOOK_DETAIL_TABS) {
		if (tab.id === "overview") {
			continue;
		}
		const href = tab.href(slug);
		if (pathname === href || pathname.startsWith(`${href}/`)) {
			return tab.id;
		}
	}
	return "overview";
}
