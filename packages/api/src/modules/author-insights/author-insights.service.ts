import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import { formatSittingDisplayName } from "@bbrc/shared";
import { resolveAuthor } from "../author/author-resolve";
import { publicShelfWhere } from "../shelf/shelf-visibility";
import {
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "../user/user-visibility";
import type {
	AuthorInsightFavoritesOutput,
	AuthorInsightShelvesOutput,
	AuthorInsightSittingsOutput,
} from "./author-insights.schema";
import {
	bookRef,
	bookRefSelect,
	byAuthor,
	inRange,
	matchesSearch,
	memberRefSelect,
	pageInMemory,
} from "./insights-common";

type Paging = { cursor?: string; limit: number };

// ── Sittings ───────────────────────────────────────────────────────────────

export async function getAuthorInsightSittings(
	input: Paging & {
		slug: string;
		search?: string;
		statuses?: ("voting" | "reading" | "finished")[];
		outcomes?: ("picked" | "in_poll" | "not_picked")[];
		bookSlugs?: string[];
		rangeMin?: Date;
		rangeMax?: Date;
		sort: "newest" | "oldest" | "participants" | "deadline";
	},
	db: Database,
	session: Session | null,
): Promise<AuthorInsightSittingsOutput> {
	const author = await resolveAuthor(
		db,
		input.slug,
		viewerFromSession(session),
	);
	const own = await db.bookAuthor.findMany({
		where: { authorId: author.id },
		select: { bookId: true },
	});
	const ownIds = new Set(own.map((row) => row.bookId));

	const sittings = await db.sitting.findMany({
		where: {
			OR: [
				{ selectedBook: byAuthor(author.id) },
				{ poll: { options: { some: { book: byAuthor(author.id) } } } },
			],
		},
		select: {
			slug: true,
			status: true,
			createdAt: true,
			deadline: true,
			readingStartedAt: true,
			midtermAt: true,
			joinType: true,
			selectedBookId: true,
			selectedBook: { select: { id: true, ...bookRefSelect } },
			createdBy: { select: { username: true, name: true, image: true } },
			participants: {
				where: { removedAt: null, user: visibleOnSiteUserWhere },
				select: { progress: true },
			},
			poll: {
				select: {
					deadline: true,
					options: {
						select: { book: { select: { id: true, ...bookRefSelect } } },
					},
				},
			},
		},
	});

	type Item = AuthorInsightSittingsOutput["items"][number];
	const rows = sittings.map((sitting) => {
		const picked =
			sitting.selectedBookId != null && ownIds.has(sitting.selectedBookId);
		const outcome: Item["outcome"] = picked
			? "picked"
			: sitting.status === "voting"
				? "in_poll"
				: "not_picked";

		const involved = new Map<string, ReturnType<typeof bookRef>>();
		if (sitting.selectedBook && ownIds.has(sitting.selectedBook.id)) {
			involved.set(sitting.selectedBook.id, bookRef(sitting.selectedBook));
		}
		for (const option of sitting.poll?.options ?? []) {
			if (ownIds.has(option.book.id)) {
				involved.set(option.book.id, bookRef(option.book));
			}
		}

		const date = sitting.poll?.deadline ?? sitting.createdAt;
		const displayName = formatSittingDisplayName(
			sitting.slug,
			sitting.status,
			sitting.selectedBook?.title,
		);
		const item: Item = {
			slug: sitting.slug,
			displayName,
			status: sitting.status,
			outcome,
			date: date.toISOString(),
			createdAt: sitting.createdAt.toISOString(),
			pollDeadline: sitting.poll?.deadline.toISOString() ?? null,
			readingStartedAt: sitting.readingStartedAt?.toISOString() ?? null,
			midtermAt: sitting.midtermAt?.toISOString() ?? null,
			deadline: sitting.deadline.toISOString(),
			books: [...involved.values()],
			pickedBook: sitting.selectedBook ? bookRef(sitting.selectedBook) : null,
			participantCount: sitting.participants.length,
			completedCount: sitting.participants.filter(
				(p) => p.progress === "completed",
			).length,
			pollOptionCount: sitting.poll?.options.length ?? 0,
			organiser: sitting.createdBy,
			joinType: sitting.joinType,
		};
		return { item, dateValue: date };
	});

	// Facets are counted before the filters so the filter UI shows every option.
	const facets: AuthorInsightSittingsOutput["facets"] = {
		statuses: { voting: 0, reading: 0, finished: 0 },
		outcomes: { picked: 0, in_poll: 0, not_picked: 0 },
		books: [],
	};
	const bookFacet = new Map<
		string,
		{ book: Item["books"][number]; count: number }
	>();
	for (const { item } of rows) {
		facets.statuses[item.status] += 1;
		facets.outcomes[item.outcome] += 1;
		for (const book of item.books) {
			const entry = bookFacet.get(book.slug) ?? { book, count: 0 };
			entry.count += 1;
			bookFacet.set(book.slug, entry);
		}
	}
	facets.books = [...bookFacet.values()].toSorted(
		(a, b) => b.count - a.count || a.book.title.localeCompare(b.book.title),
	);

	const wantedBooks = input.bookSlugs?.length ? new Set(input.bookSlugs) : null;
	const filtered = rows.filter(({ item, dateValue }) => {
		if (input.statuses?.length && !input.statuses.includes(item.status)) {
			return false;
		}
		if (input.outcomes?.length && !input.outcomes.includes(item.outcome)) {
			return false;
		}
		if (wantedBooks && !item.books.some((book) => wantedBooks.has(book.slug))) {
			return false;
		}
		if (!inRange(dateValue, input.rangeMin, input.rangeMax)) return false;
		return matchesSearch(
			input.search,
			item.displayName,
			item.slug,
			item.pickedBook?.title,
			...item.books.map((book) => book.title),
			item.organiser?.name,
			item.organiser?.username,
		);
	});

	const sorted = filtered.toSorted((a, b) => {
		switch (input.sort) {
			case "oldest":
				return a.item.date.localeCompare(b.item.date);
			case "participants":
				return (
					b.item.participantCount - a.item.participantCount ||
					b.item.date.localeCompare(a.item.date)
				);
			case "deadline":
				return b.item.deadline.localeCompare(a.item.deadline);
			default:
				return b.item.date.localeCompare(a.item.date);
		}
	});

	return {
		redirectTo: author.redirectTo,
		...pageInMemory(
			sorted.map((row) => row.item),
			input.cursor,
			input.limit,
		),
		facets,
	};
}

// ── Shelves ────────────────────────────────────────────────────────────────

export async function getAuthorInsightShelves(
	input: Paging & {
		slug: string;
		search?: string;
		types?: ("ordered" | "unordered")[];
		ownerUsernames?: string[];
		minBooks?: number;
		minAuthorBooks?: number;
		bookSlugs?: string[];
		sort: "newest" | "updated" | "authorBooks" | "books" | "views";
	},
	db: Database,
	session: Session | null,
): Promise<AuthorInsightShelvesOutput> {
	const author = await resolveAuthor(
		db,
		input.slug,
		viewerFromSession(session),
	);

	const shelves = await db.shelf.findMany({
		where: {
			...publicShelfWhere,
			books: { some: { book: byAuthor(author.id) } },
		},
		select: {
			id: true,
			slug: true,
			title: true,
			description: true,
			coverImageUrl: true,
			type: true,
			viewCount: true,
			createdAt: true,
			updatedAt: true,
			user: memberRefSelect,
			_count: { select: { books: true } },
			books: {
				orderBy: { position: "asc" },
				take: 4,
				select: { book: { select: { coverId: true } } },
			},
		},
	});

	const shelfIds = shelves.map((shelf) => shelf.id);
	const ownBooks =
		shelfIds.length === 0
			? []
			: await db.shelfBook.findMany({
					where: { shelfId: { in: shelfIds }, book: byAuthor(author.id) },
					select: { shelfId: true, book: { select: bookRefSelect } },
				});
	const ownByShelf = new Map<string, Set<string>>();
	const bookFacet = new Map<
		string,
		{ book: ReturnType<typeof bookRef>; count: number }
	>();
	for (const entry of ownBooks) {
		const set = ownByShelf.get(entry.shelfId) ?? new Set<string>();
		set.add(entry.book.slug);
		ownByShelf.set(entry.shelfId, set);
		const facet = bookFacet.get(entry.book.slug) ?? {
			book: bookRef(entry.book),
			count: 0,
		};
		facet.count += 1;
		bookFacet.set(entry.book.slug, facet);
	}

	const facets: AuthorInsightShelvesOutput["facets"] = {
		types: { ordered: 0, unordered: 0 },
		owners: [],
		books: [...bookFacet.values()].toSorted(
			(a, b) => b.count - a.count || a.book.title.localeCompare(b.book.title),
		),
	};
	const ownerFacet = new Map<
		string,
		{ member: (typeof shelves)[number]["user"]; count: number }
	>();
	for (const shelf of shelves) {
		facets.types[shelf.type] += 1;
		const owner = ownerFacet.get(shelf.user.username) ?? {
			member: shelf.user,
			count: 0,
		};
		owner.count += 1;
		ownerFacet.set(shelf.user.username, owner);
	}
	facets.owners = [...ownerFacet.values()].toSorted(
		(a, b) => b.count - a.count || a.member.name.localeCompare(b.member.name),
	);

	const owners = input.ownerUsernames?.length
		? new Set(input.ownerUsernames)
		: null;
	const wantedBooks = input.bookSlugs?.length ? new Set(input.bookSlugs) : null;

	const items = shelves
		.map((shelf) => ({
			shelf,
			authorBookCount: ownByShelf.get(shelf.id)?.size ?? 0,
		}))
		.filter(({ shelf, authorBookCount }) => {
			if (input.types?.length && !input.types.includes(shelf.type))
				return false;
			if (owners && !owners.has(shelf.user.username)) return false;
			if (input.minBooks != null && shelf._count.books < input.minBooks) {
				return false;
			}
			if (
				input.minAuthorBooks != null &&
				authorBookCount < input.minAuthorBooks
			) {
				return false;
			}
			if (wantedBooks) {
				const held = ownByShelf.get(shelf.id);
				if (!held || ![...wantedBooks].some((slug) => held.has(slug))) {
					return false;
				}
			}
			return matchesSearch(
				input.search,
				shelf.title,
				shelf.description,
				shelf.user.name,
				shelf.user.username,
			);
		})
		.toSorted((a, b) => {
			switch (input.sort) {
				case "newest":
					return b.shelf.createdAt.getTime() - a.shelf.createdAt.getTime();
				case "authorBooks":
					return (
						b.authorBookCount - a.authorBookCount ||
						b.shelf.updatedAt.getTime() - a.shelf.updatedAt.getTime()
					);
				case "books":
					return (
						b.shelf._count.books - a.shelf._count.books ||
						b.shelf.updatedAt.getTime() - a.shelf.updatedAt.getTime()
					);
				case "views":
					return (
						b.shelf.viewCount - a.shelf.viewCount ||
						b.shelf.updatedAt.getTime() - a.shelf.updatedAt.getTime()
					);
				default:
					return b.shelf.updatedAt.getTime() - a.shelf.updatedAt.getTime();
			}
		})
		.map(({ shelf, authorBookCount }) => ({
			slug: shelf.slug,
			title: shelf.title,
			description: shelf.description,
			coverImageUrl: shelf.coverImageUrl,
			type: shelf.type,
			owner: shelf.user,
			bookCount: shelf._count.books,
			authorBookCount,
			viewCount: shelf.viewCount,
			createdAt: shelf.createdAt,
			updatedAt: shelf.updatedAt,
			coverPreviewCoverIds: shelf.books.map((entry) => entry.book.coverId),
		}));

	return {
		redirectTo: author.redirectTo,
		...pageInMemory(items, input.cursor, input.limit),
		facets,
	};
}

// ── Favorites ──────────────────────────────────────────────────────────────

export async function getAuthorInsightFavorites(
	input: Paging & {
		slug: string;
		search?: string;
		bookSlugs?: string[];
		bookSort: "count" | "title" | "recent";
		memberSort: "recent" | "name" | "most";
	},
	db: Database,
	session: Session | null,
): Promise<AuthorInsightFavoritesOutput> {
	const author = await resolveAuthor(
		db,
		input.slug,
		viewerFromSession(session),
	);

	const where: Prisma.FavoriteWhereInput = {
		book: {
			...byAuthor(author.id),
			...(input.bookSlugs?.length ? { slug: { in: input.bookSlugs } } : {}),
		},
		user: visibleOnSiteUserWhere,
	};
	const rows = await db.favorite.findMany({
		where,
		orderBy: { createdAt: "desc" },
		select: {
			createdAt: true,
			userId: true,
			user: memberRefSelect,
			book: { select: bookRefSelect },
		},
	});

	const matched = rows.filter((row) =>
		matchesSearch(
			input.search,
			row.user.name,
			row.user.username,
			row.book.title,
		),
	);

	const perBook = new Map<
		string,
		{ book: ReturnType<typeof bookRef>; count: number; latestAt: string }
	>();
	const perMember = new Map<
		string,
		{
			member: (typeof rows)[number]["user"];
			books: ReturnType<typeof bookRef>[];
			favoritedAt: string;
		}
	>();
	for (const row of matched) {
		const at = row.createdAt.toISOString();
		const entry = perBook.get(row.book.slug) ?? {
			book: bookRef(row.book),
			count: 0,
			latestAt: at,
		};
		entry.count += 1;
		if (at > entry.latestAt) entry.latestAt = at;
		perBook.set(row.book.slug, entry);

		const member = perMember.get(row.userId) ?? {
			member: row.user,
			books: [],
			favoritedAt: at,
		};
		member.books.push(bookRef(row.book));
		if (at > member.favoritedAt) member.favoritedAt = at;
		perMember.set(row.userId, member);
	}

	const books = [...perBook.values()].toSorted((a, b) => {
		if (input.bookSort === "title")
			return a.book.title.localeCompare(b.book.title);
		if (input.bookSort === "recent")
			return b.latestAt.localeCompare(a.latestAt);
		return b.count - a.count || a.book.title.localeCompare(b.book.title);
	});
	const members = [...perMember.values()]
		.map((entry) => ({
			member: entry.member,
			books: entry.books,
			favoriteCount: entry.books.length,
			favoritedAt: entry.favoritedAt,
		}))
		.toSorted((a, b) => {
			if (input.memberSort === "name") {
				return a.member.name.localeCompare(b.member.name);
			}
			if (input.memberSort === "most") {
				return (
					b.favoriteCount - a.favoriteCount ||
					b.favoritedAt.localeCompare(a.favoritedAt)
				);
			}
			return b.favoritedAt.localeCompare(a.favoritedAt);
		});

	return {
		redirectTo: author.redirectTo,
		totalFavorites: matched.length,
		memberCount: perMember.size,
		books,
		members: pageInMemory(members, input.cursor, input.limit),
	};
}
