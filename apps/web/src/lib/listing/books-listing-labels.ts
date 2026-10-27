import type {
	bookRangeableFields,
	bookSortableFields,
} from "@bbrc/api/modules/book/book.listing";
import { useTranslations } from "next-intl";
import type { FieldLabels } from "@/lib/listing/labels";

type SortField = (typeof bookSortableFields)[number];
type RangeField = (typeof bookRangeableFields)[number];

/** Sort, date-range and "your library" labels of the book list, in the page's language. */
export function useBookListingLabels() {
	const t = useTranslations("books");
	const sortBy: FieldLabels<SortField> & Record<string, string> = {
		createdAt: t("listing.sortBy.createdAt"),
		updatedAt: t("listing.sortBy.updatedAt"),
		title: t("listing.sortBy.title"),
		status: t("listing.sortBy.status"),
		pages: t("listing.sortBy.pages"),
		averageRating: t("listing.sortBy.averageRating"),
		openLibraryRating: t("listing.sortBy.openLibraryRating"),
		publishedIn: t("listing.sortBy.publishedIn"),
		"feedbacks._count": t("listing.sortBy.feedbacks"),
		"favorites._count": t("listing.sortBy.favorites"),
		"reads._count": t("listing.sortBy.reads"),
		"shelves._count": t("listing.sortBy.shelves"),
		"documents._count": t("listing.sortBy.documents"),
		viewCount: t("listing.sortBy.viewCount"),
		viewerCount: t("listing.sortBy.viewerCount"),
		readingNowCount: t("listing.sortBy.readingNowCount"),
		wishlistCount: t("listing.sortBy.wishlistCount"),
	};
	const rangeBy: FieldLabels<RangeField> & Record<string, string> = {
		createdAt: t("listing.rangeBy.createdAt"),
		updatedAt: t("listing.rangeBy.updatedAt"),
	};
	const viewer = {
		viewerRead: t("listing.viewer.viewerRead"),
		viewerFavorite: t("listing.viewer.viewerFavorite"),
		viewerReviewed: t("listing.viewer.viewerReviewed"),
		viewerWishlist: t("listing.viewer.viewerWishlist"),
		viewerReading: t("listing.viewer.viewerReading"),
	} as const;
	return { sortBy, rangeBy, viewer };
}
