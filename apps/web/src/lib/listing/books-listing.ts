import {
	bookRangeableFields,
	bookSortableFields,
} from "@bbrc/api/modules/book/book.listing";
import type { GetBookListInput } from "@bbrc/api/modules/book/book.schema";
import {
	parseAsArrayOf,
	parseAsFloat,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";
import type { FieldLabels } from "@/lib/listing/labels";
import {
	createRangeByParser,
	createSortByParser,
	rangeMaxParser,
	rangeMinParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export const bookStatuses = ["completed", "reading", "wishlist"] as const;

export type BookListingStatus = (typeof bookStatuses)[number];

export const bookSortByLabels = {
	createdAt: "Date added",
	updatedAt: "Last updated",
	title: "Title",
	averageRating: "Club rating",
	openLibraryRating: "Open Library rating",
	publishedIn: "Publication year",
	"feedbacks._count": "Feedbacks",
	"favorites._count": "Favorites",
} as const satisfies FieldLabels<(typeof bookSortableFields)[number]>;

export const bookRangeByLabels = {
	createdAt: "Date added",
	updatedAt: "Last updated",
} as const satisfies FieldLabels<(typeof bookRangeableFields)[number]>;

export const bookStatusFilterLabels = {
	completed: "Completed",
	reading: "Reading",
	wishlist: "Wishlist",
} as const satisfies FieldLabels<BookListingStatus>;

export const bookListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	sortBy: createSortByParser(bookSortableFields).withOptions({
		shallow: false,
	}),
	sortDirection: sortDirectionParser.withOptions({ shallow: false }),
	rangeBy: createRangeByParser(bookRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(parseAsStringLiteral(bookStatuses)).withOptions({
		shallow: false,
	}),
	minOpenLibraryRating: parseAsFloat.withOptions({ shallow: false }),
	maxOpenLibraryRating: parseAsFloat.withOptions({ shallow: false }),
};

export function useBookListingSearchParams() {
	return useQueryStates(bookListingSearchParams, { shallow: false });
}

export type BookListingSearchParams = ReturnType<
	typeof useBookListingSearchParams
>[0];

export function toBookListCallInput(
	params: BookListingSearchParams,
): Partial<GetBookListInput> {
	return buildListCallInput({
		search: params.search,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		minOpenLibraryRating: params.minOpenLibraryRating,
		maxOpenLibraryRating: params.maxOpenLibraryRating,
		limit: 24,
	}) as Partial<GetBookListInput>;
}

export function countBookSheetFilters(params: BookListingSearchParams): number {
	let count = 0;

	if (params.statuses && params.statuses.length > 0) {
		count += 1;
	}

	if (
		params.minOpenLibraryRating != null ||
		params.maxOpenLibraryRating != null
	) {
		count += 1;
	}

	if (params.rangeMin != null || params.rangeMax != null) {
		count += 1;
	}

	return count;
}

export function clearBookSheetFilters(
	setParams: ReturnType<typeof useBookListingSearchParams>[1],
) {
	void setParams({
		statuses: null,
		minOpenLibraryRating: null,
		maxOpenLibraryRating: null,
		rangeBy: null,
		rangeMin: null,
		rangeMax: null,
	});
}
