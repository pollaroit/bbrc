import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { contentPlainText } from "@bbrc/shared";
import {
	parseAsFloat,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import type { FieldLabels } from "@/lib/listing/labels";
import { sortDirectionParser } from "@/lib/listing/parsers";

type Review = GetSittingBySlugOutput["reviews"][number];

export const sittingReviewSortFields = [
	"createdAt",
	"rating",
	"likes",
	"comments",
] as const;

export const sittingReviewSortByLabels = {
	createdAt: "Date added",
	rating: "Rating",
	likes: "Likes",
	comments: "Comments",
} as const satisfies FieldLabels<(typeof sittingReviewSortFields)[number]>;

export const sittingReviewSpoilerModes = ["only", "hide"] as const;

export const sittingReviewSpoilerLabels = {
	only: "Only spoiler reviews",
	hide: "Hide spoiler reviews",
} as const satisfies Record<(typeof sittingReviewSpoilerModes)[number], string>;

export const sittingReviewListingParams = {
	search: parseAsString,
	sortBy: parseAsStringLiteral(sittingReviewSortFields).withDefault(
		"createdAt",
	),
	sortDirection: sortDirectionParser.withDefault("desc"),
	minRating: parseAsFloat,
	maxRating: parseAsFloat,
	spoilers: parseAsStringLiteral(sittingReviewSpoilerModes),
};

export function useSittingReviewListingParams() {
	return useQueryStates(sittingReviewListingParams);
}

export type SittingReviewListingParams = ReturnType<
	typeof useSittingReviewListingParams
>[0];

export function countSittingReviewFilters(
	params: SittingReviewListingParams,
): number {
	let count = 0;
	if (params.minRating != null || params.maxRating != null) count += 1;
	if (params.spoilers) count += 1;
	return count;
}

export function hasActiveSittingReviewFilters(
	params: SittingReviewListingParams,
): boolean {
	return (
		Boolean(params.search?.trim()) || countSittingReviewFilters(params) > 0
	);
}

/** Reviews of one sitting are few, so filtering and sorting run in the browser. */
export function filterAndSortSittingReviews(
	reviews: Review[],
	params: SittingReviewListingParams,
): Review[] {
	const query = params.search?.trim().toLowerCase();
	const sign = params.sortDirection === "asc" ? 1 : -1;

	return reviews
		.filter((review) => {
			if (params.minRating != null && review.rating < params.minRating) {
				return false;
			}
			if (params.maxRating != null && review.rating > params.maxRating) {
				return false;
			}
			if (params.spoilers === "only" && !review.isSpoiler) return false;
			if (params.spoilers === "hide" && review.isSpoiler) return false;
			if (query) {
				const text = `${review.name} ${review.username} ${
					review.isSpoiler ? "" : contentPlainText(review.review)
				}`.toLowerCase();
				return text.includes(query);
			}
			return true;
		})
		.toSorted((a, b) => {
			switch (params.sortBy) {
				case "rating":
					return sign * (a.rating - b.rating);
				case "likes":
					return sign * (a.likeCount - b.likeCount);
				case "comments":
					return sign * (a.commentCount - b.commentCount);
				default:
					return sign * (a.createdAt.getTime() - b.createdAt.getTime());
			}
		});
}
