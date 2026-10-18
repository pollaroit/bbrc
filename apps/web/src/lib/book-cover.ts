export const bookCoverFrameClassName =
	"overflow-hidden bg-muted ring-1 ring-foreground/10";

export function bookCoverUrl(
	coverId: number | null | undefined,
	size: "S" | "M" | "L" = "M",
) {
	if (coverId == null) {
		return null;
	}

	return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

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
