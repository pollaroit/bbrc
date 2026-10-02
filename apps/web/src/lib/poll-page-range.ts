export function formatPollPageRange(
	minPages: number | null | undefined,
	maxPages: number | null | undefined,
): string {
	const min = minPages ?? null;
	const max = maxPages ?? null;

	if (min == null && max == null) {
		return "No page range";
	}

	if (min != null && max == null) {
		return `> ${min}`;
	}

	if (min == null && max != null) {
		return `< ${max}`;
	}

	return `${min} - ${max}`;
}
