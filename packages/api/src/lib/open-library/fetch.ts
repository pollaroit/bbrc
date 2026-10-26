import {
	cachedResponseToFetch,
	isOpenLibraryCacheFresh,
	readOpenLibraryCache,
	writeOpenLibraryCache,
} from "./cache";
import {
	OPEN_LIBRARY_FETCH,
	OPEN_LIBRARY_ORIGIN,
	OPEN_LIBRARY_USER_AGENT,
} from "./constants";
import { isRetryableOpenLibraryFetchError, OpenLibraryError } from "./errors";

export type OpenLibraryFetchCachePolicy = {
	freshTtlMs: number;
	staleTtlMs: number;
};

const inFlight = new Map<string, Promise<Response>>();

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function cacheKeyForUrl(url: string): string {
	return url;
}

async function fetchFromNetwork(url: string): Promise<Response> {
	let lastError: unknown;

	for (let attempt = 0; attempt < OPEN_LIBRARY_FETCH.maxAttempts; attempt++) {
		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Accept: "application/json",
					"User-Agent": OPEN_LIBRARY_USER_AGENT,
				},
				signal: AbortSignal.timeout(OPEN_LIBRARY_FETCH.requestTimeoutMs),
			});

			// A busy answer is worth another try after a short pause (never the last attempt).
			const busy = response.status === 429 || response.status >= 500;
			if (busy && attempt < OPEN_LIBRARY_FETCH.maxAttempts - 1) {
				const retryAfter = Number(response.headers.get("retry-after"));
				await sleep(
					Number.isFinite(retryAfter) && retryAfter > 0
						? Math.min(retryAfter * 1000, 3000)
						: OPEN_LIBRARY_FETCH.retryBaseDelayMs * 2 ** attempt,
				);
				continue;
			}

			return response;
		} catch (error) {
			lastError = error;
			const retryable = isRetryableOpenLibraryFetchError(error);
			const isLastAttempt = attempt >= OPEN_LIBRARY_FETCH.maxAttempts - 1;
			if (!retryable || isLastAttempt) {
				break;
			}

			await sleep(OPEN_LIBRARY_FETCH.retryBaseDelayMs * 2 ** attempt);
		}
	}

	const code = isRetryableOpenLibraryFetchError(lastError)
		? "timeout"
		: "unavailable";

	throw new OpenLibraryError(
		"Open Library is temporarily unavailable. Please try again in a moment.",
		code,
		{ cause: lastError },
	);
}

export async function openLibraryFetch(
	url: string,
	cachePolicy: OpenLibraryFetchCachePolicy,
): Promise<Response> {
	const cacheKey = cacheKeyForUrl(url);
	const cached = readOpenLibraryCache(cacheKey);
	if (cached && isOpenLibraryCacheFresh(cached)) {
		return cachedResponseToFetch(cached);
	}

	const existing = inFlight.get(cacheKey);
	if (existing) {
		return existing;
	}

	const promise = (async (): Promise<Response> => {
		try {
			const response = await fetchFromNetwork(url);

			if (response.ok || response.status === 404) {
				await writeOpenLibraryCache(
					cacheKey,
					response.clone(),
					cachePolicy.freshTtlMs,
					cachePolicy.staleTtlMs,
				);
			}

			return response;
		} catch (error) {
			if (cached) {
				return cachedResponseToFetch(cached);
			}

			throw error;
		}
	})();

	inFlight.set(cacheKey, promise);
	try {
		return await promise;
	} finally {
		inFlight.delete(cacheKey);
	}
}

const searchCachePolicy: OpenLibraryFetchCachePolicy = {
	freshTtlMs: OPEN_LIBRARY_FETCH.searchFreshTtlMs,
	staleTtlMs: OPEN_LIBRARY_FETCH.searchStaleTtlMs,
};

const documentCachePolicy: OpenLibraryFetchCachePolicy = {
	freshTtlMs: OPEN_LIBRARY_FETCH.documentFreshTtlMs,
	staleTtlMs: OPEN_LIBRARY_FETCH.documentStaleTtlMs,
};

export async function openLibraryFetchSearch(url: string): Promise<Response> {
	return openLibraryFetch(url, searchCachePolicy);
}

export async function openLibraryFetchDocument(url: string): Promise<Response> {
	return openLibraryFetch(url, documentCachePolicy);
}

export async function openLibraryFetchJson<T>(
	url: string,
	policy: OpenLibraryFetchCachePolicy,
): Promise<T | null> {
	const response = await openLibraryFetch(url, policy);
	if (!response.ok) {
		return null;
	}

	try {
		return (await response.json()) as T;
	} catch {
		throw new OpenLibraryError(
			"Open Library returned an unexpected response.",
			"invalid_response",
		);
	}
}

export async function openLibraryFetchSearchJson<T>(
	url: string,
): Promise<T | null> {
	return openLibraryFetchJson<T>(url, searchCachePolicy);
}

export async function openLibraryFetchDocumentJson<T>(
	url: string,
): Promise<T | null> {
	return openLibraryFetchJson<T>(url, documentCachePolicy);
}

export function openLibraryWorkJsonUrl(workKey: string): string {
	const normalized = workKey.startsWith("/") ? workKey : `/${workKey}`;
	return `${OPEN_LIBRARY_ORIGIN}${normalized}.json`;
}

export function openLibraryWorkRatingsUrl(workKey: string): string {
	const normalized = workKey.startsWith("/") ? workKey : `/${workKey}`;
	return `${OPEN_LIBRARY_ORIGIN}${normalized}/ratings.json`;
}

export function openLibraryWorkEditionsUrl(
	workOlid: string,
	limit: number,
	offset = 0,
): string {
	return `${OPEN_LIBRARY_ORIGIN}/works/${workOlid}/editions.json?limit=${limit}&offset=${offset}`;
}

export function openLibraryBookJsonUrl(editionOlid: string): string {
	return `${OPEN_LIBRARY_ORIGIN}/books/${editionOlid}.json`;
}
