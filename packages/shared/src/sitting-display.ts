export type SittingDisplayStatus = "voting" | "reading" | "finished";

/** Human label from sitting slug (underscores → spaces). */
export function formatSittingSlugLabel(slug: string): string {
	return slug.replaceAll("_", " ");
}

/** Display title: slug label, plus `[Book title]` once a book is selected (reading/finished). */
export function formatSittingDisplayName(
	slug: string,
	status: SittingDisplayStatus,
	selectedBookTitle?: string | null,
): string {
	const base = formatSittingSlugLabel(slug);
	if (status === "voting") {
		return base;
	}
	const title = selectedBookTitle?.trim();
	if (!title) {
		return base;
	}
	return `${base} [${title}]`;
}
