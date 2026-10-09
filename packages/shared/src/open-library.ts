const WORK_OLID_PATTERN = /^OL\d+W$/i;
const WORK_KEY_PATTERN = /\/works\/(OL\d+W)\/?$/i;
const EDITION_OLID_PATTERN = /^OL\d+M$/i;
const EDITION_KEY_PATTERN = /\/books\/(OL\d+M)\/?$/i;

/** Normalize an Open Library work key or OLID to canonical form (e.g. `OL82563W`). */
export function openLibraryWorkKeyToOlid(workKey: string): string | null {
	const trimmed = workKey.trim();
	if (!trimmed) {
		return null;
	}

	if (WORK_OLID_PATTERN.test(trimmed)) {
		return trimmed.toUpperCase();
	}

	const match = trimmed.match(WORK_KEY_PATTERN);
	return match?.[1]?.toUpperCase() ?? null;
}

export function isOpenLibraryOlid(value: string): boolean {
	return WORK_OLID_PATTERN.test(value.trim());
}

/** Normalize an Open Library edition key or edition OLID (e.g. `OL123456M`). */
export function openLibraryEditionKeyToOlid(editionKey: string): string | null {
	const trimmed = editionKey.trim();
	if (!trimmed) {
		return null;
	}

	if (EDITION_OLID_PATTERN.test(trimmed)) {
		return trimmed.toUpperCase();
	}

	const match = trimmed.match(EDITION_KEY_PATTERN);
	return match?.[1]?.toUpperCase() ?? null;
}

export function isOpenLibraryEditionOlid(value: string): boolean {
	return EDITION_OLID_PATTERN.test(value.trim());
}

/** Public Open Library edition page for an edition OLID or `/books/OL…M` key. */
export function openLibraryEditionPageUrl(
	olidOrEditionKey: string,
): string | null {
	const olid = openLibraryEditionKeyToOlid(olidOrEditionKey);
	if (!olid) {
		return null;
	}

	return `https://openlibrary.org/books/${olid}`;
}

/** Public Open Library work page for a work OLID or `/works/OL…W` key. */
export function openLibraryWorkPageUrl(olidOrWorkKey: string): string | null {
	const olid = openLibraryWorkKeyToOlid(olidOrWorkKey);
	if (!olid) {
		return null;
	}

	return `https://openlibrary.org/works/${olid}`;
}

const OPEN_LIBRARY_EXCERPT_MAX_LENGTH = 4000;

function truncateOpenLibraryExcerpt(text: string): string {
	if (text.length <= OPEN_LIBRARY_EXCERPT_MAX_LENGTH) {
		return text;
	}

	return `${text.slice(0, OPEN_LIBRARY_EXCERPT_MAX_LENGTH - 1).trimEnd()}…`;
}

/** Parse Open Library work `description` (string or `{ value }`) for catalog excerpts. */
export function parseOpenLibraryDescription(
	description: unknown,
): string | null {
	if (description == null) {
		return null;
	}

	if (typeof description === "string") {
		const trimmed = description.trim();
		return trimmed ? truncateOpenLibraryExcerpt(trimmed) : null;
	}

	if (typeof description === "object" && "value" in description) {
		const value = (description as { value?: unknown }).value;
		if (typeof value === "string") {
			const trimmed = value.trim();
			return trimmed ? truncateOpenLibraryExcerpt(trimmed) : null;
		}
	}

	return null;
}
