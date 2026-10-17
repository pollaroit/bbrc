import type { Database } from "@bbrc/db";
import {
	authorNameToSlug,
	type CatalogSimilarityBook,
	scoreCatalogBookSimilarity,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { resolveAuthorSlugsToNames } from "../book/book-author-filter";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import type { GetAuthorPageOutput } from "./author.schema";

const LEADERBOARD_LIMIT = 8;
const SIMILAR_AUTHOR_LIMIT = 12;

type BookMetaRow = {
	slug: string;
	authors: string[];
	subjects: string[];
	subjectPeople: string[];
	subjectTimes: string[];
	countries: string[];
	pages: number;
	publishedIn: number;
	_count: { reads: number; feedbacks: number };
};

function toSimilarityBook(row: BookMetaRow): CatalogSimilarityBook {
	return {
		authors: row.authors,
		subjects: row.subjects,
		subjectPeople: row.subjectPeople,
		subjectTimes: row.subjectTimes,
		countries: row.countries,
		pages: row.pages,
		publishedIn: row.publishedIn,
	};
}

async function resolveAuthorName(
	slug: string,
	db: Database,
): Promise<string | null> {
	const names = await resolveAuthorSlugsToNames([slug], db);
	return names[0] ?? null;
}

export async function getAuthorPage(
	slug: string,
	db: Database,
): Promise<GetAuthorPageOutput> {
	const authorName = await resolveAuthorName(slug, db);

	if (!authorName) {
		throw new ORPCError("NOT_FOUND", {
			message: "Author not found",
			data: { slug },
		});
	}

	const authorBooks = await db.book.findMany({
		where: { authors: { has: authorName } },
		select: {
			id: true,
			slug: true,
			authors: true,
			subjects: true,
			subjectPeople: true,
			subjectTimes: true,
			countries: true,
			pages: true,
			publishedIn: true,
			_count: { select: { reads: true, feedbacks: true } },
		},
	});

	const bookIds = authorBooks.map((row) => row.id);

	if (bookIds.length === 0) {
		return {
			slug,
			name: authorName,
			bookCount: 0,
			bestReaders: [],
			biggestFans: [],
			similarAuthors: [],
		};
	}

	const [readGroups, feedbackGroups, catalogRows] = await Promise.all([
		db.read.groupBy({
			by: ["userId"],
			where: { bookId: { in: bookIds } },
			_count: { _all: true },
		}),
		db.feedback.groupBy({
			by: ["authorId"],
			where: { bookId: { in: bookIds } },
			_avg: { rating: true },
			_count: { _all: true },
		}),
		db.book.findMany({
			where: { id: { notIn: bookIds } },
			select: {
				slug: true,
				authors: true,
				subjects: true,
				subjectPeople: true,
				subjectTimes: true,
				countries: true,
				pages: true,
				publishedIn: true,
				_count: { select: { reads: true, feedbacks: true } },
			},
		}),
	]);

	const readerIds = readGroups.map((row) => row.userId);
	const fanIds = feedbackGroups.map((row) => row.authorId);
	const userIds = [...new Set([...readerIds, ...fanIds])];

	const users =
		userIds.length === 0
			? []
			: await db.user.findMany({
					where: { id: { in: userIds }, ...visibleOnSiteUserWhere },
					select: { id: true, username: true, name: true, image: true },
				});

	const userById = new Map(users.map((user) => [user.id, user]));

	const bestReaders = readGroups
		.toSorted((a, b) => b._count._all - a._count._all)
		.slice(0, LEADERBOARD_LIMIT)
		.flatMap((row) => {
			const user = userById.get(row.userId);
			if (!user) {
				return [];
			}
			return [
				{
					username: user.username,
					name: user.name,
					image: user.image,
					readCount: row._count._all,
				},
			];
		});

	const biggestFans = feedbackGroups
		.flatMap((row) => {
			const user = userById.get(row.authorId);
			const average = row._avg.rating;
			if (!user || average == null || row._count._all < 1) {
				return [];
			}
			return [
				{
					username: user.username,
					name: user.name,
					image: user.image,
					averageRating: Math.round(average * 10) / 10,
					ratingCount: row._count._all,
				},
			];
		})
		.toSorted((a, b) => {
			if (b.averageRating !== a.averageRating) {
				return b.averageRating - a.averageRating;
			}
			return b.ratingCount - a.ratingCount;
		})
		.slice(0, LEADERBOARD_LIMIT);

	const sourceSimilarityBooks = authorBooks.map(toSimilarityBook);
	const authorScores = new Map<
		string,
		{ name: string; score: number; bookCount: number }
	>();

	for (const candidate of catalogRows as BookMetaRow[]) {
		const candidateSimilarity = toSimilarityBook(candidate);
		let bestScore = 0;
		for (const source of sourceSimilarityBooks) {
			const score = scoreCatalogBookSimilarity(source, candidateSimilarity);
			if (score > bestScore) {
				bestScore = score;
			}
		}
		if (bestScore <= 0) {
			continue;
		}

		const seenOnBook = new Set<string>();
		for (const name of candidate.authors) {
			const authorSlug = authorNameToSlug(name);
			if (authorSlug === slug || seenOnBook.has(authorSlug)) {
				continue;
			}
			seenOnBook.add(authorSlug);

			const existing = authorScores.get(authorSlug);
			if (!existing) {
				authorScores.set(authorSlug, {
					name: name.trim(),
					score: bestScore,
					bookCount: 1,
				});
				continue;
			}

			existing.bookCount += 1;
			if (bestScore > existing.score) {
				existing.score = bestScore;
				existing.name = name.trim();
			}
		}
	}

	const similarAuthors = [...authorScores.entries()]
		.map(([similarSlug, entry]) => ({
			slug: similarSlug,
			name: entry.name,
			bookCount: entry.bookCount,
			score: Math.round(entry.score * 100) / 100,
		}))
		.toSorted((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score;
			}
			return b.bookCount - a.bookCount;
		})
		.slice(0, SIMILAR_AUTHOR_LIMIT);

	return {
		slug,
		name: authorName,
		bookCount: authorBooks.length,
		bestReaders,
		biggestFans,
		similarAuthors,
	};
}
