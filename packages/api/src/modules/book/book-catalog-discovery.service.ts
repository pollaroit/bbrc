import type { Database, Prisma } from "@bbrc/db";
import {
	authorsOverlap,
	type CatalogSimilarityBook,
	countriesOverlap,
	formatPublicationDecadeLabel,
	getBookCountryName,
	samePublicationDecade,
	scoreCatalogBookSimilarity,
	similarPageCount,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { mapBookSeriesSummary } from "../series/series.service";
import { publicShelfWhere } from "../shelf/shelf-visibility";
import type { GetBookListOutput } from "./book.schema";
import { getBookListFields } from "./book.schema";
import {
	BOOK_CATALOG_DISCOVERY_LIMIT,
	type GetBookCatalogDiscoveryOutput,
} from "./book-catalog-discovery.schema";
import { resolveClubSittingSlug } from "./resolve-club-sitting-slug";

const discoverySelect = {
	...getBookListFields,
	viewCount: true,
	readingNowCount: true,
	wishlistCount: true,
	viewerCount: true,
	createdAt: true,
	updatedAt: true,
	subjects: true,
	subjectPeople: true,
	subjectTimes: true,
	countries: true,
	seriesMembership: {
		select: {
			position: true,
			series: { select: { slug: true, title: true } },
		},
	},
	sittingsSelectedFor: {
		where: { status: { in: ["reading", "finished"] } },
		orderBy: { updatedAt: "desc" as const },
		select: { slug: true, status: true },
	},
	_count: {
		select: {
			documents: { where: { status: "approved" as const } },
			reads: true,
			feedbacks: true,
			shelfBooks: { where: { shelf: publicShelfWhere } },
			favorites: true,
		},
	},
} satisfies Prisma.BookSelect;

type DiscoveryRow = Prisma.BookGetPayload<{ select: typeof discoverySelect }>;

function mapDiscoveryRow(
	row: DiscoveryRow,
): GetBookListOutput["items"][number] {
	const { seriesMembership, sittingsSelectedFor, _count, ...fields } = row;
	return {
		...fields,
		approvedDocumentCount: _count.documents,
		readCount: _count.reads,
		feedbackCount: _count.feedbacks,
		shelfCount: _count.shelfBooks,
		favoriteCount: _count.favorites,
		clubSittingSlug: resolveClubSittingSlug(fields.status, sittingsSelectedFor),
		series: mapBookSeriesSummary(seriesMembership),
	};
}

function toSimilarityBook(row: DiscoveryRow): CatalogSimilarityBook {
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

function compareByReadCountThenSlug(a: DiscoveryRow, b: DiscoveryRow): number {
	if (b._count.reads !== a._count.reads) {
		return b._count.reads - a._count.reads;
	}
	return a.slug.localeCompare(b.slug);
}

function takeTop(
	rows: DiscoveryRow[],
	limit: number,
): GetBookListOutput["items"] {
	return rows.slice(0, limit).map(mapDiscoveryRow);
}

function section(title: string, items: GetBookListOutput["items"]) {
	return { title, items };
}

export async function getBookCatalogDiscovery(
	bookSlug: string,
	db: Database,
): Promise<GetBookCatalogDiscoveryOutput> {
	const source = await db.book.findUnique({
		where: { slug: bookSlug },
		select: discoverySelect,
	});

	if (!source) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug: bookSlug },
		});
	}

	const candidates = await db.book.findMany({
		where: { slug: { not: bookSlug } },
		select: discoverySelect,
	});

	const sourceSimilarity = toSimilarityBook(source);

	const scoredSimilar = candidates
		.map((row) => ({
			row,
			score: scoreCatalogBookSimilarity(
				sourceSimilarity,
				toSimilarityBook(row),
			),
		}))
		.toSorted((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score;
			}
			return compareByReadCountThenSlug(a.row, b.row);
		});

	const similarRows = scoredSimilar.some((entry) => entry.score > 0)
		? scoredSimilar.filter((entry) => entry.score > 0).map((entry) => entry.row)
		: scoredSimilar.map((entry) => entry.row);

	const byAuthorRows = candidates
		.filter((row) => authorsOverlap(source.authors, row.authors))
		.toSorted(compareByReadCountThenSlug);

	const primaryCountry = source.countries[0];
	const byCountryRows =
		primaryCountry == null
			? []
			: candidates
					.filter((row) => countriesOverlap(source.countries, row.countries))
					.toSorted(compareByReadCountThenSlug);

	const byDecadeRows = candidates
		.filter((row) => samePublicationDecade(source.publishedIn, row.publishedIn))
		.toSorted(compareByReadCountThenSlug);

	const byPageSizeRows = candidates
		.filter((row) => similarPageCount(source.pages, row.pages))
		.toSorted((a, b) => {
			const deltaA = Math.abs(a.pages - source.pages);
			const deltaB = Math.abs(b.pages - source.pages);
			if (deltaA !== deltaB) {
				return deltaA - deltaB;
			}
			return compareByReadCountThenSlug(a, b);
		});

	const countryName =
		primaryCountry != null ? getBookCountryName(primaryCountry) : null;
	const countryLabel =
		countryName != null ? countryName : (primaryCountry ?? "this region");

	return {
		similar: section(
			"More books like this",
			takeTop(similarRows, BOOK_CATALOG_DISCOVERY_LIMIT),
		),
		byAuthor: section(
			"More from this author",
			takeTop(byAuthorRows, BOOK_CATALOG_DISCOVERY_LIMIT),
		),
		byCountry:
			primaryCountry == null
				? null
				: section(
						`More from ${countryLabel}`,
						takeTop(byCountryRows, BOOK_CATALOG_DISCOVERY_LIMIT),
					),
		byDecade: section(
			`More from the ${formatPublicationDecadeLabel(source.publishedIn)}`,
			takeTop(byDecadeRows, BOOK_CATALOG_DISCOVERY_LIMIT),
		),
		byPageSize: section(
			"More with this size",
			takeTop(byPageSizeRows, BOOK_CATALOG_DISCOVERY_LIMIT),
		),
	};
}
