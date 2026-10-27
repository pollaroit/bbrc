import type { Formatters } from "@bbrc/i18n";
/** Minimum club feedback count before we show club average instead of Open Library. */
export const MIN_CLUB_RATINGS_FOR_CARD = 1;

type BookCardRatingSource = {
	openLibraryRating?: number | null;
	averageRating?: number | null;
	feedbackCount: number;
};

export function bookCardRatingDisplay(
	book: BookCardRatingSource,
	f: Formatters,
): { value: string; suffix: "CR" | "OL" } | null {
	if (
		book.feedbackCount >= MIN_CLUB_RATINGS_FOR_CARD &&
		book.averageRating != null
	) {
		return { value: f.rating(book.averageRating), suffix: "CR" };
	}

	if (book.openLibraryRating != null) {
		return { value: f.rating(book.openLibraryRating), suffix: "OL" };
	}

	return null;
}
