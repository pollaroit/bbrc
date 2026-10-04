import {
	FEEDBACK_RATING_STEPS,
	type FeedbackRatingStep,
	formatFeedbackRating,
} from "@bbrc/shared";

export const FEEDBACK_MIN_RATING_FILTER_OPTIONS: {
	value: string;
	label: string;
}[] = [
	{ value: "all", label: "All ratings" },
	...FEEDBACK_RATING_STEPS.toReversed()
		.filter((step) => step > 0)
		.map((step) => ({
			value: String(step),
			label:
				step === 5 ? "5 stars only" : `${formatFeedbackRating(step)}+ stars`,
		})),
];

export function parseFeedbackMinRatingFilter(
	filterValue: string,
): FeedbackRatingStep | undefined {
	if (filterValue === "all") {
		return undefined;
	}
	const parsed = Number(filterValue);
	return FEEDBACK_RATING_STEPS.includes(parsed as FeedbackRatingStep)
		? (parsed as FeedbackRatingStep)
		: undefined;
}

export function filterReviewsByMinRating<T extends { rating: number }>(
	reviews: T[],
	minRating: FeedbackRatingStep | undefined,
): T[] {
	if (minRating === undefined) {
		return reviews;
	}
	return reviews.filter((entry) => entry.rating >= minRating);
}
