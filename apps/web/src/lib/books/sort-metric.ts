import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import type { Formatters } from "@bbrc/i18n";
import { bookCardRatingDisplay } from "@/lib/book-card-rating";

type BookListItem = GetBookListOutput["items"][number];

export type BookSortMetric = {
	label: string;
	value: string;
	/** A natural page for the figure, when there is one. */
	href?: string;
};

/**
 * The figure the list is sorted by, when it is not already visible on the card.
 * It goes in the card's top strip (like the people cards). Sorts whose number is
 * already on the card (pages, year, reviews, favorites, reads, shelves, documents,
 * views) return null.
 */
export function bookSortMetric(
	book: BookListItem,
	sortBy: string | undefined,
	f: Formatters,
): BookSortMetric | null {
	switch (sortBy) {
		case "createdAt":
			return {
				label: "Added",
				value: f.dateWith(book.createdAt, {
					month: "short",
					day: "numeric",
					year: "numeric",
				}),
			};
		case "updatedAt":
			return {
				label: "Updated",
				value: f.dateWith(book.updatedAt, {
					month: "short",
					day: "numeric",
					year: "numeric",
				}),
			};
		case "averageRating": {
			// The card shows the club rating when it has one, otherwise Open Library's.
			if (bookCardRatingDisplay(book, f)?.suffix === "CR") return null;
			return {
				label: "Club rating",
				value: book.averageRating != null ? f.rating(book.averageRating) : "—",
				href: `/books/${book.slug}/reviews`,
			};
		}
		case "openLibraryRating": {
			if (bookCardRatingDisplay(book, f)?.suffix === "OL") return null;
			return {
				label: "Open Library",
				value:
					book.openLibraryRating != null
						? f.rating(book.openLibraryRating)
						: "—",
			};
		}
		case "viewerCount":
			return {
				label: "Viewers",
				value: String(book.viewerCount),
				href: `/books/${book.slug}/insights`,
			};
		case "readingNowCount":
			return {
				label: "Reading now",
				value: String(book.readingNowCount),
				href: `/books/${book.slug}/reading`,
			};
		case "wishlistCount":
			return { label: "Wishlisted", value: String(book.wishlistCount) };
		default:
			return null;
	}
}
