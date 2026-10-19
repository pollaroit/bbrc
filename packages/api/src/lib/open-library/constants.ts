export const OPEN_LIBRARY_ORIGIN = "https://openlibrary.org" as const;
export const OPEN_LIBRARY_SEARCH_URL =
	`${OPEN_LIBRARY_ORIGIN}/search.json` as const;

/** Identifies BBRC to Open Library / Internet Archive (polite access). */
export const OPEN_LIBRARY_USER_AGENT =
	"BBRC/1.1 (+https://www.bbrc.app; contact: mehdi.asadli@pollaroit.com)" as const;

export const OPEN_LIBRARY_FETCH = {
	maxAttempts: 3,
	requestTimeoutMs: 20_000,
	retryBaseDelayMs: 250,
	searchFreshTtlMs: 60_000,
	searchStaleTtlMs: 10 * 60_000,
	documentFreshTtlMs: 60 * 60_000,
	documentStaleTtlMs: 24 * 60 * 60_000,
	searchConcurrency: 2,
	titleLookupConcurrency: 3,
	editionJsonConcurrency: 4,
} as const;
