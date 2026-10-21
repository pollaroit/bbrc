import type { GetUserFeedbackListInput } from "@bbrc/api/modules/feedback/feedback.schema";
import {
	userFeedbackRangeableFields,
	userFeedbackSortableFields,
} from "@bbrc/api/modules/feedback/user-feedback.listing";
import {
	parseAsBoolean,
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

export const userFeedbackSortByLabels = {
	createdAt: "Date added",
	rating: "Rating",
	likes: "Likes",
	comments: "Comments",
	book: "Book title",
} as const satisfies FieldLabels<(typeof userFeedbackSortableFields)[number]>;

export const userFeedbackRangeByLabels = {
	createdAt: "Date added",
} as const satisfies FieldLabels<(typeof userFeedbackRangeableFields)[number]>;

export const userFeedbackReviewTypes = ["written", "rating_only"] as const;
export const userFeedbackSpoilerModes = ["only", "hide"] as const;

export const userFeedbackReviewTypeLabels = {
	written: "Written review",
	rating_only: "Rating only",
} as const satisfies Record<(typeof userFeedbackReviewTypes)[number], string>;

export const userFeedbackSpoilerLabels = {
	only: "Only spoiler reviews",
	hide: "Hide spoiler reviews",
} as const satisfies Record<(typeof userFeedbackSpoilerModes)[number], string>;

export const userFeedbackListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	sortBy: createSortByParser(userFeedbackSortableFields)
		.withDefault("createdAt")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser
		.withDefault("desc")
		.withOptions({ shallow: false }),
	rangeBy: createRangeByParser(userFeedbackRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	minRating: parseAsFloat.withOptions({ shallow: false }),
	maxRating: parseAsFloat.withOptions({ shallow: false }),
	reviewType: parseAsStringLiteral(userFeedbackReviewTypes).withOptions({
		shallow: false,
	}),
	spoilers: parseAsStringLiteral(userFeedbackSpoilerModes).withOptions({
		shallow: false,
	}),
	mutualOnly: parseAsBoolean.withDefault(false).withOptions({ shallow: false }),
};

export function useUserFeedbackListingSearchParams() {
	return useQueryStates(userFeedbackListingSearchParams, { shallow: false });
}

export type UserFeedbackListingSearchParams = ReturnType<
	typeof useUserFeedbackListingSearchParams
>[0];

export function toUserFeedbackListCallInput(
	params: UserFeedbackListingSearchParams,
): Partial<GetUserFeedbackListInput> {
	return buildListCallInput({
		search: params.search,
		sortBy: params.sortBy,
		sortDirection: params.sortDirection,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		minRating: params.minRating,
		maxRating: params.maxRating,
		reviewType: params.reviewType,
		spoilers: params.spoilers,
		mutualOnly: params.mutualOnly ? true : undefined,
		limit: 10,
	}) as Partial<GetUserFeedbackListInput>;
}

export function countUserFeedbackSheetFilters(
	params: UserFeedbackListingSearchParams,
): number {
	let count = 0;
	if (params.minRating != null || params.maxRating != null) count += 1;
	if (params.reviewType) count += 1;
	if (params.spoilers) count += 1;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (params.mutualOnly) count += 1;
	return count;
}

/** True when any search or filter narrows the list (sorting does not count). */
export function hasActiveUserFeedbackFilters(
	params: UserFeedbackListingSearchParams,
): boolean {
	return (
		Boolean(params.search?.trim()) || countUserFeedbackSheetFilters(params) > 0
	);
}

export function clearUserFeedbackSheetFilters(
	setParams: ReturnType<typeof useUserFeedbackListingSearchParams>[1],
) {
	void setParams({
		minRating: null,
		maxRating: null,
		reviewType: null,
		spoilers: null,
		rangeBy: null,
		rangeMin: null,
		rangeMax: null,
		mutualOnly: null,
	});
}
