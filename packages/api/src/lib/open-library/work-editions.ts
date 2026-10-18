import {
	openLibraryEditionKeyToOlid,
	openLibraryEditionPageUrl,
	openLibraryWorkKeyToOlid,
} from "@bbrc/shared";

export type OpenLibraryEditionLanguage = "eng" | "tur" | "aze" | "rus" | "any";

const LANGUAGE_PATH: Record<
	Exclude<OpenLibraryEditionLanguage, "any">,
	string
> = {
	eng: "/languages/eng",
	tur: "/languages/tur",
	aze: "/languages/aze",
	rus: "/languages/rus",
};

const LANGUAGE_LABELS: Record<string, string> = {
	"/languages/eng": "English",
	"/languages/tur": "Turkish",
	"/languages/aze": "Azerbaijani",
	"/languages/rus": "Russian",
	"/languages/urd": "Urdu",
	"/languages/fre": "French",
	"/languages/ger": "German",
	"/languages/spa": "Spanish",
	"/languages/ita": "Italian",
	"/languages/por": "Portuguese",
	"/languages/dut": "Dutch",
	"/languages/pol": "Polish",
	"/languages/jpn": "Japanese",
	"/languages/chi": "Chinese",
	"/languages/ara": "Arabic",
};

type EditionListEntry = {
	key?: string;
	title?: string;
	number_of_pages?: number;
	publish_date?: string;
	covers?: number[];
	publishers?: string[];
	publish_places?: string[];
	physical_format?: string;
	edition_name?: string;
	isbn_13?: string[];
	languages?: Array<string | { key?: string }>;
};

type EditionJson = {
	title?: string;
	number_of_pages?: number;
	publish_date?: string;
	covers?: number[];
	isbn_13?: string[];
	isbn_10?: string[];
	publishers?: string[];
	physical_format?: string;
};

export type EditionExportMetadata = {
	editionId: string;
	isbn13: string | null;
	isbn10: string | null;
	publisher: string | null;
	binding: string | null;
};

type EditionsListPayload = {
	entries?: EditionListEntry[];
	size?: number;
};

const EDITIONS_BATCH_SIZE = 100;

async function fetchJson<T>(url: string): Promise<T | null> {
	try {
		const response = await fetch(url, {
			headers: { Accept: "application/json" },
		});

		if (!response.ok) {
			return null;
		}

		return (await response.json()) as T;
	} catch {
		return null;
	}
}

function editionLanguageKeys(edition: EditionListEntry): string[] {
	if (!edition.languages?.length) {
		return [];
	}

	return edition.languages
		.map((language) =>
			typeof language === "string" ? language : (language.key ?? ""),
		)
		.filter(Boolean);
}

export function openLibraryLanguageLabels(languageKeys: string[]): string[] {
	const seen = new Set<string>();
	const labels: string[] = [];

	for (const key of languageKeys) {
		const label =
			LANGUAGE_LABELS[key] ??
			(key.split("/").pop()?.toUpperCase() || key.trim());
		const dedupe = label.toLowerCase();
		if (!dedupe || seen.has(dedupe)) {
			continue;
		}
		seen.add(dedupe);
		labels.push(label);
	}

	return labels;
}

function editionMatchesLanguage(
	edition: EditionListEntry,
	language: OpenLibraryEditionLanguage,
): boolean {
	if (language === "any") {
		return true;
	}

	const needle = LANGUAGE_PATH[language];
	return editionLanguageKeys(edition).some((key) => key.includes(needle));
}

export type WorkEditionListItem = {
	editionId: string;
	title: string;
	pages: number | null;
	publishDate: string | null;
	coverId: number | null;
	languageKeys: string[];
	languages: string[];
	publishers: string[];
	publishPlaces: string[];
	physicalFormat: string | null;
	isbn13: string | null;
	openLibraryUrl: string;
	isbnUrl: string | null;
};

function editionMatchesQuery(
	entry: EditionListEntry,
	row: WorkEditionListItem,
	query: string,
): boolean {
	const haystack = [
		row.title,
		...row.publishers,
		...row.publishPlaces,
		row.physicalFormat ?? "",
		row.isbn13 ?? "",
		entry.edition_name ?? "",
	]
		.join(" ")
		.toLowerCase();

	return haystack.includes(query);
}

