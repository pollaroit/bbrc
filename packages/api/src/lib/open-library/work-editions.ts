import {
	openLibraryEditionKeyToOlid,
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

type EditionListEntry = {
	key?: string;
	title?: string;
	number_of_pages?: number;
	publish_date?: string;
	covers?: number[];
	languages?: Array<string | { key?: string }>;
};

type EditionJson = {
	title?: string;
	number_of_pages?: number;
	publish_date?: string;
	covers?: number[];
};

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

function normalizeEditionRow(entry: EditionListEntry) {
	const olid = entry.key ? openLibraryEditionKeyToOlid(entry.key) : null;
	if (!olid) {
		return null;
	}

	const coverId =
		entry.covers?.find((id) => id > 0) ?? entry.covers?.[0] ?? null;

	return {
		editionId: olid,
		title: entry.title?.trim() || "Untitled edition",
		pages:
			entry.number_of_pages != null && entry.number_of_pages > 0
				? entry.number_of_pages
				: null,
		publishDate: entry.publish_date?.trim() || null,
		coverId,
		languageKeys: editionLanguageKeys(entry),
	};
}

export type WorkEditionSummary = NonNullable<
	ReturnType<typeof normalizeEditionRow>
>;

export async function fetchWorkEditionSummaries(
	workOlid: string,
	options: {
		query?: string;
		language?: OpenLibraryEditionLanguage;
		limit?: number;
	} = {},
): Promise<WorkEditionSummary[]> {
	const olid = openLibraryWorkKeyToOlid(workOlid);
	if (!olid) {
		return [];
	}

	const limit = options.limit ?? 5;
	const language = options.language ?? "any";
	const q = options.query?.trim().toLowerCase() ?? "";

	const payload = await fetchJson<{ entries?: EditionListEntry[] }>(
		`https://openlibrary.org/works/${olid}/editions.json?limit=100`,
	);

	const normalized: WorkEditionSummary[] = [];

	for (const entry of payload?.entries ?? []) {
		const row = normalizeEditionRow(entry);
		if (!row) {
			continue;
		}
		if (!editionMatchesLanguage(entry, language)) {
			continue;
		}
		if (q && !row.title.toLowerCase().includes(q)) {
			continue;
		}
		normalized.push(row);
	}

	return normalized.slice(0, limit);
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
