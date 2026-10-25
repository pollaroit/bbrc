import { resolveAuthor } from "@bbrc/api/modules/author/author-resolve";
import {
	getAuthorComments,
	getAuthorPosts,
} from "@bbrc/api/modules/author/author-social.service";
import {
	getAuthorFavorites,
	getAuthorReads,
	getAuthorReviews,
	getAuthorShelves,
	getAuthorSittings,
} from "@bbrc/api/modules/author/author-tabs.service";
import { viewerFromSession } from "@bbrc/api/modules/user/user-visibility";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth, db } from "@/services";

/** The author tabs that show club activity (the folder name is the route key). */
export type AuthorActivityTab =
	| "reads"
	| "reviews"
	| "posts"
	| "comments"
	| "sittings"
	| "favorites"
	| "shelves";

const TAB_LABELS: Record<AuthorActivityTab, string> = {
	reads: "reads",
	reviews: "reviews",
	posts: "posts",
	comments: "comments",
	sittings: "sittings",
	favorites: "favorites",
	shelves: "shelves",
};

const TAB_DESCRIPTIONS: Record<AuthorActivityTab, (name: string) => string> = {
	reads: (name) => `Members who finished a book by ${name}, and when.`,
	reviews: (name) => `What members think of the books by ${name}.`,
	posts: (name) => `Posts that mention ${name}.`,
	comments: (name) => `Comments on posts that mention ${name}.`,
	sittings: (name) => `Club sittings where a book by ${name} was in play.`,
	favorites: (name) =>
		`Members who put a book by ${name} among their favorites.`,
	shelves: (name) => `Public shelves that hold books by ${name}.`,
};

type AuthorTabHead = {
	/** Canonical slug (the one in the address after any redirect). */
	slug: string;
	name: string;
	/** True when the club has nothing to show on this tab yet. */
	empty: boolean;
};

const ONE = { limit: 1 } as const;

async function tabIsEmpty(tab: AuthorActivityTab, slug: string) {
	const session = await auth.api.getSession({ headers: await headers() });
	const input = { slug, ...ONE };

	switch (tab) {
		case "reads":
			return (await getAuthorReads(input, db, session)).metadata.total === 0;
		case "reviews":
			return (
				(
					await getAuthorReviews(
						{ ...input, sortBy: "createdAt", sortDirection: "desc" },
						db,
						session,
					)
				).metadata.total === 0
			);
		case "posts":
			return (await getAuthorPosts(input, db, session)).metadata.total === 0;
		case "comments":
			return (await getAuthorComments(input, db, session)).metadata.total === 0;
		case "sittings":
			return (await getAuthorSittings(input, db, session)).metadata.total === 0;
		case "favorites":
			return (
				(await getAuthorFavorites(input, db, session)).totalFavorites === 0
			);
		case "shelves":
			return (await getAuthorShelves(input, db, session)).metadata.total === 0;
	}
}

/**
 * Resolves the slug of an author tab (canonical, merged, old or alias slug), the name
 * for the page title and whether the tab has anything on it. One lookup per request.
 */
export const loadAuthorTabHead = cache(
	async (
		slug: string,
		tab: AuthorActivityTab,
	): Promise<(AuthorTabHead & { redirectTo: string | null }) | null> => {
		const session = await auth.api.getSession({ headers: await headers() });

		try {
			const resolved = await resolveAuthor(
				db,
				slug,
				viewerFromSession(session),
			);
			const author = await db.author.findUnique({
				where: { id: resolved.id },
				select: { name: true },
			});
			if (!author) return null;

			return {
				slug: resolved.slug,
				name: author.name,
				redirectTo: resolved.redirectTo,
				empty: await tabIsEmpty(tab, resolved.slug),
			};
		} catch {
			return null;
		}
	},
);

/** For a tab page: 404 when unknown, 308 to the canonical address after a merge or rename. */
export async function requireAuthorTab(
	slug: string,
	tab: AuthorActivityTab,
): Promise<AuthorTabHead> {
	const head = await loadAuthorTabHead(slug, tab);
	if (!head) notFound();
	if (head.redirectTo) {
		permanentRedirect(`/authors/${head.redirectTo}/${tab}` as Route);
	}
	return head;
}

export async function buildAuthorTabMetadata(
	slug: string,
	tab: AuthorActivityTab,
): Promise<Metadata> {
	const head = await loadAuthorTabHead(slug, tab);
	if (!head) return buildNotFoundMetadata("Author");

	return buildPageMetadata({
		title: `${head.name} ${TAB_LABELS[tab]}`,
		description: TAB_DESCRIPTIONS[tab](head.name),
		path: `/authors/${head.slug}/${tab}`,
		// An empty tab is a thin page: keep it out of search results (links still followed).
		...(head.empty ? { robots: { index: false, follow: true } } : {}),
	});
}
