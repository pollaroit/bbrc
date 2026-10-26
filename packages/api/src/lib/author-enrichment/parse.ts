import {
	AUTHOR_BIO_MAX_LENGTH,
	type AuthorFieldSource,
	normalizeBookCountryCodes,
} from "@bbrc/shared";

export type PartialDate = {
	year: number | null;
	month: number | null;
	day: number | null;
};

export type AuthorGenderValue =
	| "female"
	| "male"
	| "non_binary"
	| "other"
	| "unknown";

/** What one source knows about an author. Every field is optional: a source only says what it knows. */
export type AuthorFactValues = {
	bio?: string;
	birth?: PartialDate;
	death?: PartialDate;
	birthPlace?: string;
	deathPlace?: string;
	nationalities?: string[];
	gender?: AuthorGenderValue;
	wikipediaUrl?: string;
	goodreadsUrl?: string;
	websiteUrl?: string;
};

export type SourceFacts = {
	source: AuthorFieldSource;
	values: AuthorFactValues;
};

const EMPTY_DATE: PartialDate = { year: null, month: null, day: null };

const MONTHS: Record<string, number> = {
	january: 1,
	jan: 1,
	february: 2,
	feb: 2,
	march: 3,
	mar: 3,
	april: 4,
	apr: 4,
	may: 5,
	june: 6,
	jun: 6,
	july: 7,
	jul: 7,
	august: 8,
	aug: 8,
	september: 9,
	sep: 9,
	sept: 9,
	october: 10,
	oct: 10,
	november: 11,
	nov: 11,
	december: 12,
	dec: 12,
};

export function hasDate(date: PartialDate | null | undefined): boolean {
	return date != null && date.year != null;
}

function validDay(month: number, day: number): boolean {
	if (day < 1 || day > 31) return false;
	// A leap year is used on purpose: leap-day births are real.
	const probe = new Date(Date.UTC(2000, month - 1, day));
	return probe.getUTCMonth() === month - 1;
}

/**
 * Reads the loose dates Open Library and people write: "1821", "11 November 1821",
 * "Nov 11, 1821", "1821-11-11", "c. 1564", "1564?", "384 BC". Returns nulls for what is not there.
 */
