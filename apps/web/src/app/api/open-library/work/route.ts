import { isOpenLibraryOlid } from "@bbrc/shared";
import { normalizeOpenLibraryDoc } from "@/lib/open-library/normalize";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";

const OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json" as const;

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

function normalizeDescription(description: unknown): string | null {
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

function workDocumentToSearchWork(
	workKey: string,
	doc: WorkDocument,
): OpenLibrarySearchWork | null {
	if (!doc.title?.trim()) {
		return null;
	}

	return {
		workKey,
		title: doc.title.trim(),
		authors: [],
		coverId: doc.covers?.[0] ?? null,
		publishedIn: parsePublishYear(doc.first_publish_date),
		description: normalizeDescription(doc.description),
	};
}

async function fetchWorkViaSearch(
	workKey: string,
): Promise<OpenLibrarySearchWork | null> {
	const url = new URL(OPEN_LIBRARY_SEARCH);
	url.searchParams.set("q", `key:"${workKey}"`);
	url.searchParams.set("limit", "1");
	url.searchParams.set(
		"fields",
		"key,title,author_name,cover_i,first_publish_year,first_sentence,subtitle",
	);

	const response = await fetch(url, {
		headers: { Accept: "application/json" },
		next: { revalidate: 3600 },
	});

	if (!response.ok) {
		return null;
	}

	const payload = (await response.json()) as { docs?: SearchDoc[] };
	const doc = payload.docs?.[0];
	if (!doc) {
		return null;
	}

	const normalized = normalizeOpenLibraryDoc(doc);
	if (!normalized) {
		return null;
	}

	if (normalized.authors.length === 0) {
		normalized.authors = ["Unknown Author"];
	}

	return normalized;
}

async function fetchWorkDocument(
	workKey: string,
): Promise<WorkDocument | null> {
	const response = await fetch(`https://openlibrary.org${workKey}.json`, {
		headers: { Accept: "application/json" },
		next: { revalidate: 3600 },
	});

	if (!response.ok) {
		return null;
	}

	return (await response.json()) as WorkDocument;
}

export async function GET(request: Request) {
	const olid = new URL(request.url).searchParams.get("olid")?.trim() ?? "";

	if (!isOpenLibraryOlid(olid)) {
		return Response.json(
			{ work: null, error: "Invalid OLID" },
			{ status: 400 },
		);
	}

	const normalizedOlid = olid.toUpperCase();
	const workKey = `/works/${normalizedOlid}`;

	const fromSearch = await fetchWorkViaSearch(workKey);
	if (fromSearch) {
		return Response.json({ work: fromSearch });
	}

	const document = await fetchWorkDocument(workKey);
	if (!document) {
		return Response.json(
			{ work: null, error: "Work not found" },
			{ status: 404 },
		);
	}

	const fromDocument = workDocumentToSearchWork(workKey, document);
	if (!fromDocument) {
		return Response.json(
			{ work: null, error: "Work not found" },
			{ status: 404 },
		);
	}

	fromDocument.authors = ["Unknown Author"];

	return Response.json({ work: fromDocument });
}
