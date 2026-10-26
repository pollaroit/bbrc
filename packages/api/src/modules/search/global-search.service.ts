import type { Database } from "@bbrc/db";
import {
	authorNameToSlug,
	countReadsForGoal,
	documentFormatFromFilename,
	documentFormatLabel,
	formatAuthorLifespan,
	goalScopeFromStored,
	richContentPreview,
} from "@bbrc/shared";
import { findBookIdsByAuthorNameSearch } from "../book/book-list-search";
import { visibleShelfWhere } from "../shelf/shelf-visibility";
import type {
	GlobalSearchHit,
	GlobalSearchHitType,
	GlobalSearchInput,
	GlobalSearchMedia,
	GlobalSearchOutput,
} from "./global-search.schema";
import { globalSearchHitTypes } from "./global-search.schema";
import {
	GLOBAL_SEARCH_MAX_ITEMS,
	GLOBAL_SEARCH_NARROW_LIMIT,
	GLOBAL_SEARCH_PER_TYPE_LIMIT,
	matchScore,
	previewText,
} from "./global-search.utils";

type SearchContext = {
	db: Database;
	query: string;
	isAdmin: boolean;
	/** The signed-in member, so their own private shelves can be found. */
	viewerId?: string;
	limit: number;
};

const COLLAGE_COVERS = 4;

function containsQuery(query: string) {
	return {
		contains: query,
		mode: "insensitive" as const,
	};
}

function coverMedia(coverId: number | null | undefined) {
	return coverId == null
		? undefined
		: ({ kind: "cover", coverId } satisfies GlobalSearchMedia);
}

function collageMedia(coverIds: (number | null)[]) {
	const ids = coverIds.filter((id): id is number => id != null);
	return ids.length === 0
		? undefined
		: ({
				kind: "collage",
				coverIds: ids.slice(0, COLLAGE_COVERS),
			} satisfies GlobalSearchMedia);
}

function avatarMedia(user: { image: string | null; name: string }) {
	return user.image
		? ({
				kind: "avatar",
				url: user.image,
				name: user.name,
			} satisfies GlobalSearchMedia)
		: undefined;
}

function imageMedia(url: string | null | undefined) {
	return url ? ({ kind: "image", url } satisfies GlobalSearchMedia) : undefined;
}

async function searchBooks(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const authorBookIds = (await findBookIdsByAuthorNameSearch(ctx.db, ctx.query))
		.slice(0, ctx.limit)
		.map((id) => ({ id }));

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
		take: ctx.limit,
		select: {
			slug: true,
			title: true,
			authors: true,
			coverId: true,
		},
	});

	return rows.map((row) => ({
		type: "book" as const,
		title: row.title,
		description: row.authors.join(", "),
		href: `/books/${row.slug}`,
		media: coverMedia(row.coverId),
	}));
}

async function searchAuthors(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const rows = await ctx.db.author.findMany({
		where: {
			books: { some: {} },
			OR: [
				{ name: containsQuery(ctx.query) },
				{ aliases: { some: { alias: containsQuery(ctx.query) } } },
			],
		},
		orderBy: [{ name: "asc" }],
		take: ctx.limit,
		select: {
			slug: true,
			name: true,
			photoUrl: true,
			birthYear: true,
			deathYear: true,
			_count: { select: { books: true } },
		},
	});

	const hits: GlobalSearchHit[] = rows.map((row) => {
		const lifespan = formatAuthorLifespan({
			birth: { year: row.birthYear },
			death: { year: row.deathYear },
		});
		const books = row._count.books;
		return {
			type: "author" as const,
			title: row.name,
			description: [
				"Author",
				lifespan,
				`${books} ${books === 1 ? "book" : "books"}`,
			]
				.filter(Boolean)
				.join(" · "),
			href: `/authors/${row.slug}`,
			media: imageMedia(row.photoUrl),
		};
	});

	if (hits.length >= ctx.limit) {
		return hits;
	}

	// Names on books the backfill has not linked to an author yet.
	const pattern = `%${ctx.query}%`;
	const legacy = await ctx.db.$queryRaw<
		{ author_name: string; books: bigint }[]
	>`
		SELECT author_name, COUNT(*) AS books
		FROM (
			SELECT unnest(authors) AS author_name
			FROM book b
			WHERE NOT EXISTS (SELECT 1 FROM book_author ba WHERE ba.book_id = b.id)
		) AS authors_unnested
		WHERE author_name ILIKE ${pattern}
		GROUP BY author_name
		ORDER BY author_name ASC
		LIMIT ${ctx.limit}
	`;

	const seen = new Set(rows.map((row) => row.slug));
	for (const row of legacy) {
		const name = row.author_name.trim();
		if (!name || hits.length >= ctx.limit) {
			continue;
		}
		const slug = authorNameToSlug(name);
		if (seen.has(slug)) {
			continue;
		}
		seen.add(slug);
		const books = Number(row.books);
		hits.push({
			type: "author" as const,
			title: name,
			description: `Author · ${books} ${books === 1 ? "book" : "books"}`,
			href: `/authors/${slug}`,
		});
	}

	return hits;
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
		take: ctx.limit,
		select: {
			username: true,
			name: true,
			image: true,
		},
	});

	return rows.map((row) => ({
		type: "user" as const,
		title: row.name?.trim() || row.username,
		description: `@${row.username}`,
		href: `/users/${row.username}`,
		media: avatarMedia(row),
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
		take: ctx.limit,
		select: {
			slug: true,
			content: true,
			imageUrl: true,
			author: { select: { username: true } },
		},
	});

	return rows.map((row) => ({
		type: "post" as const,
		title: richContentPreview(row.content, 80),
		description: `@${row.author.username}`,
		href: `/posts/${row.slug}`,
		media: imageMedia(row.imageUrl),
	}));
}

