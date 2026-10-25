export const bookCoverFrameClassName =
	"overflow-hidden bg-muted ring-1 ring-foreground/10";

/**
 * A cover id above zero is an Open Library cover. Below zero it is a cover an
 * admin uploaded; `/api/covers/<n>` serves it (every upload has its own id).
 */
export function bookCoverUrl(
	coverId: number | null | undefined,
	size: "S" | "M" | "L" = "M",
) {
	if (coverId == null) {
		return null;
	}

	if (coverId < 0) {
		return `/api/covers/${-coverId}`;
	}

	return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

/** The fixed shape of every book cover (width : height). */
export const BOOK_COVER_ASPECT = 2 / 3;
/** Uploaded covers are always saved at this size (px), so they all look alike. */
export const BOOK_COVER_UPLOAD_SIZE = { width: 600, height: 900 } as const;

export function formatBookAuthors(authors: string[]) {
	if (authors.length === 0) {
		return "Unknown author";
	}

	if (authors.length === 1) {
		return authors[0];
	}

	if (authors.length === 2) {
		return `${authors[0]} & ${authors[1]}`;
	}

	return `${authors[0]} et al.`;
}

export function formatBookSeriesCardLabel(series: {
	title: string;
	position: number;
}): string {
	const title = series.title.trim();
	if (!Number.isFinite(series.position) || series.position < 1) {
		return title;
	}
	return `#${series.position} ${title}`;
}
