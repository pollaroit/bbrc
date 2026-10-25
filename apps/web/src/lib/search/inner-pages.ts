import type { GlobalSearchHit } from "@bbrc/api/modules/search/global-search.schema";

/** A page inside a book or member profile that search can jump straight to. */
export type InnerPage = {
	id: string;
	label: string;
	/** Appended to the item's own href. */
	path: string;
	/** Extra words that also select this page when typed after a colon. */
	aliases?: string[];
};

export const BOOK_INNER_PAGES: InnerPage[] = [
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
];

export const USER_INNER_PAGES: InnerPage[] = [
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
];

export function innerPagesFor(
	type: GlobalSearchHit["type"],
): InnerPage[] | null {
	if (type === "book") {
		return BOOK_INNER_PAGES;
	}
	if (type === "user") {
		return USER_INNER_PAGES;
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
): InnerPage | null {
	const needle = typed.trim().toLowerCase();
	if (!needle) {
		return null;
	}
	return (
		pages.find((page) =>
			[page.id, page.label, ...(page.aliases ?? [])].some((name) =>
				name.toLowerCase().startsWith(needle),
			),
		) ?? null
	);
}
