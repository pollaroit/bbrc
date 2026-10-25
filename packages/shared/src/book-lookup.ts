import {
	openLibraryEditionKeyToOlid,
	openLibraryWorkKeyToOlid,
} from "./open-library";

/**
 * What a member typed or pasted into the book search bar. A link or an ISBN
 * points straight at one book; anything else is a normal title search.
 */
export type BookLookup =
	/** A work id (`OL82563W`) or an openlibrary.org/works/… link. */
	| { kind: "olid"; olid: string }
	/** An edition id (`OL123456M`) or an openlibrary.org/books/… link. */
	| { kind: "edition"; editionOlid: string }
	/** A valid ISBN-10 or ISBN-13, digits only (a trailing X stays upper case). */
	| { kind: "isbn"; isbn: string }
	/** A Goodreads link: the title is read from the address, then searched. */
	| { kind: "goodreads"; query: string }
	| { kind: "text"; query: string };

/** Keeps digits and a trailing X; everything else (hyphens, spaces) goes. */
export function normalizeIsbn(value: string): string {
	return value.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidIsbn10(value: string): boolean {
	const isbn = normalizeIsbn(value);
	if (!/^\d{9}[\dX]$/.test(isbn)) return false;
	let sum = 0;
	for (let index = 0; index < 10; index++) {
		const char = isbn[index] as string;
		const digit = char === "X" ? 10 : Number(char);
		sum += digit * (10 - index);
	}
	return sum % 11 === 0;
}

export function isValidIsbn13(value: string): boolean {
	const isbn = normalizeIsbn(value);
	if (!/^\d{13}$/.test(isbn)) return false;
	let sum = 0;
	for (let index = 0; index < 12; index++) {
		sum += Number(isbn[index]) * (index % 2 === 0 ? 1 : 3);
	}
	return (10 - (sum % 10)) % 10 === Number(isbn[12]);
}

export function isValidIsbn(value: string): boolean {
	return isValidIsbn13(value) || isValidIsbn10(value);
}

/** Title words from a Goodreads address such as `/book/show/5470.1984` or `/book/show/5470-the-great-gatsby`. */
function goodreadsTitle(pathname: string): string | null {
	const match = pathname.match(/\/book\/show\/\d+(?:[.\-_]+([^/?#]+))?/i);
	const slug = match?.[1];
	if (!slug) return null;
	const words = decodeURIComponent(slug)
		.replace(/[._-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return words.length >= 2 ? words : null;
}

function parseUrl(input: string): URL | null {
	const candidate = /^https?:\/\//i.test(input)
		? input
		: /^(www\.)?(openlibrary\.org|goodreads\.com)\//i.test(input)
			? `https://${input}`
			: null;
	if (!candidate) return null;
	try {
		return new URL(candidate);
	} catch {
		return null;
	}
}

export function parseBookLookup(raw: string): BookLookup {
	const input = raw.trim();
	if (!input) return { kind: "text", query: "" };

	const url = parseUrl(input);
	if (url) {
		const host = url.hostname.replace(/^www\./, "").toLowerCase();
		if (host === "openlibrary.org") {
			const path = url.pathname;
			const work = path.match(/\/works\/(OL\d+W)/i);
			if (work?.[1]) {
				return { kind: "olid", olid: work[1].toUpperCase() };
			}
			const edition = path.match(/\/books\/(OL\d+M)/i);
			if (edition?.[1]) {
				return { kind: "edition", editionOlid: edition[1].toUpperCase() };
			}
			const isbn = path.match(/\/isbn\/([\dXx-]+)/);
			if (isbn?.[1] && isValidIsbn(isbn[1])) {
				return { kind: "isbn", isbn: normalizeIsbn(isbn[1]) };
			}
		}
		if (host === "goodreads.com") {
			const title = goodreadsTitle(url.pathname);
			if (title) return { kind: "goodreads", query: title };
		}
		return { kind: "text", query: input };
	}

	const bare = input.replace(/^isbn(?:-1[03])?[:\s]*/i, "");
	if (/^[\d\s-]+[\dXx]?$/.test(bare) && isValidIsbn(bare)) {
		return { kind: "isbn", isbn: normalizeIsbn(bare) };
	}

	const work = openLibraryWorkKeyToOlid(input);
	if (work && /^OL\d+W$/i.test(input)) return { kind: "olid", olid: work };
	const edition = openLibraryEditionKeyToOlid(input);
	if (edition && /^OL\d+M$/i.test(input)) {
		return { kind: "edition", editionOlid: edition };
	}

	return { kind: "text", query: input };
}

/** True when the text names one specific book (anything but a plain search). */
export function isDirectBookLookup(lookup: BookLookup): boolean {
	return lookup.kind !== "text" && lookup.kind !== "goodreads";
}

/** One title per line, without bullets or numbering, blanks and repeats removed. */
export function parseTitleList(text: string, max = 50): string[] {
	const seen = new Set<string>();
	const titles: string[] = [];
	for (const line of text.split(/\r?\n/)) {
		const title = line
			.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")
			.replace(/\s+/g, " ")
			.trim();
		if (title.length < 2 || title.length > 200) continue;
		const key = title.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		titles.push(title);
		if (titles.length >= max) break;
	}
	return titles;
}