async function searchFeedbacks(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const rows = await ctx.db.feedback.findMany({
		where: {
			author: { isHidden: false },
			review: containsQuery(ctx.query),
		},
		orderBy: [{ createdAt: "desc" }, { slug: "desc" }],
		take: ctx.limit,
		select: {
			slug: true,
			review: true,
			book: { select: { slug: true, title: true, coverId: true } },
			author: { select: { username: true } },
		},
	});

	return rows.map((row) => ({
		type: "feedback" as const,
		title: row.book.title,
		description: `${richContentPreview(row.review, 80)} · @${row.author.username}`,
		href: `/books/${row.book.slug}/feedbacks/${row.slug}`,
		media: coverMedia(row.book.coverId),
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
		take: ctx.limit,
		select: {
			slug: true,
			content: true,
			imageUrl: true,
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
				title: richContentPreview(row.content, 80),
				description: `@${row.author.username}`,
				href,
				media: imageMedia(row.imageUrl),
			},
		];
	});
}

async function searchShelves(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const rows = await ctx.db.shelf.findMany({
		where: {
			// Private shelves only turn up for their owner and collaborators; the
			// Wishlist has its own page and is never listed here.
			isWishlist: false,
			AND: [
				visibleShelfWhere(
					ctx.viewerId ? { userId: ctx.viewerId, isAdmin: ctx.isAdmin } : null,
				),
				{
					OR: [
						{ title: containsQuery(ctx.query) },
						{ slug: containsQuery(ctx.query) },
						{ description: containsQuery(ctx.query) },
						{ user: { name: containsQuery(ctx.query) } },
						{ user: { username: containsQuery(ctx.query) } },
					],
				},
			],
		},
		orderBy: [{ updatedAt: "desc" }, { slug: "desc" }],
		take: ctx.limit,
		select: {
			slug: true,
			title: true,
			description: true,
			coverImageUrl: true,
			user: { select: { username: true } },
			books: {
				orderBy: { position: "asc" },
				take: COLLAGE_COVERS,
				select: { book: { select: { coverId: true } } },
			},
		},
	});

	return rows.map((row) => ({
		type: "shelf" as const,
		title: row.title,
		description: row.description
			? `${previewText(row.description, 60)} · @${row.user.username}`
			: `@${row.user.username}`,
		href: `/users/${row.user.username}/shelves/${row.slug}`,
		media:
			imageMedia(row.coverImageUrl) ??
			collageMedia(row.books.map((entry) => entry.book.coverId)),
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
		take: ctx.limit,
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
			media: {
				kind: "document" as const,
				format: documentFormatFromFilename(row.documentKey),
			},
			action:
				row.status === "approved" && row.documentKey
					? {
							label: `Open ${documentFormatLabel(row.documentKey)}`,
							href: row.documentKey,
						}
					: undefined,
		};
	});
}

