import type { Database } from "@bbrc/db";
import { readProgress } from "@bbrc/shared";
import type { AuthorSeriesItem } from "./author.schema";
import { bookRef, loadViewerReadBookIds } from "./author-data";

/**
 * Series that hold at least one of the author's books, with every book of each series
 * (series only hold books that are in the library) and the viewer's progress.
 */
export async function loadAuthorSeries(
	db: Database,
	authorId: string,
	viewerId: string | null,
): Promise<AuthorSeriesItem[]> {
	const series = await db.series.findMany({
		where: {
			books: { some: { book: { authorLinks: { some: { authorId } } } } },
		},
		orderBy: { title: "asc" },
		select: {
			slug: true,
			title: true,
			description: true,
			books: {
				orderBy: { position: "asc" },
				select: {
					position: true,
					book: {
						select: {
							id: true,
							slug: true,
							title: true,
							authors: true,
							coverId: true,
							publishedIn: true,
							authorLinks: { where: { authorId }, select: { authorId: true } },
						},
					},
				},
			},
		},
	});

	const bookIds = series.flatMap((entry) =>
		entry.books.map((row) => row.book.id),
	);
	const readIds = await loadViewerReadBookIds(db, viewerId, bookIds);

	return series.map((entry) => {
		const books = entry.books.map((row) => ({
			position: row.position,
			book: { ...bookRef(row.book), publishedIn: row.book.publishedIn },
			byThisAuthor: row.book.authorLinks.length > 0,
			readByMe: readIds.has(row.book.id),
		}));
		const own = books.filter((book) => book.byThisAuthor);
		return {
			slug: entry.slug,
			title: entry.title,
			description: entry.description,
			bookCount: books.length,
			authorBookCount: own.length,
			books,
			progress: viewerId
				? readProgress(books.filter((b) => b.readByMe).length, books.length)
				: null,
			authorProgress: viewerId
				? readProgress(own.filter((b) => b.readByMe).length, own.length)
				: null,
		};
	});
}

/** One line for the overview, or null when the author is in no series. */
export function seriesSummaryLine(
	series: readonly {
		title: string;
		bookCount: number;
		authorBookCount: number;
	}[],
): string | null {
	const counts = (entry: (typeof series)[number]) =>
		entry.authorBookCount === entry.bookCount
			? `${entry.bookCount} ${entry.bookCount === 1 ? "book" : "books"}`
			: `${entry.authorBookCount} of ${entry.bookCount} books`;
	if (series.length === 0) return null;
	if (series.length === 1) {
		const only = series[0];
		return only ? `In the series ${only.title} (${counts(only)})` : null;
	}
	const shown = series
		.slice(0, 2)
		.map((entry) => `${entry.title} (${counts(entry)})`)
		.join(", ");
	const more = series.length - 2;
	return `In ${series.length} series: ${shown}${more > 0 ? ` and ${more} more` : ""}`;
}