function normalizeEditionRow(
	entry: EditionListEntry,
): WorkEditionListItem | null {
	const olid = entry.key ? openLibraryEditionKeyToOlid(entry.key) : null;
	if (!olid) {
		return null;
	}

	const coverId =
		entry.covers?.find((id) => id > 0) ?? entry.covers?.[0] ?? null;

	const languageKeys = editionLanguageKeys(entry);
	const openLibraryUrl = openLibraryEditionPageUrl(olid) ?? "";
	const isbn13 =
		entry.isbn_13?.find((value) => value.trim().length > 0)?.trim() ?? null;

	return {
		editionId: olid,
		title: entry.title?.trim() || "Untitled edition",
		pages:
			entry.number_of_pages != null && entry.number_of_pages > 0
				? entry.number_of_pages
				: null,
		publishDate: entry.publish_date?.trim() || null,
		coverId,
		languageKeys,
		languages: openLibraryLanguageLabels(languageKeys),
		publishers: (entry.publishers ?? [])
			.map((name) => name.trim())
			.filter(Boolean),
		publishPlaces: (entry.publish_places ?? [])
			.map((place) => place.trim())
			.filter(Boolean),
		physicalFormat: entry.physical_format?.trim() || null,
		isbn13,
		openLibraryUrl,
		isbnUrl: isbn13 ? `https://openlibrary.org/isbn/${isbn13}` : null,
	};
}

/** @deprecated alias for read flows that only need a short list */
export type WorkEditionSummary = Pick<
	WorkEditionListItem,
	"editionId" | "title" | "pages" | "publishDate" | "coverId" | "languageKeys"
>;

async function fetchEditionEntriesPage(
	workOlid: string,
	limit: number,
	offset: number,
): Promise<EditionsListPayload | null> {
	return fetchJson<EditionsListPayload>(
		`https://openlibrary.org/works/${workOlid}/editions.json?limit=${limit}&offset=${offset}`,
	);
}

async function fetchAllEditionEntries(
	workOlid: string,
): Promise<EditionListEntry[]> {
	const all: EditionListEntry[] = [];
	let offset = 0;
	let total: number | null = null;

	while (total === null || offset < total) {
		const payload = await fetchEditionEntriesPage(
			workOlid,
			EDITIONS_BATCH_SIZE,
			offset,
		);
		const entries = payload?.entries ?? [];
		if (entries.length === 0) {
			break;
		}

		if (total === null) {
			total = payload?.size ?? entries.length;
		}

		all.push(...entries);
		offset += entries.length;

		if (entries.length < EDITIONS_BATCH_SIZE) {
			break;
		}
	}

	return all;
}

function filterEditionRows(
	entries: EditionListEntry[],
	options: {
		query?: string;
		language?: OpenLibraryEditionLanguage;
	},
): WorkEditionListItem[] {
	const language = options.language ?? "any";
	const query = options.query?.trim().toLowerCase() ?? "";
	const rows: WorkEditionListItem[] = [];

	for (const entry of entries) {
		if (!editionMatchesLanguage(entry, language)) {
			continue;
		}

		const row = normalizeEditionRow(entry);
		if (!row) {
			continue;
		}

		if (query && !editionMatchesQuery(entry, row, query)) {
			continue;
		}

		rows.push(row);
	}

	return rows;
}

