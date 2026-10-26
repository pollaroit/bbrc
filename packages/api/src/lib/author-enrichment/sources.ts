import {
	OPEN_LIBRARY_ORIGIN,
	OPEN_LIBRARY_USER_AGENT,
} from "../open-library/constants";
import { openLibraryFetchDocumentJson } from "../open-library/fetch";
import {
	type OpenLibraryAuthorRecord,
	type OpenLibraryAuthorSearchHit,
	type PhotoSuggestion,
	parseCommonsImageInfo,
	parseOpenLibraryAuthor,
	parseOpenLibraryAuthorSearch,
	parseWikidataAuthor,
	parseWikidataPlace,
	parseWikipediaSummary,
	parseWorkAuthorIds,
	type WikidataAuthorRecord,
	type WikipediaSummary,
	wikidataEntityFrom,
} from "./parse";

/**
 * Everything the pipeline reads from outside. One object, so tests (and the backfill
 * dry run) can replace the network with fixtures.
 */
export type AuthorSources = {
	openLibraryAuthor(olid: string): Promise<OpenLibraryAuthorRecord | null>;
	openLibrarySearchAuthors(
		query: string,
		limit?: number,
	): Promise<OpenLibraryAuthorSearchHit[]>;
	/** The Open Library author ids of a work (`OL45883W`), in the order the work lists them. */
	openLibraryWorkAuthorIds(workOlid: string): Promise<string[]>;
	wikidataAuthor(qid: string): Promise<WikidataAuthorRecord | null>;
	wikidataPlace(qid: string): Promise<{
		label: string | null;
		countryCode: string | null;
		/** The countries a city or region sits in (absent in older test doubles). */
		countryIds?: string[];
	}>;
	wikipediaSummary(
		host: string,
		title: string,
	): Promise<WikipediaSummary | null>;
	commonsPhoto(fileName: string): Promise<PhotoSuggestion | null>;
};

const WIKI_HEADERS = {
	Accept: "application/json",
	"User-Agent": OPEN_LIBRARY_USER_AGENT,
} as const;

const wikiCache = new Map<string, { at: number; value: unknown }>();
const WIKI_TTL_MS = 60 * 60_000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

/** Wikimedia asks for politeness: a busy answer (429, 5xx) is retried with a short backoff. */
const WIKI_MAX_ATTEMPTS = 3;
const WIKI_RETRY_BASE_MS = 400;

async function wikiJson(url: string): Promise<unknown | null> {
	const hit = wikiCache.get(url);
	if (hit && Date.now() - hit.at < WIKI_TTL_MS) return hit.value;
	for (let attempt = 0; attempt < WIKI_MAX_ATTEMPTS; attempt++) {
		const last = attempt === WIKI_MAX_ATTEMPTS - 1;
		try {
			const response = await fetch(url, {
				headers: WIKI_HEADERS,
				signal: AbortSignal.timeout(15_000),
			});
			if (response.status === 429 || response.status >= 500) {
				if (last) return null;
				const retryAfter = Number(response.headers.get("retry-after"));
				const wait =
					Number.isFinite(retryAfter) && retryAfter > 0
						? Math.min(retryAfter * 1000, 3000)
						: WIKI_RETRY_BASE_MS * 2 ** attempt;
				await sleep(wait);
				continue;
			}
			if (!response.ok) return null;
			const value = (await response.json()) as unknown;
			if (wikiCache.size > 500) wikiCache.clear();
			wikiCache.set(url, { at: Date.now(), value });
			return value;
		} catch {
			if (last) return null;
			await sleep(WIKI_RETRY_BASE_MS * 2 ** attempt);
		}
	}
	return null;
}

export const defaultAuthorSources: AuthorSources = {
	async openLibraryAuthor(olid) {
		const json = await openLibraryFetchDocumentJson<unknown>(
			`${OPEN_LIBRARY_ORIGIN}/authors/${olid}.json`,
		);
		return parseOpenLibraryAuthor(json);
	},

	async openLibrarySearchAuthors(query, limit = 5) {
		const url = `${OPEN_LIBRARY_ORIGIN}/search/authors.json?q=${encodeURIComponent(query)}&limit=${limit}`;
		const json = await openLibraryFetchDocumentJson<unknown>(url);
		return parseOpenLibraryAuthorSearch(json);
	},

	async openLibraryWorkAuthorIds(workOlid) {
		const json = await openLibraryFetchDocumentJson<unknown>(
			`${OPEN_LIBRARY_ORIGIN}/works/${workOlid}.json`,
		);
		return parseWorkAuthorIds(json);
	},

	async wikidataAuthor(qid) {
		const json = await wikiJson(
			`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,
		);
		return parseWikidataAuthor(wikidataEntityFrom(json, qid), qid);
	},

	async wikidataPlace(qid) {
		const json = await wikiJson(
			`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,
		);
		return parseWikidataPlace(wikidataEntityFrom(json, qid));
	},

	async wikipediaSummary(host, title) {
		if (!/^[a-z-]+\.wikipedia\.org$/.test(host)) return null;
		const json = await wikiJson(
			`https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
		);
		return parseWikipediaSummary(json);
	},

	async commonsPhoto(fileName) {
		const url =
			"https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
			"&iiprop=url|extmetadata|size|mime&iiurlwidth=800" +
			`&titles=${encodeURIComponent(`File:${fileName}`)}`;
		return parseCommonsImageInfo(await wikiJson(url), fileName);
	},
};
