import {
	openLibraryEditionKeyToOlid,
	openLibraryWorkKeyToOlid,
	parseOpenLibraryDescription,
} from "@bbrc/shared";
import { OPEN_LIBRARY_ORIGIN, OPEN_LIBRARY_USER_AGENT } from "./constants";
import { openLibraryBookJsonUrl, openLibraryFetchDocumentJson } from "./fetch";

/** Everything the edition page shows about an Open Library edition. */
export type OpenLibraryEditionFull = {
	olid: string;
	/** The work this edition belongs to (OL…W), to check it is the right book. */
	workOlid: string | null;
	title: string | null;
	subtitle: string | null;
	editionName: string | null;
	publishers: string[];
	publishPlaces: string[];
	publishDate: string | null;
	publishedYear: number | null;
	pages: number | null;
	physicalFormat: string | null;
	isbn10: string | null;
	isbn13: string | null;
	languageKeys: string[];
	covers: number[];
	description: string | null;
	series: string | null;
	translator: string | null;
	identifiers: {
		oclc: string[];
		lccn: string[];
		goodreads: string[];
		librarything: string[];
	};
	ocaid: string | null;
};

type Raw = {
	key?: string;
	title?: string;
	subtitle?: string;
	edition_name?: string;
	publishers?: string[];
	publish_places?: string[];
	publish_date?: string;
	number_of_pages?: number;
	physical_format?: string;
	isbn_10?: string[];
	isbn_13?: string[];
	languages?: Array<string | { key?: string }>;
	covers?: number[];
	description?: unknown;
	series?: string[];
	translated_from?: Array<{ key?: string }>;
	contributions?: string[];
	identifiers?: Record<string, string[] | undefined>;
	oclc_numbers?: string[];
	lccn?: string[];
	ocaid?: string;
	works?: Array<{ key?: string }>;
};

const clean = (values: string[] | undefined) =>
	(values ?? []).map((value) => value.trim()).filter(Boolean);

function firstClean(values: string[] | undefined) {
	return clean(values)[0] ?? null;
}

/** "October 1990", "1990", "1990-10-01" → 1990. */
export function yearFromPublishDate(value: string | null | undefined) {
	const match = value?.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
	return match ? Number(match[1]) : null;
}

function translatorFrom(raw: Raw): string | null {
	// Open Library lists contributors as "Name (Translator)".
	for (const contribution of raw.contributions ?? []) {
		const match = contribution.match(
			/^(.*?)\s*\((?:translator|translated by)\)\s*$/i,
		);
		if (match?.[1]?.trim()) return match[1].trim();
	}
	return null;
}

function normalize(olid: string, raw: Raw): OpenLibraryEditionFull {
	const workKey = raw.works?.[0]?.key;
	const identifiers = raw.identifiers ?? {};
	return {
		olid,
		workOlid: workKey ? openLibraryWorkKeyToOlid(workKey) : null,
		title: raw.title?.trim() || null,
		subtitle: raw.subtitle?.trim() || null,
		editionName: raw.edition_name?.trim() || null,
		publishers: clean(raw.publishers),
		publishPlaces: clean(raw.publish_places),
		publishDate: raw.publish_date?.trim() || null,
		publishedYear: yearFromPublishDate(raw.publish_date),
		pages:
			raw.number_of_pages != null && raw.number_of_pages > 0
				? raw.number_of_pages
				: null,
		physicalFormat: raw.physical_format?.trim() || null,
		isbn10: firstClean(raw.isbn_10),
		isbn13: firstClean(raw.isbn_13),
		languageKeys: (raw.languages ?? [])
			.map((language) =>
				typeof language === "string" ? language : (language.key ?? ""),
			)
			.filter(Boolean),
		covers: (raw.covers ?? []).filter((id) => id > 0),
		description: parseOpenLibraryDescription(raw.description),
		series: firstClean(raw.series),
		translator: translatorFrom(raw),
		identifiers: {
			oclc: clean(identifiers.oclc ?? raw.oclc_numbers),
			lccn: clean(identifiers.lccn ?? raw.lccn),
			goodreads: clean(identifiers.goodreads),
			librarything: clean(identifiers.librarything),
		},
		ocaid: raw.ocaid?.trim() || null,
	};
}

/**
 * One Open Library edition in full, through the cached document helper (fresh for
 * an hour, usable for a day). Returns null when Open Library has nothing or does
 * not answer: the caller falls back to our saved copy.
 */
export async function fetchOpenLibraryEditionFull(
	editionOlid: string,
): Promise<OpenLibraryEditionFull | null> {
	const olid = openLibraryEditionKeyToOlid(editionOlid);
	if (!olid) return null;
	try {
		const raw = await openLibraryFetchDocumentJson<Raw>(
			openLibraryBookJsonUrl(olid),
		);
		return raw ? normalize(olid, raw) : null;
	} catch {
		return null;
	}
}

/** Finds an Open Library edition by ISBN (Open Library redirects `/isbn/<isbn>.json` to the edition). */
export async function resolveOpenLibraryEditionByIsbn(
	isbn: string,
): Promise<OpenLibraryEditionFull | null> {
	if (!/^(\d{13}|\d{9}[\dX])$/.test(isbn)) return null;
	try {
		const raw = await openLibraryFetchDocumentJson<Raw>(
			`${OPEN_LIBRARY_ORIGIN}/isbn/${isbn}.json`,
		);
		const olid = raw?.key ? openLibraryEditionKeyToOlid(raw.key) : null;
		return raw && olid ? normalize(olid, raw) : null;
	} catch {
		return null;
	}
}

// ── Can it be borrowed for free? ───────────────────────────────────────────

const AVAILABILITY_TTL_MS = 6 * 60 * 60 * 1000;
const availabilityCache = new Map<string, { at: number; value: boolean }>();

/**
 * Asks Open Library whether a free scanned copy can be borrowed or read. Cheap,
 * remembered for six hours, stops after three seconds and never throws.
 */
export async function fetchIsBorrowable(isbn: string): Promise<boolean | null> {
	const cached = availabilityCache.get(isbn);
	if (cached && Date.now() - cached.at < AVAILABILITY_TTL_MS)
		return cached.value;
	try {
		const response = await fetch(
			`${OPEN_LIBRARY_ORIGIN}/api/volumes/brief/isbn/${isbn}.json`,
			{
				headers: {
					Accept: "application/json",
					"User-Agent": OPEN_LIBRARY_USER_AGENT,
				},
				signal: AbortSignal.timeout(3000),
			},
		);
		if (!response.ok) return null;
		const payload = (await response.json()) as {
			items?: Array<{ status?: string }>;
			records?: Record<string, unknown>;
		};
		const value = (payload.items ?? []).some((item) =>
			["lendable", "full access"].includes((item.status ?? "").toLowerCase()),
		);
		availabilityCache.set(isbn, { at: Date.now(), value });
		return value;
	} catch {
		return null;
	}
}
