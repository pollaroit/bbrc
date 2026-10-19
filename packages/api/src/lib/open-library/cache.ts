type CachedResponse = {
	status: number;
	body: string;
	contentType: string | null;
	freshUntil: number;
	staleUntil: number;
};

const MAX_ENTRIES = 512;
const cache = new Map<string, CachedResponse>();

export function readOpenLibraryCache(key: string): CachedResponse | null {
	const entry = cache.get(key);
	if (!entry) {
		return null;
	}

	const now = Date.now();
	if (now > entry.staleUntil) {
		cache.delete(key);
		return null;
	}

	return entry;
}

export function isOpenLibraryCacheFresh(entry: CachedResponse): boolean {
	return Date.now() <= entry.freshUntil;
}

export async function writeOpenLibraryCache(
	key: string,
	response: Response,
	freshTtlMs: number,
	staleTtlMs: number,
): Promise<void> {
	const body = await response.text();
	const now = Date.now();

	if (cache.size >= MAX_ENTRIES) {
		const oldestKey = cache.keys().next().value;
		if (oldestKey) {
			cache.delete(oldestKey);
		}
	}

	cache.set(key, {
		status: response.status,
		body,
		contentType: response.headers.get("content-type"),
		freshUntil: now + freshTtlMs,
		staleUntil: now + staleTtlMs,
	});
}

export function cachedResponseToFetch(entry: CachedResponse): Response {
	return new Response(entry.body, {
		status: entry.status,
		headers: entry.contentType
			? { "content-type": entry.contentType }
			: undefined,
	});
}
