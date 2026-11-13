import type { Database } from "@bbrc/db";
import { compareLength, type LengthComparison } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";

const BIO_PREVIEW_CHARS = 260;

export type BookAboutAuthor = {
	slug: string;
	name: string;
	photoUrl: string | null;
	/** The start of the bio, cut at a word. */
	bio: string | null;
	birthYear: number | null;
	deathYear: number | null;
	nationalities: string[];
	/** Books by this author in the library, this one included. */
	bookCount: number;
};

export type BookAboutSeries = {
	slug: string;
	title: string;
	position: number;
	total: number;
	previous: { slug: string; title: string } | null;
	next: { slug: string; title: string } | null;
};

/**
 * What the About page shows beyond the book record: who wrote it, where it
 * sits in a series, which editions members added, and how long it is next to
 * the rest of the library. Counts include everyone.
 */
export type BookAbout = {
	authors: BookAboutAuthor[];
	series: BookAboutSeries | null;
	editions: { count: number; languages: string[]; formats: string[] };
	lengthComparison: LengthComparison | null;
};

export function clipBio(bio: string | null, max = BIO_PREVIEW_CHARS) {
	const text = bio?.replace(/\s+/g, " ").trim();
	if (!text) return null;
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	const lastSpace = cut.lastIndexOf(" ");
	return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

export async function getBookAbout(
	bookSlug: string,
	db: Database,
): Promise<BookAbout> {
	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: {
			id: true,
			pages: true,
			authorLinks: {
				orderBy: { position: "asc" },
				select: {
					author: {
						select: {
							id: true,
							slug: true,
							name: true,
							photoUrl: true,
							bio: true,
							birthYear: true,
							deathYear: true,
							nationalities: true,
						},
					},
				},
			},
			seriesMembership: {
				select: { position: true, seriesId: true },
			},
		},
	});
	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug: bookSlug },
		});
	}

	const authorIds = book.authorLinks.map((link) => link.author.id);
	const seriesId = book.seriesMembership?.seriesId;

	const [
		bookCounts,
		seriesRows,
		seriesMeta,
		editionRows,
		shorter,
		longer,
		all,
	] = await Promise.all([
		authorIds.length > 0
			? db.bookAuthor.groupBy({
					by: ["authorId"],
					where: { authorId: { in: authorIds } },
					_count: { _all: true },
				})
			: Promise.resolve([]),
		seriesId
			? db.seriesBook.findMany({
					where: { seriesId },
					orderBy: { position: "asc" },
					select: {
						position: true,
						book: { select: { slug: true, title: true } },
					},
				})
			: Promise.resolve([]),
		seriesId
			? db.series.findUnique({
					where: { id: seriesId },
					select: { slug: true, title: true },
				})
			: Promise.resolve(null),
		db.bookEdition.findMany({
			where: { bookId: book.id },
			select: { language: true, format: true },
		}),
		db.book.count({ where: { pages: { lt: book.pages } } }),
		db.book.count({ where: { pages: { gt: book.pages } } }),
		db.book.count(),
	]);

	const countByAuthor = new Map(
		bookCounts.map((row) => [row.authorId, row._count._all]),
	);

	const authors: BookAboutAuthor[] = book.authorLinks.map(({ author }) => ({
		slug: author.slug,
		name: author.name,
		photoUrl: author.photoUrl,
		bio: clipBio(author.bio),
		birthYear: author.birthYear,
		deathYear: author.deathYear,
		nationalities: author.nationalities,
		bookCount: countByAuthor.get(author.id) ?? 1,
	}));

	let series: BookAboutSeries | null = null;
	if (book.seriesMembership && seriesMeta) {
		const index = seriesRows.findIndex((row) => row.book.slug === bookSlug);
		const previous = index > 0 ? seriesRows[index - 1] : undefined;
		const next = index >= 0 ? seriesRows[index + 1] : undefined;
		series = {
			slug: seriesMeta.slug,
			title: seriesMeta.title,
			position: book.seriesMembership.position,
			total: seriesRows.length,
			previous: previous ? previous.book : null,
			next: next ? next.book : null,
		};
	}

	return {
		authors,
		series,
		editions: {
			count: editionRows.length,
			languages: [...new Set(editionRows.map((row) => row.language))],
			formats: [...new Set(editionRows.map((row) => row.format))],
		},
		lengthComparison: compareLength(shorter, longer, all - 1),
	};
}