export function parseLooseDate(input: string | null | undefined): PartialDate {
	const text = (input ?? "").trim();
	if (!text) return { ...EMPTY_DATE };

	const iso = /^(-?\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(text);
	if (iso) {
		const year = Number(iso[1]);
		const month = iso[2] ? Number(iso[2]) : null;
		const day = iso[3] ? Number(iso[3]) : null;
		if (month != null && (month < 1 || month > 12)) {
			return { year, month: null, day: null };
		}
		if (month != null && day != null && !validDay(month, day)) {
			return { year, month, day: null };
		}
		return { year, month, day };
	}

	const bc = /\b(bc|bce|b\.c\.)\b/i.test(text);
	const cleaned = text
		.replace(/\b(circa|ca|c)\.?\s+/gi, " ")
		.replace(/[?,]/g, " ")
		.replace(/\b(bc|bce|b\.c\.|ad|ce|a\.d\.)\b/gi, " ")
		.replace(/\s+/g, " ")
		.trim();

	const yearMatch = /(?:^|\s)(\d{3,4})(?:\s|$)/.exec(cleaned);
	if (!yearMatch) {
		return { ...EMPTY_DATE };
	}
	const rawYear = Number(yearMatch[1]);
	const year = bc ? -rawYear : rawYear;

	let month: number | null = null;
	for (const word of cleaned.toLowerCase().split(/[\s.]+/)) {
		const found = MONTHS[word];
		if (found != null) {
			month = found;
			break;
		}
	}

	let day: number | null = null;
	if (month != null) {
		const rest = cleaned.replace(yearMatch[1] ?? "", " ");
		const dayMatch = /(?:^|\s)(\d{1,2})(?:st|nd|rd|th)?(?:\s|$)/.exec(rest);
		if (dayMatch) {
			const candidate = Number(dayMatch[1]);
			if (validDay(month, candidate)) day = candidate;
		}
	}

	return { year, month, day };
}

// ── Open Library ───────────────────────────────────────────────────────────

export type OpenLibraryAuthorRecord = {
	olid: string;
	name: string;
	alternateNames: string[];
	bio: string | null;
	birth: PartialDate;
	death: PartialDate;
	wikipediaUrl: string | null;
	websiteUrl: string | null;
	wikidataId: string | null;
	goodreadsId: string | null;
};

/** "/authors/OL26320A" or "OL26320A" → "OL26320A"; anything else → null. */
export function parseOpenLibraryAuthorId(
	value: string | null | undefined,
): string | null {
	const match = /(OL\d+A)\b/.exec(value ?? "");
	return match?.[1] ?? null;
}

type OlText = string | { value?: string } | null | undefined;

function olText(value: OlText): string {
	if (typeof value === "string") return value;
	if (value && typeof value.value === "string") return value.value;
	return "";
}

/** Open Library bios mix markdown, link syntax and a "----------" sources block; keep the prose. */
export function cleanBioText(raw: string | null | undefined): string | null {
	const text = (raw ?? "")
		.replace(/\r/g, "")
		.split(/\n-{4,}\n?/)[0]
		?.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1")
		.replace(/\[([^\]]+)\]\[\d*\]/g, "$1")
		.replace(/<[^>]+>/g, " ")
		.replace(/[*_`#>]+/g, "")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
	if (!text) return null;
	return truncateBio(text);
}

/** Cuts to the bio limit at a sentence end when there is one, else at a word. */
export function truncateBio(
	text: string,
	max: number = AUTHOR_BIO_MAX_LENGTH,
): string {
	if (text.length <= max) return text;
	const slice = text.slice(0, max);
	const sentenceEnd = Math.max(
		slice.lastIndexOf(". "),
		slice.lastIndexOf(".\n"),
	);
	if (sentenceEnd > max * 0.5) return slice.slice(0, sentenceEnd + 1).trim();
	const wordEnd = slice.lastIndexOf(" ");
	return `${slice.slice(0, wordEnd > 0 ? wordEnd : max).trim()}…`;
}

export function parseOpenLibraryAuthor(
	json: unknown,
): OpenLibraryAuthorRecord | null {
	if (!json || typeof json !== "object") return null;
	const record = json as Record<string, unknown>;
	const olid = parseOpenLibraryAuthorId(String(record.key ?? ""));
	const name = typeof record.name === "string" ? record.name.trim() : "";
	if (!olid || !name) return null;

	const remote =
		record.remote_ids && typeof record.remote_ids === "object"
			? (record.remote_ids as Record<string, unknown>)
			: {};
	const wikidata =
		typeof remote.wikidata === "string" && /^Q\d+$/.test(remote.wikidata)
			? remote.wikidata
			: null;
	const goodreads =
		typeof remote.goodreads === "string" && /^\d+$/.test(remote.goodreads)
			? remote.goodreads
			: null;

	const wikipedia =
		typeof record.wikipedia === "string" && record.wikipedia.trim()
			? normalizeWikipediaUrl(record.wikipedia)
			: null;

	const links = Array.isArray(record.links) ? record.links : [];
	let website: string | null = null;
	for (const link of links) {
		if (!link || typeof link !== "object") continue;
		const { title, url } = link as { title?: unknown; url?: unknown };
		if (typeof url !== "string" || !/^https:\/\//i.test(url)) continue;
		if (
			typeof title === "string" &&
			/official|website|web site|homepage|home page/i.test(title) &&
			!/wikipedia|goodreads|amazon|facebook|twitter|instagram/i.test(url)
		) {
			website = url;
			break;
		}
	}

	const alternate = Array.isArray(record.alternate_names)
		? record.alternate_names.filter(
				(item): item is string =>
					typeof item === "string" && item.trim() !== "",
			)
		: [];

	return {
		olid,
		name,
		alternateNames: alternate.map((item) => item.trim()),
		bio: cleanBioText(olText(record.bio as OlText)),
		birth: parseLooseDate(
			typeof record.birth_date === "string" ? record.birth_date : null,
		),
		death: parseLooseDate(
			typeof record.death_date === "string" ? record.death_date : null,
		),
		wikipediaUrl: wikipedia,
		websiteUrl: website,
		wikidataId: wikidata,
		goodreadsId: goodreads,
	};
}

/** Open Library lists "http://en.wikipedia.org/wiki/X": store the https form, only for Wikipedia. */
export function normalizeWikipediaUrl(url: string): string | null {
	try {
		const parsed = new URL(url.trim());
		if (!/(^|\.)wikipedia\.org$/i.test(parsed.hostname)) return null;
		if (!parsed.pathname.startsWith("/wiki/")) return null;
		return `https://${parsed.hostname.toLowerCase()}${parsed.pathname}`;
	} catch {
		return null;
	}
}

/** { host: "en.wikipedia.org", title: "Fyodor_Dostoevsky" } from a stored Wikipedia URL. */
export function wikipediaTitleFromUrl(
	url: string | null | undefined,
): { host: string; title: string } | null {
	if (!url) return null;
	const normalized = normalizeWikipediaUrl(url);
	if (!normalized) return null;
	const parsed = new URL(normalized);
	const title = decodeURIComponent(parsed.pathname.slice("/wiki/".length));
	return title ? { host: parsed.hostname, title } : null;
}

export function goodreadsAuthorUrl(id: string): string {
	return `https://www.goodreads.com/author/show/${id}`;
}

export type OpenLibraryAuthorSearchHit = {
	olid: string;
	name: string;
	topWork: string | null;
	birthYear: number | null;
	workCount: number;
};

export function parseOpenLibraryAuthorSearch(
	json: unknown,
): OpenLibraryAuthorSearchHit[] {
	if (!json || typeof json !== "object") return [];
	const docs = (json as { docs?: unknown }).docs;
	if (!Array.isArray(docs)) return [];
	const hits: OpenLibraryAuthorSearchHit[] = [];
	for (const doc of docs) {
		if (!doc || typeof doc !== "object") continue;
		const row = doc as Record<string, unknown>;
		const olid = parseOpenLibraryAuthorId(String(row.key ?? ""));
		const name = typeof row.name === "string" ? row.name.trim() : "";
		if (!olid || !name) continue;
		hits.push({
			olid,
			name,
			topWork:
				typeof row.top_work === "string" && row.top_work.trim()
					? row.top_work.trim()
					: null,
			birthYear:
				typeof row.birth_date === "string"
					? parseLooseDate(row.birth_date).year
					: null,
			workCount: typeof row.work_count === "number" ? row.work_count : 0,
		});
	}
	return hits;
}

/** The author ids a work record lists (in order). */
export function parseWorkAuthorIds(json: unknown): string[] {
	if (!json || typeof json !== "object") return [];
	const authors = (json as { authors?: unknown }).authors;
	if (!Array.isArray(authors)) return [];
	const ids: string[] = [];
	for (const entry of authors) {
		if (!entry || typeof entry !== "object") continue;
		const author = (entry as { author?: { key?: unknown } }).author;
		const id = parseOpenLibraryAuthorId(String(author?.key ?? ""));
		if (id && !ids.includes(id)) ids.push(id);
	}
	return ids;
}

// ── Wikidata ───────────────────────────────────────────────────────────────

type Claim = {
	rank?: string;
	mainsnak?: {
		snaktype?: string;
		datavalue?: { value?: unknown };
	};
};

type WikidataEntity = {
	id?: string;
	labels?: Record<string, { value?: string }>;
	descriptions?: Record<string, { value?: string }>;
	claims?: Record<string, Claim[]>;
	sitelinks?: Record<string, { title?: string }>;
};

export function wikidataEntityFrom(
	json: unknown,
	qid: string,
): WikidataEntity | null {
	if (!json || typeof json !== "object") return null;
	const entities = (json as { entities?: Record<string, WikidataEntity> })
		.entities;
	return entities?.[qid] ?? null;
}

function bestClaims(entity: WikidataEntity, property: string): Claim[] {
	const claims = (entity.claims?.[property] ?? []).filter(
		(claim) =>
			claim.rank !== "deprecated" &&
			claim.mainsnak?.snaktype === "value" &&
			claim.mainsnak.datavalue?.value != null,
	);
	const preferred = claims.filter((claim) => claim.rank === "preferred");
	return preferred.length > 0 ? preferred : claims;
}

function claimEntityIds(entity: WikidataEntity, property: string): string[] {
	const ids: string[] = [];
	for (const claim of bestClaims(entity, property)) {
		const value = claim.mainsnak?.datavalue?.value as
			| { id?: string }
			| undefined;
		if (value?.id && /^Q\d+$/.test(value.id) && !ids.includes(value.id)) {
			ids.push(value.id);
		}
	}
	return ids;
}

function claimStrings(entity: WikidataEntity, property: string): string[] {
	const values: string[] = [];
	for (const claim of bestClaims(entity, property)) {
		const value = claim.mainsnak?.datavalue?.value;
		if (typeof value === "string" && value.trim()) values.push(value.trim());
	}
	return values;
}

/** Wikidata time: "+1821-11-11T00:00:00Z" with precision 9 (year), 10 (month), 11 (day). */
export function parseWikidataTime(value: unknown): PartialDate {
	if (!value || typeof value !== "object") return { ...EMPTY_DATE };
	const { time, precision } = value as { time?: string; precision?: number };
	const match = /^([+-])(\d{1,6})-(\d{2})-(\d{2})T/.exec(time ?? "");
	if (!match || typeof precision !== "number" || precision < 9) {
		return { ...EMPTY_DATE };
	}
	const year = (match[1] === "-" ? -1 : 1) * Number(match[2]);
	const month = precision >= 10 ? Number(match[3]) : null;
	const day = precision >= 11 ? Number(match[4]) : null;
	if (month != null && (month < 1 || month > 12)) {
		return { year, month: null, day: null };
	}
	return { year, month, day: day != null && day >= 1 ? day : null };
}

const WIKIDATA_GENDER: Record<string, AuthorGenderValue> = {
	Q6581072: "female",
	Q6581097: "male",
	Q48270: "non_binary",
	Q1097630: "other",
	Q2449503: "other",
	Q15145779: "other",
	Q1052281: "other",
	Q189125: "other",
};

export type WikidataAuthorRecord = {
	id: string;
	description: string | null;
	birth: PartialDate;
	death: PartialDate;
	birthPlaceId: string | null;
	deathPlaceId: string | null;
	citizenshipIds: string[];
	gender: AuthorGenderValue | null;
	wikipediaTitle: string | null;
	imageFile: string | null;
	websiteUrl: string | null;
};

export function parseWikidataAuthor(
	entity: WikidataEntity | null,
	qid: string,
): WikidataAuthorRecord | null {
	if (!entity) return null;
	const time = (property: string): PartialDate => {
		const claim = bestClaims(entity, property)[0];
		return parseWikidataTime(claim?.mainsnak?.datavalue?.value);
	};
	const genderId = claimEntityIds(entity, "P21")[0];
	const website = claimStrings(entity, "P856").find((url) =>
		/^https:\/\//i.test(url),
	);
	return {
		id: qid,
		description: entity.descriptions?.en?.value?.trim() || null,
		birth: time("P569"),
		death: time("P570"),
		birthPlaceId: claimEntityIds(entity, "P19")[0] ?? null,
		deathPlaceId: claimEntityIds(entity, "P20")[0] ?? null,
		citizenshipIds: claimEntityIds(entity, "P27"),
		gender: genderId ? (WIKIDATA_GENDER[genderId] ?? "other") : null,
		wikipediaTitle: entity.sitelinks?.enwiki?.title?.trim() || null,
		imageFile: claimStrings(entity, "P18")[0] ?? null,
		websiteUrl: website ?? null,
	};
}

/**
 * A place or country entity: the English label, the ISO code when it is a current country
 * (P297), and the countries it sits in (P17, best rank first) for a city or region.
 */
export function parseWikidataPlace(entity: WikidataEntity | null): {
	label: string | null;
	countryCode: string | null;
	countryIds: string[];
} {
	if (!entity) return { label: null, countryCode: null, countryIds: [] };
	const label = entity.labels?.en?.value?.trim() || null;
	const code = claimStrings(entity, "P297")[0];
	const [normalized] = code ? normalizeBookCountryCodes([code]) : [];
	return {
		label,
		countryCode: normalized ?? null,
		countryIds: claimEntityIds(entity, "P17"),
	};
}

// ── Wikipedia ──────────────────────────────────────────────────────────────

export type WikipediaSummary = {
	extract: string;
	description: string | null;
	pageUrl: string | null;
};

export function parseWikipediaSummary(json: unknown): WikipediaSummary | null {
	if (!json || typeof json !== "object") return null;
	const row = json as {
		type?: string;
		extract?: unknown;
		description?: unknown;
		content_urls?: { desktop?: { page?: unknown } };
	};
	if (row.type === "disambiguation") return null;
	const extract = typeof row.extract === "string" ? row.extract.trim() : "";
	if (!extract) return null;
	const page = row.content_urls?.desktop?.page;
	return {
		extract,
		description:
			typeof row.description === "string" && row.description.trim()
				? row.description.trim()
				: null,
		pageUrl: typeof page === "string" ? normalizeWikipediaUrl(page) : null,
	};
}

// ── Wikimedia Commons ──────────────────────────────────────────────────────

export type PhotoSuggestion = {
	fileName: string;
	/** The page about the file (credit, licence). */
	sourceUrl: string;
	/** A scaled copy to download (never the original). */
	imageUrl: string;
	credit: string | null;
	license: string | null;
	licenseUrl: string | null;
	width: number | null;
	height: number | null;
};

function stripHtml(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const text = value
		.replace(/<[^>]+>/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return text || null;
}

/** Free-licence names Commons uses (public domain, CC BY / BY-SA / CC0, GFDL …). */
export function isFreeCommonsLicense(license: string | null): boolean {
	if (!license) return false;
	return /^(public domain|pd\b|cc0|cc[- ]by|cc[- ]zero|gfdl|attribution|copyrighted free use|no restrictions)/i.test(
		license.trim(),
	);
}

export function parseCommonsImageInfo(
	json: unknown,
	fileName: string,
): PhotoSuggestion | null {
	if (!json || typeof json !== "object") return null;
	const pages = (json as { query?: { pages?: Record<string, unknown> } }).query
		?.pages;
	if (!pages) return null;
	for (const page of Object.values(pages)) {
		const info = (
			page as {
				imageinfo?: Array<{
					thumburl?: string;
					url?: string;
					descriptionurl?: string;
					width?: number;
					height?: number;
					mime?: string;
					extmetadata?: Record<string, { value?: unknown }>;
				}>;
			}
		)?.imageinfo?.[0];
		if (!info) continue;
		if (info.mime && !/^image\/(jpeg|png|webp)$/.test(info.mime)) continue;
		const imageUrl = info.thumburl ?? info.url;
		if (!imageUrl || !/^https:\/\/upload\.wikimedia\.org\//.test(imageUrl)) {
			continue;
		}
		const meta = info.extmetadata ?? {};
		const license =
			stripHtml(meta.LicenseShortName?.value) ?? stripHtml(meta.License?.value);
		if (!isFreeCommonsLicense(license)) continue;
		return {
			fileName,
			sourceUrl:
				info.descriptionurl ??
				`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName.replace(/ /g, "_"))}`,
			imageUrl,
			credit: stripHtml(meta.Artist?.value) ?? stripHtml(meta.Credit?.value),
			license,
			licenseUrl: stripHtml(meta.LicenseUrl?.value),
			width: info.width ?? null,
			height: info.height ?? null,
		};
	}
	return null;
}

// ── Names ──────────────────────────────────────────────────────────────────

/** "J. R. R. Tolkien" → "Tolkien, J. R. R."; single names stay as they are. */
export function sortNameFor(name: string): string | null {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length < 2) return null;
	const SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/i;
	let end = parts.length;
	while (end > 1 && SUFFIX.test(parts[end - 1] ?? "")) end -= 1;
	const surname = parts[end - 1] ?? "";
	const rest = [...parts.slice(0, end - 1), ...parts.slice(end)];
	return `${surname}, ${rest.join(" ")}`;
}
