import type { Database } from "@bbrc/db";
import { authorNameToSlug } from "@bbrc/shared";
import type {
	GlobalSearchHit,
	GlobalSearchInput,
	GlobalSearchOutput,
} from "./global-search.schema";
import {
	GLOBAL_SEARCH_MAX_ITEMS,
	GLOBAL_SEARCH_PER_TYPE_LIMIT,
	previewText,
	shuffleInPlace,
} from "./global-search.utils";

type SearchContext = {
	db: Database;
	query: string;
	isAdmin: boolean;
};

function containsQuery(query: string) {
	return {
		contains: query,
		mode: "insensitive" as const,
	};
}

async function searchBooks(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const pattern = `%${ctx.query}%`;
	const authorBookIds = await ctx.db.$queryRaw<{ id: string }[]>`
		SELECT DISTINCT b.id
		FROM book b
		WHERE EXISTS (
			SELECT 1 FROM unnest(b.authors) AS author_name(name)
			WHERE author_name.name ILIKE ${pattern}
		)
		LIMIT ${GLOBAL_SEARCH_PER_TYPE_LIMIT}
	`;

	const rows = await ctx.db.book.findMany({
		where: {
			OR: [
				{ title: containsQuery(ctx.query) },
				{ slug: containsQuery(ctx.query) },
				...(authorBookIds.length > 0
					? [{ id: { in: authorBookIds.map((row) => row.id) } }]
					: []),
			],
		},
		orderBy: [{ updatedAt: "desc" }, { slug: "desc" }],
		take: GLOBAL_SEARCH_PER_TYPE_LIMIT,
		select: {
			slug: true,
			title: true,
			authors: true,
		},
	});

	return rows.map((row) => ({
		type: "book" as const,
		title: row.title,
		description: row.authors.join(", "),
		href: `/books/${row.slug}`,
	}));
}

async function searchAuthors(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const pattern = `%${ctx.query}%`;
	const rows = await ctx.db.$queryRaw<{ author_name: string }[]>`
		SELECT DISTINCT author_name
		FROM (
			SELECT unnest(authors) AS author_name FROM book
		) AS authors_unnested
		WHERE author_name ILIKE ${pattern}
		ORDER BY author_name ASC
		LIMIT ${GLOBAL_SEARCH_PER_TYPE_LIMIT}
	`;

	const seen = new Set<string>();

	return rows.flatMap((row) => {
		const name = row.author_name.trim();
		if (!name) {
			return [];
		}

		const slug = authorNameToSlug(name);
		if (seen.has(slug)) {
			return [];
		}

		seen.add(slug);

		return [
			{
				type: "author" as const,
				title: name,
				description: "Author",
				href: `/books?authors=${encodeURIComponent(slug)}`,
			},
		];
	});
}

async function searchUsers(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const rows = await ctx.db.user.findMany({
		where: {
			status: { in: ["active", "warned"] },
			isHidden: false,
			OR: [
				{ name: containsQuery(ctx.query) },
				{ username: containsQuery(ctx.query) },
			],
		},
		orderBy: [{ xp: "desc" }, { username: "asc" }],
		take: GLOBAL_SEARCH_PER_TYPE_LIMIT,
		select: {
			username: true,
			name: true,
		},
	});

	return rows.map((row) => ({
		type: "user" as const,
		title: row.name?.trim() || row.username,
		description: `@${row.username}`,
		href: `/users/${row.username}`,
	}));
}

async function searchPosts(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const rows = await ctx.db.post.findMany({
		where: {
			author: { isHidden: false },
			OR: [
				{ content: containsQuery(ctx.query) },
				{ slug: containsQuery(ctx.query) },
				{ author: { username: containsQuery(ctx.query) } },
			],
		},
		orderBy: [{ createdAt: "desc" }, { slug: "desc" }],
		take: GLOBAL_SEARCH_PER_TYPE_LIMIT,
		select: {
			slug: true,
			content: true,
			author: { select: { username: true } },
		},
	});

	return rows.map((row) => ({
		type: "post" as const,
		title: previewText(row.content, 80),
		description: `@${row.author.username}`,
		href: `/posts/${row.slug}`,
	}));
}

async function searchFeedbacks(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const rows = await ctx.db.feedback.findMany({
		where: {
			author: { isHidden: false },
			review: containsQuery(ctx.query),
		},
		orderBy: [{ createdAt: "desc" }, { slug: "desc" }],
		take: GLOBAL_SEARCH_PER_TYPE_LIMIT,
		select: {
			slug: true,
			review: true,
			book: { select: { slug: true, title: true } },
			author: { select: { username: true } },
		},
	});

	return rows.map((row) => ({
		type: "feedback" as const,
		title: row.book.title,
		description: `${previewText(row.review, 80)} · @${row.author.username}`,
		href: `/books/${row.book.slug}/feedbacks/${row.slug}`,
	}));
}

