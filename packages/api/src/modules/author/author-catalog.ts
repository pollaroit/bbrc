import type { Database } from "@bbrc/db";
import { authorNameToSlug, getBookCountryName } from "@bbrc/shared";
import type { z } from "zod";
import type {
	authorListFiltersSchema,
	authorSortableFields,
} from "./author.listing";

type AuthorListFilters = z.infer<typeof authorListFiltersSchema>;

export type AuthorSortField = (typeof authorSortableFields)[number];

export type AuthorCatalogEntry = {
	slug: string;
	name: string;
	bookCount: number;
	readerCount: number;
	reviewCount: number;
	averageRating: number | null;
	countryAlpha2: string | null;
};

type AuthorAccumulator = {
	name: string;
	bookCount: number;
	readerCount: number;
	reviewCount: number;
	ratingWeightedSum: number;
	countryCounts: Map<string, number>;
};

function pickPrimaryCountry(countryCounts: Map<string, number>): string | null {
	let bestCode: string | null = null;
	let bestCount = 0;

	for (const [code, count] of countryCounts) {
		if (count > bestCount) {
			bestCode = code;
			bestCount = count;
		}
	}

	return bestCode;
}

function addBookCountriesToAuthor(
	countries: string[],
	accumulator: AuthorAccumulator,
) {
	const seenOnBook = new Set<string>();

	for (const raw of countries) {
		const code = raw.trim().toUpperCase();
		if (!code || seenOnBook.has(code)) {
			continue;
		}
		seenOnBook.add(code);
		accumulator.countryCounts.set(
			code,
			(accumulator.countryCounts.get(code) ?? 0) + 1,
		);
	}
}

export async function loadAuthorCatalog(
	db: Database,
): Promise<AuthorCatalogEntry[]> {
	const books = await db.book.findMany({
		select: {
			authors: true,
			countries: true,
			averageRating: true,
			_count: { select: { reads: true, feedbacks: true } },
		},
	});

	const bySlug = new Map<string, AuthorAccumulator>();

	for (const book of books) {
		const slugsOnBook = new Set<string>();

		for (const rawName of book.authors) {
			const name = rawName.trim();
			if (!name) {
				continue;
			}

			const slug = authorNameToSlug(name);
			if (slugsOnBook.has(slug)) {
				continue;
			}
			slugsOnBook.add(slug);

			let accumulator = bySlug.get(slug);
			if (!accumulator) {
				accumulator = {
					name,
					bookCount: 0,
					readerCount: 0,
					reviewCount: 0,
					ratingWeightedSum: 0,
					countryCounts: new Map(),
				};
				bySlug.set(slug, accumulator);
			} else {
				accumulator.name = name;
			}

			accumulator.bookCount += 1;
			accumulator.readerCount += book._count.reads;
			accumulator.reviewCount += book._count.feedbacks;

			if (book.averageRating != null && book._count.feedbacks > 0) {
				accumulator.ratingWeightedSum +=
					book.averageRating * book._count.feedbacks;
			}
		}

		for (const slug of slugsOnBook) {
			const accumulator = bySlug.get(slug);
			if (accumulator) {
				addBookCountriesToAuthor(book.countries, accumulator);
			}
		}
	}

	const entries = [...bySlug.entries()].map(([slug, accumulator]) => {
		const averageRating =
			accumulator.reviewCount > 0
				? Math.round(
						(accumulator.ratingWeightedSum / accumulator.reviewCount) * 10,
					) / 10
				: null;

		return {
			slug,
			name: accumulator.name,
			bookCount: accumulator.bookCount,
			readerCount: accumulator.readerCount,
			reviewCount: accumulator.reviewCount,
			averageRating,
			countryAlpha2: pickPrimaryCountry(accumulator.countryCounts),
		};
	});

	return dedupeAuthorCatalogEntries(entries);
}

function dedupeAuthorCatalogEntries(
	entries: AuthorCatalogEntry[],
): AuthorCatalogEntry[] {
	const bySlug = new Map<string, AuthorCatalogEntry>();

	for (const entry of entries) {
		if (!bySlug.has(entry.slug)) {
			bySlug.set(entry.slug, entry);
		}
	}

	return [...bySlug.values()];
}

