import { openLibraryWorkKeyToOlid } from "@bbrc/shared";
import { OPEN_LIBRARY_SEARCH_URL } from "./constants";
import { openLibraryFetchSearch } from "./fetch";

type SearchDoc = {
	key?: string;
	title?: string;
	author_name?: string[];
	cover_i?: number;
	first_publish_year?: number;
};

export type OpenLibrarySearchHit = {
	olid: string;
	workKey: string;
	title: string;
	authors: string[];
	coverId: number | null;
	publishedIn: number | null;
};

function normalizeDoc(doc: SearchDoc): OpenLibrarySearchHit | null {
	if (!doc.key || !doc.title?.trim()) {
		return null;
	}

	const olid = openLibraryWorkKeyToOlid(doc.key);
	if (!olid) {
		return null;
	}

	const authors =
		doc.author_name?.map((name) => name.trim()).filter(Boolean) ?? [];

	return {
		olid,
		workKey: doc.key,
		title: doc.title.trim(),
		authors,
		coverId: doc.cover_i ?? null,
		publishedIn: doc.first_publish_year ?? null,
	};
}

export async function searchOpenLibraryWorks(
	query: string,
	limit: number,
): Promise<OpenLibrarySearchHit[]> {
	const trimmed = query.trim();
	if (trimmed.length < 2) {
		return [];
	}

	const url = new URL(OPEN_LIBRARY_SEARCH_URL);
	url.searchParams.set("q", trimmed);
	url.searchParams.set("limit", String(limit));
	url.searchParams.set(
		"fields",
		"key,title,author_name,cover_i,first_publish_year",
	);

	const response = await openLibraryFetchSearch(url.toString());
	if (!response.ok) {
		return [];
	}

	const payload = (await response.json()) as { docs?: SearchDoc[] };
	const hits: OpenLibrarySearchHit[] = [];

	for (const doc of payload.docs ?? []) {
		const normalized = normalizeDoc(doc);
		if (normalized) {
			hits.push(normalized);
		}
	}

	return hits;
}