function commentHref(row: {
	slug: string;
	post: { slug: string } | null;
	feedback: { slug: string; book: { slug: string } } | null;
}): string | null {
	if (row.post) {
		return `/posts/${row.post.slug}/comments/${row.slug}`;
	}

	if (row.feedback) {
		return `/books/${row.feedback.book.slug}/feedbacks/${row.feedback.slug}/comments/${row.slug}`;
	}

	return null;
}

async function searchComments(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const rows = await ctx.db.comment.findMany({
		where: {
			author: { isHidden: false },
			OR: [
				{ content: containsQuery(ctx.query) },
				{ slug: containsQuery(ctx.query) },
				{ author: { username: containsQuery(ctx.query) } },
			],
		},
		orderBy: [{ createdAt: "desc" }, { slug: "desc" }],
		take: GLOBAL_SEARCH_PER_TYPE_LIMIT,
		select: {
			slug: true,
			content: true,
			author: { select: { username: true } },
			post: { select: { slug: true } },
			feedback: {
				select: {
					slug: true,
					book: { select: { slug: true } },
				},
			},
		},
	});

	return rows.flatMap((row) => {
		const href = commentHref(row);
		if (!href) {
			return [];
		}

		return [
			{
				type: "comment" as const,
				title: previewText(row.content, 80),
				description: `@${row.author.username}`,
				href,
			},
		];
	});
}

async function searchShelves(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const rows = await ctx.db.shelf.findMany({
		where: {
			status: "active",
			user: { isHidden: false },
			OR: [
				{ title: containsQuery(ctx.query) },
				{ slug: containsQuery(ctx.query) },
				{ description: containsQuery(ctx.query) },
				{ user: { name: containsQuery(ctx.query) } },
				{ user: { username: containsQuery(ctx.query) } },
			],
		},
		orderBy: [{ updatedAt: "desc" }, { slug: "desc" }],
		take: GLOBAL_SEARCH_PER_TYPE_LIMIT,
		select: {
			slug: true,
			title: true,
			description: true,
			user: { select: { username: true } },
		},
	});

	return rows.map((row) => ({
		type: "shelf" as const,
		title: row.title,
		description: row.description
			? `${previewText(row.description, 60)} · @${row.user.username}`
			: `@${row.user.username}`,
		href: `/users/${row.user.username}/shelves/${row.slug}`,
	}));
}

async function searchDocuments(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const rows = await ctx.db.document.findMany({
		where: {
			status: ctx.isAdmin ? { in: ["approved", "pending"] } : "approved",
			OR: [
				{ name: containsQuery(ctx.query) },
				{ book: { title: containsQuery(ctx.query) } },
				{ book: { slug: containsQuery(ctx.query) } },
			],
		},
		orderBy: [{ createdAt: "desc" }, { slug: "desc" }],
		take: GLOBAL_SEARCH_PER_TYPE_LIMIT,
		select: {
			slug: true,
			name: true,
			status: true,
			documentKey: true,
			book: { select: { slug: true, title: true } },
		},
	});

	return rows.map((row) => {
		const pending = row.status === "pending";
		return {
			type: "document" as const,
			title: row.name,
			description: pending
				? `${row.book.title} · Pending review`
				: row.book.title,
			href: `/books/${row.book.slug}/documents`,
			action:
				row.status === "approved" && row.documentKey
					? {
							label: "Open PDF",
							href: row.documentKey,
						}
					: undefined,
		};
	});
}

export async function globalSearch(
	input: GlobalSearchInput,
	db: Database,
	isAdmin: boolean,
): Promise<GlobalSearchOutput> {
	const ctx: SearchContext = {
		db,
		query: input.query,
		isAdmin,
	};

	const [
		books,
		authors,
		users,
		posts,
		feedbacks,
		comments,
		shelves,
		documents,
	] = await Promise.all([
		searchBooks(ctx),
		searchAuthors(ctx),
		searchUsers(ctx),
		searchPosts(ctx),
		searchFeedbacks(ctx),
		searchComments(ctx),
		searchShelves(ctx),
		searchDocuments(ctx),
	]);

	const combined = [
		...books,
		...authors,
		...users,
		...posts,
		...feedbacks,
		...comments,
		...shelves,
		...documents,
	];

	shuffleInPlace(combined);

	return {
		items: combined.slice(0, GLOBAL_SEARCH_MAX_ITEMS),
	};
}
