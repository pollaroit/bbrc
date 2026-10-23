/** Per type; the final list is ranked by match quality and capped overall. */
export const GLOBAL_SEARCH_PER_TYPE_LIMIT = 3;
export const GLOBAL_SEARCH_MAX_ITEMS = 14;
/** Used when the search is narrowed to one kind of item. */
export const GLOBAL_SEARCH_NARROW_LIMIT = 10;

export function previewText(value: string, maxLength = 120): string {
	const normalized = value.replace(/\s+/g, " ").trim();
	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 1)}…`;
}

/** 0 = exact title, 1 = title prefix, 2 = title contains, 3 = matched elsewhere. */
export function matchScore(title: string, query: string): number {
	const normalizedTitle = title.trim().toLowerCase();
	const normalizedQuery = query.trim().toLowerCase();
	if (normalizedTitle === normalizedQuery) {
		return 0;
	}
	if (normalizedTitle.startsWith(normalizedQuery)) {
		return 1;
	}
	return normalizedTitle.includes(normalizedQuery) ? 2 : 3;
}
