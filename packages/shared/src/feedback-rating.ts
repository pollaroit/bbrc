/** Letterboxd-style club feedback ratings: 0, 0.5, …, 5 only. */
export const FEEDBACK_RATING_STEPS = [
	0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
] as const;

export type FeedbackRatingStep = (typeof FEEDBACK_RATING_STEPS)[number];

const STEP_SET = new Set<number>(FEEDBACK_RATING_STEPS);

export function isFeedbackRatingStep(
	value: number,
): value is FeedbackRatingStep {
	return STEP_SET.has(value);
}

export function formatFeedbackRating(value: number): string {
	if (!isFeedbackRatingStep(value)) {
		return value.toFixed(1);
	}
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
