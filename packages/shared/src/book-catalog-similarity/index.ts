/** Member-facing catalog similarity (distinct from Open Library admin recommendations). */

export const CATALOG_SIMILARITY_WEIGHTS = {
	authors: 3,
	subjects: 2,
	countries: 2,
	subjectPeople: 0.75,
	subjectTimes: 0.75,
	pages: 1,
	publishedYear: 0.5,
} as const;

export type CatalogSimilarityBook = {
	authors: readonly string[];
	subjects: readonly string[];
	subjectPeople: readonly string[];
	subjectTimes: readonly string[];
	countries: readonly string[];
	pages: number;
	publishedIn: number;
};

const MAX_PAGE_DELTA = 300;
const MAX_YEAR_DELTA = 50;

function normalizeTerm(value: string): string {
	return value.trim().toLowerCase();
}

function overlapCoefficient(
	left: readonly string[],
	right: readonly string[],
): number {
	if (left.length === 0 || right.length === 0) {
		return 0;
	}

	const leftSet = new Set(left.map(normalizeTerm));
	let intersection = 0;
	for (const term of right) {
		if (leftSet.has(normalizeTerm(term))) {
			intersection += 1;
		}
	}

	const union = new Set([
		...left.map(normalizeTerm),
		...right.map(normalizeTerm),
	]).size;
	if (union === 0) {
		return 0;
	}

	return intersection / union;
}

function proximityScore(
	delta: number,
	maxDelta: number,
	weight: number,
): number {
	if (maxDelta <= 0 || delta >= maxDelta) {
		return 0;
	}
	return weight * (1 - delta / maxDelta);
}

export function publicationDecade(year: number): number {
	return Math.floor(year / 10) * 10;
}

export function formatPublicationDecadeLabel(year: number): string {
	const decade = publicationDecade(year);
	return `${decade}s`;
}

export function scoreCatalogBookSimilarity(
	source: CatalogSimilarityBook,
	candidate: CatalogSimilarityBook,
): number {
	let score = 0;

	score +=
		overlapCoefficient(source.authors, candidate.authors) *
		CATALOG_SIMILARITY_WEIGHTS.authors;
	score +=
		overlapCoefficient(source.subjects, candidate.subjects) *
		CATALOG_SIMILARITY_WEIGHTS.subjects;
	score +=
		overlapCoefficient(source.countries, candidate.countries) *
		CATALOG_SIMILARITY_WEIGHTS.countries;
	score +=
		overlapCoefficient(source.subjectPeople, candidate.subjectPeople) *
		CATALOG_SIMILARITY_WEIGHTS.subjectPeople;
	score +=
		overlapCoefficient(source.subjectTimes, candidate.subjectTimes) *
		CATALOG_SIMILARITY_WEIGHTS.subjectTimes;

	score += proximityScore(
		Math.abs(source.pages - candidate.pages),
		MAX_PAGE_DELTA,
		CATALOG_SIMILARITY_WEIGHTS.pages,
	);
	score += proximityScore(
		Math.abs(source.publishedIn - candidate.publishedIn),
		MAX_YEAR_DELTA,
		CATALOG_SIMILARITY_WEIGHTS.publishedYear,
	);

	return score;
}

export function authorsOverlap(
	left: readonly string[],
	right: readonly string[],
): boolean {
	return overlapCoefficient(left, right) > 0;
}

export function countriesOverlap(
	left: readonly string[],
	right: readonly string[],
): boolean {
	return overlapCoefficient(left, right) > 0;
}

export function samePublicationDecade(
	leftYear: number,
	rightYear: number,
): boolean {
	return publicationDecade(leftYear) === publicationDecade(rightYear);
}

export function similarPageCount(
	sourcePages: number,
	candidatePages: number,
	tolerance = 100,
): boolean {
	return Math.abs(sourcePages - candidatePages) <= tolerance;
}
