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
	wikidataPlace(
		qid: string,
	): Promise<{ label: string | null; countryCode: string | null }>;
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

async function wikiJson(url: string): Promise<unknown | null> {
	const hit = wikiCache.get(url);
	if (hit && Date.now() - hit.at < WIKI_TTL_MS) return hit.value;
	try {
		const response = await fetch(url, {
			headers: WIKI_HEADERS,
			signal: AbortSignal.timeout(15_000),
		});
		if (!response.ok) return null;
		const value = (await response.json()) as unknown;
		if (wikiCache.size > 500) wikiCache.clear();
		wikiCache.set(url, { at: Date.now(), value });
		return value;
	} catch {
		return null;
	}
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
