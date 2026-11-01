import {
	BOOKMARK_LIST_TYPES,
	BOOKMARK_SORT_FIELD_LABELS,
	BOOKMARK_SORT_FIELDS,
	type BookmarkListType,
	type BookmarkSortField,
} from "@bbrc/shared";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import type { FieldLabels } from "@/lib/listing/labels";
import {
	createSortByParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export const bookmarkSortByLabels =
	BOOKMARK_SORT_FIELD_LABELS satisfies FieldLabels<BookmarkSortField>;

export const bookmarkTypeLabels: Record<BookmarkListType, string> = {
	all: "All",
	post: "Posts",
	comment: "Comments",
};

export const bookmarksListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	type: parseAsStringLiteral(BOOKMARK_LIST_TYPES)
		.withDefault("all")
		.withOptions({ shallow: false, clearOnDefault: true }),
	sortBy: createSortByParser(BOOKMARK_SORT_FIELDS)
		.withDefault("bookmarkedAt")
		.withOptions({ shallow: false, clearOnDefault: true }),
	sortDirection: sortDirectionParser
		.withDefault("desc")
		.withOptions({ shallow: false, clearOnDefault: true }),
};

export type BookmarksListingState = {
	search: string | null;
	type: BookmarkListType;
	sortBy: BookmarkSortField;
	sortDirection: "asc" | "desc";
};

export function useBookmarksListingSearchParams() {
	return useQueryStates(bookmarksListingSearchParams, { shallow: false });
}

export function bookmarksListInput(
	username: string,
	state: BookmarksListingState,
	cursor?: string,
) {
	return {
		username,
		limit: 24,
		type: state.type,
		sortBy: state.sortBy,
		sortDirection: state.sortDirection,
		...(state.search?.trim() ? { search: state.search.trim() } : {}),
		...(cursor != null ? { cursor } : {}),
	};
}
