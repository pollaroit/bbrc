export const feedbackListSortFields = ["createdAt", "rating"] as const;

export type FeedbackListSortField = (typeof feedbackListSortFields)[number];

export type FeedbackListSortDirection = "asc" | "desc";

export const feedbackListSortLabels: Record<FeedbackListSortField, string> = {
	createdAt: "Date added",
	rating: "Rating",
};

export const DEFAULT_FEEDBACK_LIST_SORT: FeedbackListSortField = "createdAt";

export const DEFAULT_FEEDBACK_LIST_SORT_DIRECTION: FeedbackListSortDirection =
	"desc";

type SortableFeedback = {
	createdAt: Date | string;
	rating: number;
};

export function sortFeedbackListItems<T extends SortableFeedback>(
	items: T[],
	sortBy: FeedbackListSortField,
	sortDirection: FeedbackListSortDirection,
): T[] {
	const sign = sortDirection === "asc" ? 1 : -1;

	return items.toSorted((a, b) => {
		if (sortBy === "rating") {
			if (a.rating !== b.rating) {
				return sign * (a.rating - b.rating);
			}
			const aTime = new Date(a.createdAt).getTime();
			const bTime = new Date(b.createdAt).getTime();
			return bTime - aTime;
		}

		const aTime = new Date(a.createdAt).getTime();
		const bTime = new Date(b.createdAt).getTime();
		if (aTime !== bTime) {
			return sign * (aTime - bTime);
		}
		return b.rating - a.rating;
	});
}
