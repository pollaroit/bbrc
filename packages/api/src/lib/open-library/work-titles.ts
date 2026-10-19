import { openLibraryWorkKeyToOlid } from "@bbrc/shared";
import { mapWithConcurrency } from "./concurrency";
import { OPEN_LIBRARY_FETCH } from "./constants";
import { openLibraryFetchDocumentJson, openLibraryWorkJsonUrl } from "./fetch";

type WorkTitleDocument = {
	title?: unknown;
};

function parseWorkTitle(payload: WorkTitleDocument | null): string | null {
	if (!payload) {
		return null;
	}

	return typeof payload.title === "string" && payload.title.trim()
		? payload.title.trim()
		: null;
}

/** Best-effort title; returns null when Open Library is unreachable. */
export async function fetchOpenLibraryWorkTitle(
	olid: string,
): Promise<string | null> {
	const normalized = openLibraryWorkKeyToOlid(olid);
	if (!normalized) {
		return null;
	}

	const payload = await openLibraryFetchDocumentJson<WorkTitleDocument>(
		openLibraryWorkJsonUrl(`/works/${normalized}`),
	);

	return parseWorkTitle(payload);
}

/** Deduped OLIDs, limited concurrency, cache-friendly. */
export async function fetchOpenLibraryWorkTitlesByOlid(
	olids: readonly string[],
): Promise<Map<string, string | null>> {
	const unique = [
		...new Set(olids.map((id) => id.trim().toUpperCase())),
	].filter(Boolean);

	const results = await mapWithConcurrency(
		unique,
		OPEN_LIBRARY_FETCH.titleLookupConcurrency,
		async (id) => {
			const title = await fetchOpenLibraryWorkTitle(id);
			return [id, title] as const;
		},
	);

	return new Map(results);
}
