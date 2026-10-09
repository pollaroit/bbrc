export const GLOBAL_SEARCH_PER_TYPE_LIMIT = 4;
export const GLOBAL_SEARCH_MAX_ITEMS = 10;

export function previewText(value: string, maxLength = 120): string {
	const normalized = value.replace(/\s+/g, " ").trim();
	if (normalized.length <= maxLength) {
		return normalized;
	}

	return `${normalized.slice(0, maxLength - 1)}…`;
}

export function shuffleInPlace<T>(items: T[]): void {
	for (let i = items.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		const current = items[i];
		const swap = items[j];
		if (current === undefined || swap === undefined) {
			continue;
		}
		items[i] = swap;
		items[j] = current;
	}
}
