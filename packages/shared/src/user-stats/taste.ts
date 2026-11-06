import { bookAuthorEntries } from "../book-authors";
import { canonicalSubjectKey, canonicalSubjectLabel } from "./subjects";

/*
 * What a member reads, grouped: authors, countries, series, subjects. The member's own
 * ratings are optional (`ratings`), because a viewer who may not see reviews gets the
 * counts without a single rating in them.
 */

export type TasteBook = {
	id: string;
	slug: string;
	title: string;
	authors: string[];
	authorLinks?: {
		author: {
			id: string;
			slug: string;
			name: string;
			photoUrl?: string | null;
		};
	}[];
	coverId: number | null;
	countries: string[];
	subjects: string[];
	seriesMembership?: {
		series: { id: string; slug: string; title: string; bookCount?: number };
	} | null;
};

export type TasteBookRef = {
	id: string;
	slug: string;
	title: string;
	authors: string[];
	coverId: number | null;
};

const ref = (book: TasteBook): TasteBookRef => ({
	id: book.id,
	slug: book.slug,
	title: book.title,
	authors: book.authors,
	coverId: book.coverId,
});

const round1 = (value: number) => Math.round(value * 10) / 10;

function average(values: readonly number[]): number | null {
	return values.length
		? round1(values.reduce((a, b) => a + b, 0) / values.length)
		: null;
}

/** Fewest books a subject, author or country needs to be called "highest rated". */
export const MIN_BOOKS_FOR_RATED = 2;

export type AuthorRow = {
	key: string;
	label: string;
	slug: string | null;
	photoUrl: string | null;
	count: number;
	/** The member's average rating of this author's books; null when ratings are unknown or hidden. */
	average: number | null;
	topBook: TasteBookRef | null;
	books: TasteBookRef[];
};

export function authorRows(
	books: readonly TasteBook[],
	ratings: ReadonlyMap<string, number> | null,
	limit = 8,
): { byCount: AuthorRow[]; byRating: AuthorRow[] | null } {
	const groups = new Map<
		string,
		{
			label: string;
			slug: string | null;
			photoUrl: string | null;
			books: TasteBook[];
		}
	>();
	for (const book of books) {
		const photos = new Map(
			(book.authorLinks ?? []).map((link) => [
				link.author.id,
				link.author.photoUrl ?? null,
			]),
		);
		for (const author of bookAuthorEntries(book)) {
			const group = groups.get(author.key) ?? {
				label: author.label,
				slug: author.slug,
				photoUrl: photos.get(author.key) ?? null,
				books: [],
			};
			group.books.push(book);
			groups.set(author.key, group);
		}
	}

	const rows: AuthorRow[] = [...groups.entries()].map(([key, group]) => {
		const rated = ratings
			? group.books.flatMap((book) => {
					const rating = ratings.get(book.id);
					return rating == null ? [] : [{ book, rating }];
				})
			: [];
		const best = [...rated].sort((a, b) => b.rating - a.rating)[0];
		return {
			key,
			label: group.label,
			slug: group.slug,
			photoUrl: group.photoUrl,
			count: group.books.length,
			average: average(rated.map((row) => row.rating)),
			topBook: best ? ref(best.book) : null,
			books: group.books.slice(0, 6).map(ref),
		};
	});

	const byCount = [...rows]
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
		.slice(0, limit);
	const byRating = ratings
		? rows
				.filter(
					(row) => row.average != null && row.count >= MIN_BOOKS_FOR_RATED,
				)
				.sort(
					(a, b) => (b.average ?? 0) - (a.average ?? 0) || b.count - a.count,
				)
				.slice(0, limit)
		: null;
	return { byCount, byRating };
}

export type CountryRow = {
	code: string;
	count: number;
	average: number | null;
};

export function countryRows(
	books: readonly TasteBook[],
	ratings: ReadonlyMap<string, number> | null,
	limit = 12,
): CountryRow[] {
	const groups = new Map<string, { count: number; ratings: number[] }>();
	for (const book of books) {
		const codes = new Set(
			book.countries.map((code) => code.trim().toUpperCase()).filter(Boolean),
		);
		for (const code of codes) {
			const group = groups.get(code) ?? { count: 0, ratings: [] };
			group.count += 1;
			const rating = ratings?.get(book.id);
			if (rating != null) group.ratings.push(rating);
			groups.set(code, group);
		}
	}
	return [...groups.entries()]
		.map(([code, group]) => ({
			code,
			count: group.count,
			average: average(group.ratings),
		}))
		.sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))
		.slice(0, limit);
}

export type SeriesRow = {
	slug: string;
	title: string;
	read: number;
	/** Books in the series, when known. */
	total: number | null;
	books: TasteBookRef[];
};

export function seriesRows(
	books: readonly TasteBook[],
	limit = 6,
): SeriesRow[] {
	const groups = new Map<string, SeriesRow>();
	for (const book of books) {
		const series = book.seriesMembership?.series;
		if (!series) continue;
		const row = groups.get(series.id) ?? {
			slug: series.slug,
			title: series.title,
			read: 0,
			total: series.bookCount ?? null,
			books: [],
		};
		row.read += 1;
		if (row.books.length < 6) row.books.push(ref(book));
		groups.set(series.id, row);
	}
	return [...groups.values()]
		.sort((a, b) => b.read - a.read || a.title.localeCompare(b.title))
		.slice(0, limit);
}

export type RatedSubjectRow = {
	subject: string;
	average: number;
	count: number;
};

/** Subjects with the highest average rating from the member, among those with at least two rated books. */
export function ratedSubjectRows(
	books: readonly TasteBook[],
	ratings: ReadonlyMap<string, number>,
	limit = 8,
): RatedSubjectRow[] {
	const groups = new Map<string, number[]>();
	for (const book of books) {
		const rating = ratings.get(book.id);
		if (rating == null) continue;
		const keys = new Set(
			book.subjects.map(canonicalSubjectKey).filter(Boolean),
		);
		for (const key of keys) {
			const list = groups.get(key) ?? [];
			list.push(rating);
			groups.set(key, list);
		}
	}
	return [...groups.entries()]
		.filter(([, list]) => list.length >= MIN_BOOKS_FOR_RATED)
		.map(([key, list]) => ({
			subject: canonicalSubjectLabel(key),
			average: round1(list.reduce((a, b) => a + b, 0) / list.length),
			count: list.length,
		}))
		.sort((a, b) => b.average - a.average || b.count - a.count)
		.slice(0, limit);
}

export type PopularRow = TasteBookRef & { clubReads: number };

/** The member's books the club has read most, and least (a book only they read is "1"). */
export function popularRows(
	books: readonly TasteBook[],
	clubReads: ReadonlyMap<string, number>,
	limit = 6,
): { most: PopularRow[]; least: PopularRow[] } {
	const rows: PopularRow[] = [
		...new Map(books.map((book) => [book.id, book])).values(),
	].map((book) => ({ ...ref(book), clubReads: clubReads.get(book.id) ?? 0 }));
	return {
		most: [...rows]
			.sort(
				(a, b) => b.clubReads - a.clubReads || a.title.localeCompare(b.title),
			)
			.slice(0, limit),
		least: [...rows]
			.sort(
				(a, b) => a.clubReads - b.clubReads || a.title.localeCompare(b.title),
			)
			.slice(0, limit),
	};
}
