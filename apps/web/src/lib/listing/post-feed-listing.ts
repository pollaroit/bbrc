import type { GetPostListInput } from "@bbrc/api/modules/post/post.schema";
import {
	type PostFeedRange,
	type PostFeedSort,
	postFeedRangeValues,
} from "@bbrc/shared";
import { parseAsStringLiteral, useQueryStates } from "nuqs";

/** URL query values (`hot` is default → omit `sort`). */
export const postFeedSortQueryValues = ["top", "recent"] as const;
export type PostFeedSortQuery = (typeof postFeedSortQueryValues)[number];

/** URL query values (`week` is default → omit `range`). */
export const postFeedRangeQueryValues = [
	"all",
	"year",
	"month",
	"day",
] as const;
export type PostFeedRangeQuery = (typeof postFeedRangeQueryValues)[number];

export type PostFeedSortUi = PostFeedSort;

export const postFeedSortLabels = {
	hot: "Hot",
	top: "Top",
	recent: "Newest",
} as const satisfies Record<PostFeedSortUi, string>;

export const postFeedRangeLabels = {
	all: "All time",
	year: "This year",
	month: "This month",
	week: "This week",
	day: "Today",
} as const satisfies Record<PostFeedRange, string>;

export const postFeedSearchParams = {
	sort: parseAsStringLiteral(postFeedSortQueryValues).withOptions({
		shallow: false,
		clearOnDefault: true,
	}),
	range: parseAsStringLiteral(postFeedRangeQueryValues).withOptions({
		shallow: false,
		clearOnDefault: true,
	}),
};

export function usePostFeedSearchParams() {
	return useQueryStates(postFeedSearchParams, { shallow: false });
}

export function querySortToFeedSort(
	sort: PostFeedSortQuery | null,
): PostFeedSort {
	if (sort === "top") {
		return "top";
	}
	if (sort === "recent") {
		return "recent";
	}
	return "hot";
}

export function feedSortToQuerySort(
	sort: PostFeedSortUi,
): PostFeedSortQuery | null {
	if (sort === "top") {
		return "top";
	}
	if (sort === "recent") {
		return "recent";
	}
	return null;
}

export function queryRangeToFeedRange(
	range: PostFeedRangeQuery | null,
): PostFeedRange {
	if (range == null) {
		return "week";
	}
	if (postFeedRangeValues.includes(range)) {
		return range;
	}
	return "week";
}

export function feedRangeToQueryRange(
	range: PostFeedRange,
): PostFeedRangeQuery | null {
	if (range === "week") {
		return null;
	}
	if (range === "all") {
		return "all";
	}
	if (range === "year") {
		return "year";
	}
	if (range === "month") {
		return "month";
	}
	if (range === "day") {
		return "day";
	}
	return null;
}

export function toPostFeedListInput(
	params: {
		sort: PostFeedSortQuery | null;
		range: PostFeedRangeQuery | null;
	},
	cursor?: string,
): Partial<GetPostListInput> {
	const feedSort = querySortToFeedSort(params.sort);
	const feedRange = queryRangeToFeedRange(params.range);

	return {
		limit: 10,
		feedSort,
		...(feedSort === "hot" ? {} : { feedRange }),
		...(cursor != null ? { cursor } : {}),
	};
}
