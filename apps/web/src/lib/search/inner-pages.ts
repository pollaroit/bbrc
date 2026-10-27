import type { GlobalSearchHit } from "@bbrc/api/modules/search/global-search.schema";

/** A page inside a book, author or member profile that search can jump straight to. */
export type InnerPageScope = "book" | "user" | "author";

export type InnerPage = {
	id: string;
	scope: InnerPageScope;
	/** English name, also matched when typed; the shown name comes from the messages. */
	label: string;
	/** Appended to the item's own href. */
	path: string;
	/** Extra words that also select this page when typed after a colon. */
	aliases?: string[];
};

type InnerPageInput = Omit<InnerPage, "scope">;

const scoped = (scope: InnerPageScope, pages: InnerPageInput[]): InnerPage[] =>
	pages.map((page) => ({ ...page, scope }));

export const BOOK_INNER_PAGES: InnerPage[] = scoped("book", [
	{ id: "about", label: "About", path: "about" },
	{ id: "editions", label: "Editions", path: "editions" },
	{ id: "documents", label: "Documents", path: "documents", aliases: ["docs"] },
	{ id: "shelves", label: "Shelves", path: "shelves" },
	{
		id: "reviews",
		label: "Reviews",
		path: "reviews",
		aliases: ["feedbacks", "feedback"],
	},
	{ id: "reads", label: "Reads", path: "reads" },
	{ id: "sittings", label: "Sittings", path: "sittings" },
	{ id: "stats", label: "Stats", path: "stats", aliases: ["statistics"] },
	{ id: "favorites", label: "Favorites", path: "favorites" },
	{ id: "quizzes", label: "Quizzes", path: "quizzes", aliases: ["quiz"] },
	{ id: "more", label: "More to read", path: "more", aliases: ["similar"] },
	{
		id: "insights",
		label: "Insights",
		path: "insights",
		aliases: ["views", "analytics"],
	},
]);

export const USER_INNER_PAGES: InnerPage[] = scoped("user", [
	{ id: "sittings", label: "Sittings", path: "sittings" },
	{ id: "reads", label: "Reads", path: "reads" },
	{ id: "quizzes", label: "Quizzes", path: "quizzes", aliases: ["quiz"] },
	{ id: "posts", label: "Feed", path: "posts", aliases: ["feed"] },
	{
		id: "feedbacks",
		label: "Feedbacks",
		path: "feedbacks",
		aliases: ["reviews", "feedback"],
	},
	{ id: "shelves", label: "Shelves", path: "shelves" },
	{ id: "goals", label: "Goals", path: "goals" },
	{
		id: "mentions",
		label: "Mentions",
		path: "mentions",
		aliases: ["mentioned"],
	},
	{
		id: "achievements",
		label: "Achievements",
		path: "achievements",
		aliases: ["badges"],
	},
	{ id: "stats", label: "Stats", path: "stats", aliases: ["statistics"] },
	{ id: "xp", label: "XP", path: "xp" },
	{ id: "rp", label: "RP", path: "rp" },
]);

export const AUTHOR_INNER_PAGES: InnerPage[] = scoped("author", [
	{ id: "books", label: "Books", path: "books" },
	{ id: "about", label: "About", path: "about", aliases: ["bio"] },
	{ id: "more", label: "Similar authors", path: "more", aliases: ["similar"] },
	{ id: "reads", label: "Reads", path: "reads" },
	{
		id: "reviews",
		label: "Reviews",
		path: "reviews",
		aliases: ["feedbacks", "feedback"],
	},
	{ id: "posts", label: "Posts", path: "posts", aliases: ["feed"] },
	{ id: "sittings", label: "Sittings", path: "sittings" },
	{ id: "favorites", label: "Favorites", path: "favorites" },
	{ id: "shelves", label: "Shelves", path: "shelves" },
	{ id: "series", label: "Series", path: "series" },
	{
		id: "followers",
		label: "Followers",
		path: "followers",
		aliases: ["following"],
	},
	{ id: "stats", label: "Stats", path: "stats", aliases: ["statistics"] },
]);

export function innerPagesFor(
	type: GlobalSearchHit["type"],
): InnerPage[] | null {
	if (type === "book") {
		return BOOK_INNER_PAGES;
	}
	if (type === "user") {
		return USER_INNER_PAGES;
	}
	if (type === "author") {
		return AUTHOR_INNER_PAGES;
	}
	return null;
}

export function innerPageHref(hit: GlobalSearchHit, page: InnerPage): string {
	return `${hit.href}/${page.path}`;
}

/** First page whose name starts with what was typed after the colon. */
export function matchInnerPage(
	pages: InnerPage[],
	typed: string,
	/** The page name in the page language, matched next to the English name and the aliases. */
	shownName: (page: InnerPage) => string = (page) => page.label,
): InnerPage | null {
	const needle = typed.trim().toLowerCase();
	if (!needle) {
		return null;
	}
	return (
		pages.find((page) =>
			[page.id, page.label, shownName(page), ...(page.aliases ?? [])].some(
				(name) => name.toLowerCase().startsWith(needle),
			),
		) ?? null
	);
}
