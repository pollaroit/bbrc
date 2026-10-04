import { describe, expect, test } from "bun:test";

import {
	FEEDBACK_RATING_STEPS,
	formatFeedbackRating,
	isFeedbackRatingStep,
} from "./feedback-rating";

describe("isFeedbackRatingStep", () => {
	test("accepts half-star steps only", () => {
		for (const step of FEEDBACK_RATING_STEPS) {
			expect(isFeedbackRatingStep(step)).toBe(true);
		}
		expect(isFeedbackRatingStep(3.2)).toBe(false);
		expect(isFeedbackRatingStep(4.1)).toBe(false);
	});
});

describe("formatFeedbackRating", () => {
	test("formats integers without trailing zero", () => {
		expect(formatFeedbackRating(4)).toBe("4");
		expect(formatFeedbackRating(4.5)).toBe("4.5");
	});
});
