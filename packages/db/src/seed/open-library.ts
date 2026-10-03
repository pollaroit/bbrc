import {
	generateUniqueSlug,
	openLibraryWorkKeyToOlid,
	parseOpenLibraryDescription,
} from "@bbrc/shared";
import type { BookStatus } from "../../prisma/generated/client.js";
import type { DatabaseTransaction } from "../index.js";

const BOOK_SLUG_MIN_LENGTH = 3;

async function generateCatalogBookSlug(
	title: string,
	tx: DatabaseTransaction,
): Promise<string> {
	const seeds = [title.trim(), `book-${title.trim()}`, "book-club"];

	for (const seed of seeds) {
		if (!seed) {
			continue;
		}

		try {
			const slug = await generateUniqueSlug(seed, async (candidate) => {
				return (
					(await tx.book.findUnique({ where: { slug: candidate } })) == null
				);
			});

			if (slug.length >= BOOK_SLUG_MIN_LENGTH) {
				return slug;
			}
		} catch {}
	}

	throw new Error(`Failed to generate catalog slug for "${title}"`);
}

export type OpenLibraryWorkSeed = {
	workKey: string;
	olid: string;
	title: string;
	authors: string[];
	coverId: number | null;
	publishedIn: number;
	pages: number;
	openLibraryRating: number | null;
	excerpt: string | null;
	subjectPeople: string[];
	subjectTimes: string[];
	subjects: string[];
};

const SEARCH_QUERIES = [
	"1984 Orwell",
	"Fahrenheit 451",
	"Brave New World",
	"To Kill a Mockingbird",
	"Pride and Prejudice",
	"The Great Gatsby",
	"Moby Dick",
	"Crime and Punishment",
	"The Odyssey",
	"Frankenstein",
	"Dracula",
	"Jane Eyre",
	"Wuthering Heights",
	"The Hobbit",
	"Dune Herbert",
	"Neuromancer",
	"Beloved Morrison",
	"The Handmaid's Tale",
	"Slaughterhouse-Five",
	"One Hundred Years of Solitude",
] as const;

/** Extra queries for pending book requests (not used for catalog seed count). */
export const BOOK_REQUEST_SEARCH_QUERIES = [
	"The Catcher in the Rye",
	"Catch-22 Heller",
	"Don Quixote",
] as const;

type SearchDoc = {
	key?: string;
	title?: string;
	author_name?: string[];
	cover_i?: number;
	first_publish_year?: number;
	first_sentence?: string | string[];
};

type EditionEntry = {
	number_of_pages?: number;
	languages?: Array<{ key?: string } | string>;
};

type WorkDocument = {
	description?: unknown;
	subjects?: unknown[];
	subject_people?: unknown[];
	subject_times?: unknown[];
};

function normalizeSubjectEntry(entry: unknown): string | null {
	if (typeof entry === "string") {
		const trimmed = entry.trim();
		return trimmed ? trimmed : null;
	}

	if (entry != null && typeof entry === "object" && "name" in entry) {
		const name = (entry as { name?: unknown }).name;
		if (typeof name === "string") {
			const trimmed = name.trim();
			return trimmed ? trimmed : null;
		}
	}

	return null;
}

function normalizeSubjectList(values: unknown[] | undefined): string[] {
	if (!values?.length) {
		return [];
	}

	const seen = new Set<string>();
	const result: string[] = [];

	for (const entry of values) {
		const normalized = normalizeSubjectEntry(entry);
		if (!normalized) {
			continue;
		}

		const key = normalized.toLowerCase();
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		result.push(normalized);
	}

	return result;
}

async function fetchWorkDocument(workKey: string): Promise<WorkDocument> {
	return (
		(await fetchJson<WorkDocument>(`https://openlibrary.org${workKey}.json`)) ??
		{}
	);
}

function median(values: number[]): number | null {
	if (values.length === 0) {
		return null;
	}

	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);

	if (sorted.length % 2 === 0) {
		const left = sorted[mid - 1];
		const right = sorted[mid];
		if (left === undefined || right === undefined) {
			return null;
		}

		return Math.round((left + right) / 2);
	}

	return sorted[mid] ?? null;
}

function isTurkishEdition(edition: EditionEntry): boolean {
	if (!edition.languages?.length) {
		return false;
	}

	return edition.languages.some((language) => {
		const key = typeof language === "string" ? language : language.key;
		return key?.includes("/languages/tur") ?? false;
	});
}

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

