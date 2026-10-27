import { describe, expect, test } from "bun:test";
import { LOCALES } from "@bbrc/i18n";
import { FEEDBACK_RATING_STEPS } from "./feedback-rating";
import {
	defaultRatingDefinition,
	RATING_DEFINITION_MAX_LENGTH,
	RATING_DEFINITION_STEPS,
	resolveRatingDefinition,
} from "./rating-definitions";

describe("rating definitions", () => {
	test("every rating step has a default label and text in every language, within the limit", () => {
		for (const locale of LOCALES) {
			for (const step of FEEDBACK_RATING_STEPS) {
				const definition = defaultRatingDefinition(step, locale);
				expect(definition.label.length).toBeGreaterThan(0);
				expect(definition.text.length).toBeGreaterThan(40);
				expect(definition.text.length).toBeLessThanOrEqual(
					RATING_DEFINITION_MAX_LENGTH,
				);
			}
		}
	});

	test("the defaults follow the language", () => {
		expect(defaultRatingDefinition(5, "az").label).toBe("Şedevr");
		expect(defaultRatingDefinition(5).label).toBe("Masterpiece");
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
		expect(blank.text).toBe(defaultRatingDefinition(4).text);
		expect(resolveRatingDefinition(0.5, null).label).toBe("Almost nothing");
		expect(resolveRatingDefinition(0.5, { "0.5": "x" }, "az").label).toBe(
			"Demək olar ki, heç nə",
		);
	});
});
