import type { Database } from "@bbrc/db";
import { authorNameToSlug } from "@bbrc/shared";
import type { z } from "zod";
import type {
	AdminAuthorRankingItemSchema,
	AdminBookRankingItemSchema,
} from "./admin-book.schema";

type BookRankingItem = z.infer<typeof AdminBookRankingItemSchema>;
type AuthorRankingItem = z.infer<typeof AdminAuthorRankingItemSchema>;

const RANKING_LIMIT = 5;

function mapBookRow(row: {
	slug: string;
	title: string;
	coverId: number | null;
	metric: number;
	secondaryMetric?: number;
}): BookRankingItem {
	return {
		slug: row.slug,
		title: row.title,
		coverId: row.coverId,
		metric: row.metric,
		secondaryMetric: row.secondaryMetric,
	};
}

async function topBooksByRelationCount(
	db: Database,
	relation: "favorites" | "feedbacks" | "shelfBooks" | "postAttachments",
): Promise<BookRankingItem[]> {
	const rows = await db.book.findMany({
		orderBy: { [relation]: { _count: "desc" } },
		take: RANKING_LIMIT,
		select: {
			slug: true,
			title: true,
			coverId: true,
			_count: { select: { [relation]: true } },
		},
	});

	return rows.map((row) =>
		mapBookRow({
			slug: row.slug,
			title: row.title,
			coverId: row.coverId,
			metric:
				(relation === "favorites"
					? row._count.favorites
					: relation === "feedbacks"
						? row._count.feedbacks
						: relation === "shelfBooks"
							? row._count.shelfBooks
							: row._count.postAttachments) ?? 0,
		}),
	);
}

async function topBooksByPages(
	db: Database,
	direction: "asc" | "desc",
): Promise<BookRankingItem[]> {
	const rows = await db.book.findMany({
		where: { pages: { gte: 1 } },
		orderBy: { pages: direction },
		take: RANKING_LIMIT,
		select: { slug: true, title: true, coverId: true, pages: true },
	});

	return rows.map((row) =>
		mapBookRow({
			slug: row.slug,
			title: row.title,
			coverId: row.coverId,
			metric: row.pages,
		}),
	);
}

async function topBooksByPublishedIn(
	db: Database,
	direction: "asc" | "desc",
): Promise<BookRankingItem[]> {
	const rows = await db.book.findMany({
		orderBy: { publishedIn: direction },
		take: RANKING_LIMIT,
		select: { slug: true, title: true, coverId: true, publishedIn: true },
	});

	return rows.map((row) =>
		mapBookRow({
			slug: row.slug,
			title: row.title,
			coverId: row.coverId,
			metric: row.publishedIn,
		}),
	);
}

async function topBooksByRating(
	db: Database,
	field: "openLibraryRating" | "averageRating",
): Promise<BookRankingItem[]> {
	const rows = await db.book.findMany({
		where: { [field]: { not: null } },
		orderBy: { [field]: "desc" },
		take: RANKING_LIMIT,
		select: {
			slug: true,
			title: true,
			coverId: true,
			openLibraryRating: true,
			averageRating: true,
		},
	});

	return rows.map((row) =>
		mapBookRow({
			slug: row.slug,
			title: row.title,
			coverId: row.coverId,
			metric:
				field === "openLibraryRating"
					? (row.openLibraryRating ?? 0)
					: (row.averageRating ?? 0),
		}),
	);
}

async function topAuthorsByCatalogSize(
	db: Database,
): Promise<AuthorRankingItem[]> {
	const rows = await db.book.findMany({ select: { authors: true } });
	const counts = new Map<string, { name: string; bookCount: number }>();

	for (const row of rows) {
		const seenOnBook = new Set<string>();
		for (const rawName of row.authors) {
			const name = rawName.trim();
			if (!name) {
				continue;
			}
			const slug = authorNameToSlug(name);
			if (seenOnBook.has(slug)) {
				continue;
			}
			seenOnBook.add(slug);
			const existing = counts.get(slug);
			if (existing) {
				existing.bookCount += 1;
				existing.name = name;
			} else {
				counts.set(slug, { name, bookCount: 1 });
			}
		}
	}

	return [...counts.entries()]
		.map(([authorSlug, { name, bookCount }]) => ({
			authorName: name,
			authorSlug,
			bookCount,
		}))
		.sort(
			(a, b) =>
				b.bookCount - a.bookCount || a.authorName.localeCompare(b.authorName),
		)
		.slice(0, RANKING_LIMIT);
}

async function topBooksByPollVotes(db: Database): Promise<BookRankingItem[]> {
	const options = await db.pollOption.findMany({
		select: {
			bookId: true,
			pollId: true,
			_count: { select: { votes: true } },
		},
	});

	const votesByBook = new Map<string, number>();
	const pollsByBook = new Map<string, Set<string>>();

	for (const option of options) {
		votesByBook.set(
			option.bookId,
			(votesByBook.get(option.bookId) ?? 0) + option._count.votes,
		);
		const polls = pollsByBook.get(option.bookId) ?? new Set<string>();
		polls.add(option.pollId);
		pollsByBook.set(option.bookId, polls);
	}

	const ranked = [...votesByBook.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, RANKING_LIMIT);

	if (ranked.length === 0) {
		return [];
	}

	const bookIds = ranked.map(([bookId]) => bookId);
	const books = await db.book.findMany({
		where: { id: { in: bookIds } },
		select: { id: true, slug: true, title: true, coverId: true },
	});
	const bookById = new Map(books.map((b) => [b.id, b]));

	return ranked.flatMap(([bookId, voteCount]) => {
		const book = bookById.get(bookId);
		if (!book) {
			return [];
		}
		const pollCount = pollsByBook.get(bookId)?.size ?? 0;
		const avgVotersPerPoll =
			pollCount > 0 ? Math.round((voteCount / pollCount) * 10) / 10 : 0;

		return [
			mapBookRow({
				slug: book.slug,
				title: book.title,
				coverId: book.coverId,
				metric: voteCount,
				secondaryMetric: avgVotersPerPoll,
			}),
		];
	});
}

export async function loadAdminBookRankings(db: Database) {
	const [
		mostFavorited,
		longest,
		shortest,
		earliestPublished,
		newestPublished,
		authorsByCatalogSize,
		openLibraryRating,
		clubAverageRating,
		mostShelved,
		mostPollVotes,
		mostFeedbacks,
		mostPostAttachments,
	] = await Promise.all([
		topBooksByRelationCount(db, "favorites"),
		topBooksByPages(db, "desc"),
		topBooksByPages(db, "asc"),
		topBooksByPublishedIn(db, "asc"),
		topBooksByPublishedIn(db, "desc"),
		topAuthorsByCatalogSize(db),
		topBooksByRating(db, "openLibraryRating"),
		topBooksByRating(db, "averageRating"),
		topBooksByRelationCount(db, "shelfBooks"),
		topBooksByPollVotes(db),
		topBooksByRelationCount(db, "feedbacks"),
		topBooksByRelationCount(db, "postAttachments"),
	]);

	return {
		mostFavorited,
		longest,
		shortest,
		earliestPublished,
		newestPublished,
		authorsByCatalogSize,
		openLibraryRating,
		clubAverageRating,
		mostShelved,
		mostPollVotes,
		mostFeedbacks,
		mostPostAttachments,
	};
}