export type ListWorkEditionsResult = {
	items: WorkEditionListItem[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	hasNextPage: boolean;
};

/** Total edition count for a work from Open Library (`size` on the editions feed). */
export async function fetchWorkEditionTotalCount(
	workOlid: string,
): Promise<number | null> {
	const olid = openLibraryWorkKeyToOlid(workOlid);
	if (!olid) {
		return null;
	}

	const payload = await fetchJson<{ size?: number }>(
		`https://openlibrary.org/works/${olid}/editions.json?limit=1`,
	);

	return payload?.size ?? null;
}

export async function listWorkEditions(
	workOlid: string,
	options: {
		page?: number;
		limit?: number;
		query?: string;
		language?: OpenLibraryEditionLanguage;
	} = {},
): Promise<ListWorkEditionsResult> {
	const olid = openLibraryWorkKeyToOlid(workOlid);
	const empty: ListWorkEditionsResult = {
		items: [],
		total: 0,
		page: 1,
		limit: options.limit ?? 12,
		totalPages: 0,
		hasNextPage: false,
	};

	if (!olid) {
		return empty;
	}

	const limit = options.limit ?? 12;
	const page = Math.max(1, options.page ?? 1);
	const language = options.language ?? "any";
	const query = options.query?.trim() ?? "";
	const hasFilters = language !== "any" || query.length > 0;

	if (!hasFilters) {
		const offset = (page - 1) * limit;
		const payload = await fetchEditionEntriesPage(workOlid, limit, offset);
		if (!payload) {
			return empty;
		}

		const total = payload.size ?? payload.entries?.length ?? 0;
		const items = (payload.entries ?? [])
			.map((entry) => normalizeEditionRow(entry))
			.filter((row): row is WorkEditionListItem => row != null);

		const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

		return {
			items,
			total,
			page,
			limit,
			totalPages,
			hasNextPage: offset + items.length < total,
		};
	}

	const entries = await fetchAllEditionEntries(olid);
	const filtered = filterEditionRows(entries, { query, language });
	const total = filtered.length;
	const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
	const start = (page - 1) * limit;

	return {
		items: filtered.slice(start, start + limit),
		total,
		page,
		limit,
		totalPages,
		hasNextPage: start + limit < total,
	};
}

export async function fetchWorkEditionSummaries(
	workOlid: string,
	options: {
		query?: string;
		language?: OpenLibraryEditionLanguage;
		limit?: number;
	} = {},
): Promise<WorkEditionSummary[]> {
	const result = await listWorkEditions(workOlid, {
		page: 1,
		limit: options.limit ?? 5,
		query: options.query,
		language: options.language,
	});

	return result.items.map(
		({ editionId, title, pages, publishDate, coverId, languageKeys }) => ({
			editionId,
			title,
			pages,
			publishDate,
			coverId,
			languageKeys,
		}),
	);
}

export type EditionDetailSummary = {
	editionId: string;
	title: string;
	pages: number | null;
	publishDate: string | null;
	coverId: number | null;
};

export async function fetchEditionDetailSummary(
	editionOlid: string,
): Promise<EditionDetailSummary | null> {
	const olid = openLibraryEditionKeyToOlid(editionOlid);
	if (!olid) {
		return null;
	}

	const data = await fetchJson<EditionJson>(
		`https://openlibrary.org/books/${olid}.json`,
	);

	if (!data) {
		return {
			editionId: olid,
			title: olid,
			pages: null,
			publishDate: null,
			coverId: null,
		};
	}

	const coverId = data.covers?.find((id) => id > 0) ?? data.covers?.[0] ?? null;

	return {
		editionId: olid,
		title: data.title?.trim() || olid,
		pages:
			data.number_of_pages != null && data.number_of_pages > 0
				? data.number_of_pages
				: null,
		publishDate: data.publish_date?.trim() || null,
		coverId,
	};
}

function mapEditionExportMetadata(
	editionId: string,
	data: EditionJson | null,
): EditionExportMetadata {
	const isbn13 =
		data?.isbn_13?.find((value) => value.trim().length > 0)?.trim() ?? null;
	const isbn10 =
		data?.isbn_10?.find((value) => value.trim().length > 0)?.trim() ?? null;
	const publisher =
		data?.publishers?.find((value) => value.trim().length > 0)?.trim() ?? null;
	const binding = data?.physical_format?.trim() || null;

	return {
		editionId,
		isbn13,
		isbn10,
		publisher,
		binding,
	};
}

async function fetchEditionExportMetadata(
	editionOlid: string,
): Promise<EditionExportMetadata | null> {
	const olid = openLibraryEditionKeyToOlid(editionOlid);
	if (!olid) {
		return null;
	}

	const data = await fetchJson<EditionJson>(
		`https://openlibrary.org/books/${olid}.json`,
	);

	return mapEditionExportMetadata(olid, data);
}

export async function fetchEditionExportMetadataBatch(
	editionOlids: string[],
): Promise<Map<string, EditionExportMetadata>> {
	const unique = [
		...new Set(editionOlids.map((id) => id.trim()).filter(Boolean)),
	];
	const map = new Map<string, EditionExportMetadata>();

	await Promise.all(
		unique.map(async (editionId) => {
			const metadata = await fetchEditionExportMetadata(editionId);
			if (metadata) {
				map.set(metadata.editionId, metadata);
			}
		}),
	);

	return map;
}

export async function fetchEditionDetailSummaries(
	editionOlids: string[],
): Promise<Map<string, EditionDetailSummary>> {
	const unique = [
		...new Set(editionOlids.map((id) => id.trim()).filter(Boolean)),
	];
	const map = new Map<string, EditionDetailSummary>();

	await Promise.all(
		unique.map(async (editionId) => {
			const summary = await fetchEditionDetailSummary(editionId);
			if (summary) {
				map.set(summary.editionId, summary);
			}
		}),
	);

	return map;
}