async function fetchWorkPages(workKey: string): Promise<number> {
	const editions = await fetchJson<{ entries?: EditionEntry[] }>(
		`https://openlibrary.org${workKey}/editions.json?limit=50`,
	);

	const turkishPages: number[] = [];
	const otherPages: number[] = [];

	for (const entry of editions?.entries ?? []) {
		const pages = entry.number_of_pages;
		if (pages == null || pages < 1) {
			continue;
		}

		if (isTurkishEdition(entry)) {
			turkishPages.push(pages);
		} else {
			otherPages.push(pages);
		}
	}

	const preferred = turkishPages.length > 0 ? turkishPages : otherPages;
	return median(preferred) ?? 280;
}

async function fetchWorkRating(workKey: string): Promise<number | null> {
	const ratings = await fetchJson<{
		summary?: { average?: number; count?: number };
	}>(`https://openlibrary.org${workKey}/ratings.json`);

	if (!ratings?.summary?.count || ratings.summary.count < 1) {
		return null;
	}

	const average = ratings.summary.average;
	if (average == null || average < 0 || average > 5) {
		return null;
	}

	return Math.round(average * 10) / 10;
}

function parseSearchExcerpt(doc: SearchDoc): string | null {
	if (typeof doc.first_sentence === "string" && doc.first_sentence.trim()) {
		return doc.first_sentence.trim().slice(0, 4000);
	}

	if (Array.isArray(doc.first_sentence)) {
		const joined = doc.first_sentence.join(" ").trim();
		if (joined) {
			return joined.slice(0, 4000);
		}
	}

	return null;
}

function clampPublishedYear(year: number): number {
	const currentYear = new Date().getFullYear();
	if (year < 0) {
		return 2000;
	}

	return Math.min(year, currentYear);
}

export async function searchOpenLibraryWorkByQuery(
	query: string,
): Promise<OpenLibraryWorkSeed | null> {
	const url = new URL("https://openlibrary.org/search.json");
	url.searchParams.set("q", query);
	url.searchParams.set("limit", "1");
	url.searchParams.set(
		"fields",
		"key,title,author_name,cover_i,first_publish_year,first_sentence",
	);

	const payload = await fetchJson<{ docs?: SearchDoc[] }>(url.toString());
	const doc = payload?.docs?.[0];

	if (!doc?.key || !doc.title?.trim()) {
		return null;
	}

	const olid = openLibraryWorkKeyToOlid(doc.key);
	if (!olid) {
		return null;
	}

	const authors =
		doc.author_name?.map((name) => name.trim()).filter(Boolean) ?? [];

	if (authors.length === 0) {
		authors.push("Unknown Author");
	}

	const [pages, openLibraryRating, workDocument] = await Promise.all([
		fetchWorkPages(doc.key),
		fetchWorkRating(doc.key),
		fetchWorkDocument(doc.key),
	]);

	const excerpt =
		parseOpenLibraryDescription(workDocument.description) ??
		parseSearchExcerpt(doc);

	return {
		workKey: doc.key,
		olid,
		title: doc.title.trim(),
		authors,
		coverId: doc.cover_i ?? null,
		publishedIn: clampPublishedYear(doc.first_publish_year ?? 2000),
		pages,
		openLibraryRating,
		excerpt,
		subjectPeople: normalizeSubjectList(workDocument.subject_people),
		subjectTimes: normalizeSubjectList(workDocument.subject_times),
		subjects: normalizeSubjectList(workDocument.subjects),
	};
}

export async function fetchOpenLibraryBooks(
	count: number,
): Promise<OpenLibraryWorkSeed[]> {
	const works: OpenLibraryWorkSeed[] = [];
	const seenOlids = new Set<string>();

	for (const query of SEARCH_QUERIES) {
		if (works.length >= count) {
			break;
		}

		const work = await searchOpenLibraryWorkByQuery(query);
		if (!work || seenOlids.has(work.olid)) {
			continue;
		}

		seenOlids.add(work.olid);
		works.push(work);
	}

	if (works.length < count) {
		throw new Error(
			`Open Library returned only ${works.length}/${count} books. Check network access.`,
		);
	}

	return works.slice(0, count);
}

export async function createBookFromWork(
	tx: DatabaseTransaction,
	work: OpenLibraryWorkSeed,
	status: BookStatus,
	createdAt: Date,
) {
	const slug = await generateCatalogBookSlug(work.title, tx);

	return tx.book.create({
		data: {
			title: work.title,
			slug,
			authors: work.authors,
			pages: work.pages,
			status,
			openLibraryRating: work.openLibraryRating,
			publishedIn: work.publishedIn,
			coverId: work.coverId,
			excerpt: work.excerpt,
			olid: work.olid,
			subjectPeople: work.subjectPeople,
			subjectTimes: work.subjectTimes,
			subjects: work.subjects,
			createdAt,
			updatedAt: createdAt,
		},
	});
}