async function searchGoals(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const rows = await ctx.db.goal.findMany({
		where: {
			user: { isHidden: false, status: { in: ["active", "warned"] } },
			OR: [
				{ title: containsQuery(ctx.query) },
				{ slug: containsQuery(ctx.query) },
				{ description: containsQuery(ctx.query) },
				{ user: { name: containsQuery(ctx.query) } },
				{ user: { username: containsQuery(ctx.query) } },
			],
		},
		orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
		take: ctx.limit,
		select: {
			slug: true,
			title: true,
			year: true,
			target: true,
			scopeKind: true,
			scopeAuthors: true,
			scopeCountries: true,
			userId: true,
			user: { select: { username: true, name: true, image: true } },
		},
	});

	if (rows.length === 0) {
		return [];
	}

	const reads = await ctx.db.read.findMany({
		where: {
			readEndMonth: { not: null },
			OR: rows.map((row) => ({ userId: row.userId, readEndYear: row.year })),
		},
		select: {
			userId: true,
			readEndYear: true,
			readEndMonth: true,
			book: { select: { authors: true, countries: true } },
		},
	});

	return rows.map((row) => {
		const scope = goalScopeFromStored({
			scopeKind: row.scopeKind,
			scopeAuthors: row.scopeAuthors,
			scopeCountries: row.scopeCountries,
		});
		const current = countReadsForGoal(
			reads
				.filter((read) => read.userId === row.userId)
				.map((read) => ({
					readEndYear: read.readEndYear,
					readEndMonth: read.readEndMonth,
					book: {
						authors: read.book.authors,
						countries: read.book.countries,
					},
				})),
			row.year,
			scope,
		);

		return {
			type: "goal" as const,
			title: row.title,
			description: `@${row.user.username} · ${row.year} · ${Math.min(current, row.target)} of ${row.target}`,
			href: `/users/${row.user.username}/goals/${row.slug}`,
			media: avatarMedia(row.user),
		};
	});
}

async function searchSeries(ctx: SearchContext): Promise<GlobalSearchHit[]> {
	const rows = await ctx.db.series.findMany({
		where: {
			OR: [
				{ title: containsQuery(ctx.query) },
				{ slug: containsQuery(ctx.query) },
				{ description: containsQuery(ctx.query) },
			],
		},
		orderBy: [{ updatedAt: "desc" }, { slug: "desc" }],
		take: ctx.limit,
		select: {
			slug: true,
			title: true,
			_count: { select: { books: true } },
			books: {
				orderBy: { position: "asc" },
				take: COLLAGE_COVERS,
				select: { book: { select: { coverId: true } } },
			},
		},
	});

	return rows.map((row) => ({
		type: "series" as const,
		title: row.title,
		description: `Series · ${row._count.books} ${row._count.books === 1 ? "book" : "books"}`,
		href: `/series/${row.slug}`,
		media: collageMedia(row.books.map((entry) => entry.book.coverId)),
	}));
}

const searchers: Record<
	GlobalSearchHitType,
	(ctx: SearchContext) => Promise<GlobalSearchHit[]>
> = {
	book: searchBooks,
	author: searchAuthors,
	user: searchUsers,
	post: searchPosts,
	feedback: searchFeedbacks,
	comment: searchComments,
	shelf: searchShelves,
	document: searchDocuments,
	goal: searchGoals,
	series: searchSeries,
};

/**
 * Best matches first (exact title, then prefix, then contains), interleaved
 * across types so one kind of item cannot crowd out the rest.
 */
function rankHits(
	groups: GlobalSearchHit[][],
	query: string,
): GlobalSearchHit[] {
	return groups
		.flatMap((hits, typeIndex) =>
			hits.map((hit, indexInType) => ({
				hit,
				score: matchScore(hit.title, query),
				indexInType,
				typeIndex,
			})),
		)
		.sort(
			(a, b) =>
				a.score - b.score ||
				a.indexInType - b.indexInType ||
				a.typeIndex - b.typeIndex,
		)
		.map((entry) => entry.hit);
}

export async function globalSearch(
	input: GlobalSearchInput,
	db: Database,
	isAdmin: boolean,
	viewerId?: string,
): Promise<GlobalSearchOutput> {
	const types = input.types ?? globalSearchHitTypes;
	const narrowed = input.types != null && input.types.length === 1;
	const ctx: SearchContext = {
		db,
		query: input.query,
		isAdmin,
		viewerId,
		limit: narrowed ? GLOBAL_SEARCH_NARROW_LIMIT : GLOBAL_SEARCH_PER_TYPE_LIMIT,
	};

	const groups = await Promise.all(types.map((type) => searchers[type](ctx)));

	return {
		items: rankHits(groups, input.query).slice(
			0,
			narrowed ? GLOBAL_SEARCH_NARROW_LIMIT : GLOBAL_SEARCH_MAX_ITEMS,
		),
	};
}
