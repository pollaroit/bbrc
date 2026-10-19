import { isOpenLibraryOlid } from "@bbrc/shared";
import { OPEN_LIBRARY_SEARCH_URL } from "./constants";
import {
	openLibraryFetchDocumentJson,
	openLibraryFetchSearch,
	openLibraryWorkJsonUrl,
} from "./fetch";

export type OpenLibraryWorkPrefill = {
	workKey: string;
	title: string;
	authors: string[];
	coverId: number | null;
	publishedIn: number | null;
	description: string | null;
};

type SearchDoc = {
	key?: string;
	title?: string;
	author_name?: string[];
	cover_i?: number;
	first_publish_year?: number;
	first_sentence?: string | string[];
	subtitle?: string;
};

type WorkDocument = {
	title?: string;
	covers?: number[];
	first_publish_date?: string;
	description?: unknown;
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

function parsePublishYear(firstPublishDate: string | undefined): number | null {
	if (!firstPublishDate?.trim()) {
		return null;
	}

	const match = firstPublishDate.match(/\d{4}/);
	if (!match) {
		return null;
	}

	const year = Number.parseInt(match[0], 10);
	return Number.isFinite(year) ? year : null;
}

function normalizeWorkDescription(description: unknown): string | null {
	if (typeof description === "string" && description.trim()) {
		return description.trim().slice(0, 4000);
	}

	if (
		description != null &&
		typeof description === "object" &&
		"value" in description
	) {
		const value = (description as { value?: unknown }).value;
		if (typeof value === "string" && value.trim()) {
			return value.trim().slice(0, 4000);
		}
	}

	return null;
}

function workDocumentToPrefill(
	workKey: string,
	doc: WorkDocument,
): OpenLibraryWorkPrefill | null {
	if (!doc.title?.trim()) {
		return null;
	}

	return {
		workKey,
		title: doc.title.trim(),
		authors: [],
		coverId: doc.covers?.[0] ?? null,
		publishedIn: parsePublishYear(doc.first_publish_date),
		description: normalizeWorkDescription(doc.description),
	};
}

async function fetchWorkViaSearch(
	workKey: string,
): Promise<OpenLibraryWorkPrefill | null> {
	const url = new URL(OPEN_LIBRARY_SEARCH_URL);
	url.searchParams.set("q", `key:"${workKey}"`);
	url.searchParams.set("limit", "1");
	url.searchParams.set(
		"fields",
		"key,title,author_name,cover_i,first_publish_year,first_sentence,subtitle",
	);

	const response = await openLibraryFetchSearch(url.toString());
	if (!response.ok) {
		return null;
	}

	const payload = (await response.json()) as { docs?: SearchDoc[] };
	const doc = payload.docs?.[0];
	if (!doc) {
		return null;
	}

	const normalized = normalizeSearchDoc(doc);
	if (!normalized) {
		return null;
	}

	if (normalized.authors.length === 0) {
		normalized.authors = ["Unknown Author"];
	}

	return normalized;
}

export async function fetchOpenLibraryWorkPrefillByOlid(
	olid: string,
): Promise<OpenLibraryWorkPrefill | null> {
	const normalizedOlid = olid.trim().toUpperCase();
	if (!isOpenLibraryOlid(normalizedOlid)) {
		return null;
	}

	const workKey = `/works/${normalizedOlid}`;

	const fromSearch = await fetchWorkViaSearch(workKey);
	if (fromSearch) {
		return fromSearch;
	}

	const document = await openLibraryFetchDocumentJson<WorkDocument>(
		openLibraryWorkJsonUrl(workKey),
	);

	if (!document) {
		return null;
	}

	const fromDocument = workDocumentToPrefill(workKey, document);
	if (!fromDocument) {
		return null;
	}

	fromDocument.authors = ["Unknown Author"];
	return fromDocument;
}
