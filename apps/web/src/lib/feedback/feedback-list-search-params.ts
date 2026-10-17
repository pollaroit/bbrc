import { parseAsStringLiteral, useQueryStates } from "nuqs";
import {
	DEFAULT_FEEDBACK_LIST_SORT,
	DEFAULT_FEEDBACK_LIST_SORT_DIRECTION,
	type FeedbackListSortDirection,
	type FeedbackListSortField,
	feedbackListSortFields,
} from "@/lib/feedback/list-sort";
import {
	FEEDBACK_MIN_RATING_FILTER_OPTIONS,
	parseFeedbackMinRatingFilter,
} from "@/lib/feedback/rating-filter";
import { createSortByParser, sortDirectionParser } from "@/lib/listing/parsers";

const feedbackMinRatingFilterValues = FEEDBACK_MIN_RATING_FILTER_OPTIONS.map(
	(option) => option.value,
) as [string, ...string[]];

const urlOptions = { shallow: false as const, clearOnDefault: true };

export const feedbackListSearchParams = {
	feedbackMinRating: parseAsStringLiteral(feedbackMinRatingFilterValues)
		.withDefault("all")
		.withOptions(urlOptions),
	sortBy: createSortByParser(feedbackListSortFields)
		.withDefault(DEFAULT_FEEDBACK_LIST_SORT)
		.withOptions(urlOptions),
	sortDirection: sortDirectionParser
		.withDefault(DEFAULT_FEEDBACK_LIST_SORT_DIRECTION)
		.withOptions(urlOptions),
};

export function useFeedbackListSearchParams() {
	return useQueryStates(feedbackListSearchParams);
}

type FeedbackListSearchParamsSnapshot = ReturnType<
	typeof useFeedbackListSearchParams
>[0];

export function feedbackListParamsToQuery(
	params: FeedbackListSearchParamsSnapshot,
) {
	const minRatingFilter = params.feedbackMinRating ?? "all";
	const sortBy = params.sortBy ?? DEFAULT_FEEDBACK_LIST_SORT;
	const sortDirection =
		params.sortDirection ?? DEFAULT_FEEDBACK_LIST_SORT_DIRECTION;

	return {
		minRating: parseFeedbackMinRatingFilter(minRatingFilter),
		minRatingFilter,
		sortBy: sortBy as FeedbackListSortField,
		sortDirection: sortDirection as FeedbackListSortDirection,
	};
}

export function isDefaultFeedbackListParams(
	query: ReturnType<typeof feedbackListParamsToQuery>,
): boolean {
	return (
		query.minRating === undefined &&
		query.sortBy === DEFAULT_FEEDBACK_LIST_SORT &&
		query.sortDirection === DEFAULT_FEEDBACK_LIST_SORT_DIRECTION
	);
}
