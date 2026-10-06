import { adminBookSortableFields } from "@bbrc/api/modules/admin/admin-book.listing";
import type { ListAdminBooksInput } from "@bbrc/api/modules/admin/admin-book.schema";
import {
	parseAsArrayOf,
	parseAsInteger,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { bookStatuses } from "@/lib/listing/books-listing";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";
import type { FieldLabels } from "@/lib/listing/labels";
import {
	booleanFilterParser,
	createRangeByParser,
	createSortByParser,
	rangeMaxParser,
	rangeMinParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export const adminBookSortByLabels = {
	createdAt: "Added",
	updatedAt: "Updated",
	title: "Title",
	pages: "Pages",
	averageRating: "Club rating",
	openLibraryRating: "OL rating",
	publishedIn: "Published",
	"feedbacks._count": "Feedbacks",
	"favorites._count": "Favorites",
	"shelfBooks._count": "Shelf adds",
	"postAttachments._count": "Post attachments",
	"polls._count": "Poll options",
} as const satisfies FieldLabels<(typeof adminBookSortableFields)[number]>;

export const adminBooksListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	limit: parseAsInteger.withDefault(20).withOptions({ shallow: false }),
	sortBy: createSortByParser(adminBookSortableFields).withOptions({
		shallow: false,
	}),
	sortDirection: sortDirectionParser.withOptions({ shallow: false }),
	rangeBy: createRangeByParser(["createdAt", "updatedAt"] as const).withOptions(
		{ shallow: false },
	),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(parseAsStringLiteral(bookStatuses)).withOptions({
		shallow: false,
	}),
	minOpenLibraryRating: parseAsInteger.withOptions({ shallow: false }),
	maxOpenLibraryRating: parseAsInteger.withOptions({ shallow: false }),
	minPages: parseAsInteger.withOptions({ shallow: false }),
	maxPages: parseAsInteger.withOptions({ shallow: false }),
	missingClubRating: booleanFilterParser.withOptions({ shallow: false }),
	missingOpenLibraryRating: booleanFilterParser.withOptions({ shallow: false }),
};

export function useAdminBooksListingSearchParams() {
	return useQueryStates(adminBooksListingSearchParams, { shallow: false });
}

export type AdminBooksListingSearchParams = ReturnType<
	typeof useAdminBooksListingSearchParams
>[0];

export function toAdminBooksListCallInput(
	params: AdminBooksListingSearchParams,
): ListAdminBooksInput {
	return buildListCallInput({
		search: params.search,
		page: params.page,
		limit: params.limit,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		minOpenLibraryRating: params.minOpenLibraryRating,
		maxOpenLibraryRating: params.maxOpenLibraryRating,
		minPages: params.minPages,
		maxPages: params.maxPages,
		missingClubRating: params.missingClubRating,
		missingOpenLibraryRating: params.missingOpenLibraryRating,
	}) as ListAdminBooksInput;
}
