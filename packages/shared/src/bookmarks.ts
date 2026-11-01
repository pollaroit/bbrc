/** Saved-item kinds in v1 (polymorphic table allows more later). */
export const BOOKMARK_RESOURCE_TYPES = ["post", "comment"] as const;
export type BookmarkResourceType = (typeof BOOKMARK_RESOURCE_TYPES)[number];

export const BOOKMARK_LIST_TYPES = ["all", ...BOOKMARK_RESOURCE_TYPES] as const;
export type BookmarkListType = (typeof BOOKMARK_LIST_TYPES)[number];

export const BOOKMARK_SORT_FIELDS = [
	"bookmarkedAt",
	"resourceCreatedAt",
] as const;
export type BookmarkSortField = (typeof BOOKMARK_SORT_FIELDS)[number];

export const BOOKMARK_SORT_FIELD_LABELS: Record<BookmarkSortField, string> = {
	bookmarkedAt: "When you saved it",
	resourceCreatedAt: "When it was posted",
};
