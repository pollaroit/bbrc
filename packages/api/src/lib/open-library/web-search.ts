import { OPEN_LIBRARY_SEARCH_URL } from "./constants";
import { openLibraryFetchSearch } from "./fetch";
import type { OpenLibraryWorkPrefill } from "./work-prefill";

type SearchDoc = {
	key?: string;
	title?: string;
	author_name?: string[];
	cover_i?: number;
	first_publish_year?: number;
	first_sentence?: string | string[];
	subtitle?: string;
};

function normalizeDescription(doc: SearchDoc): string | null {
	if (typeof doc.first_sentence === "string" && doc.first_sentence.trim()) {
		return doc.first_sentence.trim();
	}

	if (Array.isArray(doc.first_sentence)) {
		const joined = doc.first_sentence.join(" ").trim();
		if (joined) {
			return joined;
		}
	}

	if (doc.subtitle?.trim()) {
		return doc.subtitle.trim();
	}

	return null;
}

function normalizeSearchDoc(doc: SearchDoc): OpenLibraryWorkPrefill | null {
	if (!doc.key || !doc.title?.trim()) {
		return null;
	}

	return {
		workKey: doc.key,
		title: doc.title.trim(),
		authors: doc.author_name?.map((name) => name.trim()).filter(Boolean) ?? [],
		coverId: doc.cover_i ?? null,
		publishedIn: doc.first_publish_year ?? null,
		description: normalizeDescription(doc),
	};
}

export async function searchOpenLibraryWorksForWeb(
	query: string,
): Promise<OpenLibraryWorkPrefill[]> {
	const trimmed = query.trim();
	if (trimmed.length < 2) {
		return [];
	}

	const url = new URL(OPEN_LIBRARY_SEARCH_URL);
	url.searchParams.set("q", trimmed);
	url.searchParams.set("limit", "12");
	url.searchParams.set(
		"fields",
		"key,title,author_name,cover_i,first_publish_year,first_sentence,subtitle",
	);

	const response = await openLibraryFetchSearch(url.toString());
	if (!response.ok) {
		return [];
	}

	const payload = (await response.json()) as { docs?: SearchDoc[] };

	return (
		payload.docs
			?.map((doc) => normalizeSearchDoc(doc))
			.filter((work): work is OpenLibraryWorkPrefill => work != null) ?? []
	);
}
