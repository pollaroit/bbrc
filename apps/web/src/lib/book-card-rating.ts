/** Minimum club feedback count before we show club average instead of Open Library. */
export const MIN_CLUB_RATINGS_FOR_CARD = 2;

type BookCardRatingSource = {
	openLibraryRating?: number | null;
	averageRating?: number | null;
	feedbackCount: number;
};

export function bookCardRatingDisplay(
	book: BookCardRatingSource,
): { value: string; suffix: "CR" | "OL" } | null {
	if (
		book.feedbackCount >= MIN_CLUB_RATINGS_FOR_CARD &&
		book.averageRating != null
	) {
		return { value: book.averageRating.toFixed(1), suffix: "CR" };
	}

	if (book.openLibraryRating != null) {
		return { value: book.openLibraryRating.toFixed(1), suffix: "OL" };
	}

	return null;
}
