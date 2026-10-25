/** A page count that is plausible for a printed book. */
export const MIN_PLAUSIBLE_BOOK_PAGES = 8;
export const MAX_PLAUSIBLE_BOOK_PAGES = 3000;

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) return sorted[mid] ?? null;
	const left = sorted[mid - 1];
	const right = sorted[mid];
	return left == null || right == null ? null : Math.round((left + right) / 2);
}

/**
 * Pages to prefill when the work has none: the edition median Open Library
 * gave us, or the median of the sample of edition counts, ignoring zero and
 * absurd values (a 1-page pamphlet, a 40,000-page box set).
 */
export function pagesFromEditions(hints: {
	suggestedPages?: number | null;
	pageCountHints?: readonly number[] | null;
}): number | null {
	const plausible = (value: number | null | undefined): value is number =>
		value != null &&
		Number.isFinite(value) &&
		value >= MIN_PLAUSIBLE_BOOK_PAGES &&
		value <= MAX_PLAUSIBLE_BOOK_PAGES;

	if (plausible(hints.suggestedPages)) {
		return Math.round(hints.suggestedPages);
	}
	return median((hints.pageCountHints ?? []).filter(plausible));
}
