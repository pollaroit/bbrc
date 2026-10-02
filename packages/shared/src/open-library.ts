const OLID_PATTERN = /^OL\d+W$/i;
const WORK_KEY_PATTERN = /\/works\/(OL\d+W)\/?$/i;

/** Normalize an Open Library work key or OLID to canonical form (e.g. `OL82563W`). */
export function openLibraryWorkKeyToOlid(workKey: string): string | null {
	const trimmed = workKey.trim();
	if (!trimmed) {
		return null;
	}

	if (OLID_PATTERN.test(trimmed)) {
		return trimmed.toUpperCase();
	}

	const match = trimmed.match(WORK_KEY_PATTERN);
	return match?.[1]?.toUpperCase() ?? null;
}

export function isOpenLibraryOlid(value: string): boolean {
	return OLID_PATTERN.test(value.trim());
}
