import { describe, expect, test } from "bun:test";
import { FEEDBACK_RATING_STEPS } from "./feedback-rating";
import {
	DEFAULT_RATING_DEFINITIONS,
	RATING_DEFINITION_MAX_LENGTH,
	RATING_DEFINITION_STEPS,
	ratingKey,
	resolveRatingDefinition,
} from "./rating-definitions";

describe("rating definitions", () => {
	test("every rating step has a default label and text within the limit", () => {
		for (const step of FEEDBACK_RATING_STEPS) {
			const definition = DEFAULT_RATING_DEFINITIONS[ratingKey(step)];
			expect(definition).toBeDefined();
			expect(definition?.label.length).toBeGreaterThan(0);
			expect(definition?.text.length).toBeGreaterThan(40);
			expect(definition?.text.length).toBeLessThanOrEqual(
				RATING_DEFINITION_MAX_LENGTH,
			);
		}
	});

	test("steps are listed highest first", () => {
		expect(RATING_DEFINITION_STEPS[0]).toBe(5);
		expect(RATING_DEFINITION_STEPS.at(-1)).toBe(0);
	});

	test("a member's own text wins, a blank one falls back to the default", () => {
		const own = resolveRatingDefinition(4, { "4": "  Great fun.  " });
		expect(own.text).toBe("Great fun.");
		expect(own.custom).toBe(true);
		const blank = resolveRatingDefinition(4, { "4": "   " });
		expect(blank.custom).toBe(false);
		expect(blank.text).toBe(DEFAULT_RATING_DEFINITIONS["4"]?.text ?? "");
		expect(resolveRatingDefinition(0.5, null).label).toBe("Almost nothing");
	});
});