export function filterAuthorCatalog(
	entries: AuthorCatalogEntry[],
	filters: AuthorListFilters & { search?: string },
): AuthorCatalogEntry[] {
	const query = filters.search?.trim().toLowerCase();

	return entries.filter((entry) => {
		if (query) {
			const slugQuery = query.replaceAll(/\s+/g, "_");
			const matchesName = entry.name.toLowerCase().includes(query);
			const matchesSlug = entry.slug.toLowerCase().includes(slugQuery);
			if (!matchesName && !matchesSlug) {
				return false;
			}
		}

		if (filters.countries && filters.countries.length > 0) {
			if (
				!entry.countryAlpha2 ||
				!filters.countries.includes(entry.countryAlpha2)
			) {
				return false;
			}
		}

		if (filters.minBooks != null && entry.bookCount < filters.minBooks) {
			return false;
		}

		if (filters.maxBooks != null && entry.bookCount > filters.maxBooks) {
			return false;
		}

		if (filters.minReads != null && entry.readerCount < filters.minReads) {
			return false;
		}

		if (filters.maxReads != null && entry.readerCount > filters.maxReads) {
			return false;
		}

		if (filters.minReviews != null && entry.reviewCount < filters.minReviews) {
			return false;
		}

		if (filters.maxReviews != null && entry.reviewCount > filters.maxReviews) {
			return false;
		}

		if (filters.minAverageRating != null) {
			if (
				entry.averageRating == null ||
				entry.averageRating < filters.minAverageRating
			) {
				return false;
			}
		}

		if (filters.maxAverageRating != null) {
			if (
				entry.averageRating == null ||
				entry.averageRating > filters.maxAverageRating
			) {
				return false;
			}
		}

		return true;
	});
}

export function sortAuthorCatalog(
	entries: AuthorCatalogEntry[],
	sortBy: AuthorSortField,
	sortDirection: "asc" | "desc",
): AuthorCatalogEntry[] {
	const direction = sortDirection === "asc" ? 1 : -1;

	return entries.toSorted((a, b) => {
		if (sortBy === "averageRating") {
			const ratingOrder = compareAverageRatingSort(
				a.averageRating,
				b.averageRating,
				sortDirection,
			);
			if (ratingOrder !== 0) {
				return ratingOrder;
			}
			return a.slug.localeCompare(b.slug);
		}

		if (sortBy === "name") {
			const byName = a.name.localeCompare(b.name, undefined, {
				sensitivity: "base",
			});
			if (byName !== 0) {
				return byName * direction;
			}
			return a.slug.localeCompare(b.slug);
		}

		if (sortBy === "bookCount") {
			const diff = a.bookCount - b.bookCount;
			if (diff !== 0) {
				return diff * direction;
			}
			return a.slug.localeCompare(b.slug);
		}

		if (sortBy === "readerCount") {
			const diff = a.readerCount - b.readerCount;
			if (diff !== 0) {
				return diff * direction;
			}
			return a.slug.localeCompare(b.slug);
		}

		if (sortBy === "reviewCount") {
			const diff = a.reviewCount - b.reviewCount;
			if (diff !== 0) {
				return diff * direction;
			}
			return a.slug.localeCompare(b.slug);
		}

		return a.slug.localeCompare(b.slug);
	});
}

function compareAverageRatingSort(
	a: number | null,
	b: number | null,
	sortDirection: "asc" | "desc",
): number {
	if (a == null && b == null) {
		return 0;
	}
	if (a == null) {
		return 1;
	}
	if (b == null) {
		return -1;
	}

	const diff = a - b;
	if (diff === 0) {
		return 0;
	}

	return sortDirection === "asc" ? diff : -diff;
}

export function aggregateAuthorCountryFacets(
	entries: AuthorCatalogEntry[],
	pinnedCountryCodes: string[] = [],
) {
	const counts = new Map<string, number>();

	for (const entry of entries) {
		if (!entry.countryAlpha2) {
			continue;
		}
		counts.set(entry.countryAlpha2, (counts.get(entry.countryAlpha2) ?? 0) + 1);
	}

	const facets = [...counts.entries()].map(([alpha2, authorCount]) => ({
		alpha2,
		name: getBookCountryName(alpha2) ?? alpha2,
		authorCount,
	}));

	for (const raw of pinnedCountryCodes) {
		const alpha2 = raw.trim().toUpperCase();
		if (!counts.has(alpha2)) {
			facets.push({
				alpha2,
				name: getBookCountryName(alpha2) ?? alpha2,
				authorCount: 0,
			});
		}
	}

	return facets.toSorted((a, b) => {
		if (b.authorCount !== a.authorCount) {
			return b.authorCount - a.authorCount;
		}
		return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
	});
}
