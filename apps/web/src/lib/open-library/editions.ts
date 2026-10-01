export type OpenLibraryEditionHints = {
	pageCountHints: number[];
	suggestedPages: number | null;
	openLibraryRating: number | null;
	excerpt: string | null;
};

const OPEN_LIBRARY_EXCERPT_MAX_LENGTH = 4000;

type OpenLibraryEditionEntry = {
	number_of_pages?: number;
	languages?: Array<{ key?: string } | string>;
};

type OpenLibraryEditionsResponse = {
	entries?: OpenLibraryEditionEntry[];
};

type OpenLibraryWorkRatingsResponse = {
	summary?: {
		average?: number;
		count?: number;
	};
};

type OpenLibraryWorkDocument = {
	description?: unknown;
};

function isTurkishEdition(edition: OpenLibraryEditionEntry): boolean {
	if (!edition.languages?.length) {
		return false;
	}

	return edition.languages.some((language) => {
		const key = typeof language === "string" ? language : language.key;
		return key?.includes("/languages/tur") ?? false;
	});
}

function median(values: number[]): number | null {
	if (values.length === 0) {
		return null;
	}

	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);

	if (sorted.length % 2 === 0) {
		const left = sorted[mid - 1];
		const right = sorted[mid];
		if (left === undefined || right === undefined) {
			return null;
		}
		return Math.round((left + right) / 2);
	}

	return sorted[mid] ?? null;
}

function uniqueSortedPageCounts(pages: number[]): number[] {
	return [...new Set(pages)].sort((a, b) => a - b);
}

/** Sample up to `limit` distinct counts (evenly spaced) for display. */
function pageCountHintsForDisplay(
	sortedUnique: number[],
	limit: number,
): number[] {
	if (sortedUnique.length <= limit) {
		return sortedUnique;
	}

	const step = (sortedUnique.length - 1) / (limit - 1);
	return Array.from({ length: limit }, (_, index) => {
		const value = sortedUnique[Math.round(index * step)];
		return value!;
	});
}

export function buildEditionHints(
	entries: OpenLibraryEditionEntry[],
	workRating: number | null,
	excerpt: string | null = null,
): OpenLibraryEditionHints {
	const turkishPages: number[] = [];
	const otherPages: number[] = [];

	for (const entry of entries) {
		const pages = entry.number_of_pages;
		if (pages == null || pages < 1) {
			continue;
		}

		if (isTurkishEdition(entry)) {
			turkishPages.push(pages);
			continue;
		}

		otherPages.push(pages);
	}

	const preferredPages = turkishPages.length > 0 ? turkishPages : otherPages;
	const uniqueSorted = uniqueSortedPageCounts(preferredPages);
	const pageCountHints = pageCountHintsForDisplay(uniqueSorted, 5);
	const suggestedPages = median(uniqueSorted);

	return {
		pageCountHints,
		suggestedPages,
		openLibraryRating: workRating,
		excerpt,
	};
}

function truncateExcerpt(text: string): string {
	if (text.length <= OPEN_LIBRARY_EXCERPT_MAX_LENGTH) {
		return text;
	}

	return `${text.slice(0, OPEN_LIBRARY_EXCERPT_MAX_LENGTH - 1).trimEnd()}…`;
}

export function parseOpenLibraryDescription(
	description: unknown,
): string | null {
	if (description == null) {
		return null;
	}

	if (typeof description === "string") {
		const trimmed = description.trim();
		return trimmed ? truncateExcerpt(trimmed) : null;
	}

	if (typeof description === "object" && "value" in description) {
		const value = (description as { value?: unknown }).value;
		if (typeof value === "string") {
			const trimmed = value.trim();
			return trimmed ? truncateExcerpt(trimmed) : null;
		}
	}

	return null;
}

export function parseWorkExcerpt(
	payload: OpenLibraryWorkDocument,
): string | null {
	return parseOpenLibraryDescription(payload.description);
}

function normalizeOpenLibraryRating(rating: number): number | null {
	if (Number.isNaN(rating) || rating < 0 || rating > 5) {
		return null;
	}

	return Math.round(rating * 10) / 10;
}

export function parseWorkRatingsAverage(
	payload: OpenLibraryWorkRatingsResponse,
): number | null {
	const count = payload.summary?.count;
	if (count == null || count < 1) {
		return null;
	}

	const rating = payload.summary?.average;
	if (rating == null) {
		return null;
	}

	return normalizeOpenLibraryRating(rating);
}

export type {
	OpenLibraryEditionEntry,
	OpenLibraryEditionsResponse,
	OpenLibraryWorkDocument,
	OpenLibraryWorkRatingsResponse,
};
