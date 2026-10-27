import { defineMessages } from "../types";

/**
 * English, the source of every text. Messages are ICU: `{name}` for a value, and
 * `{count, plural, one {# book} other {# books}}` for a plural. Write whole sentences with
 * placeholders; never build a sentence from pieces (other languages order and inflect words
 * differently).
 */
export const en = defineMessages({
	language: {
		title: "Language",
		description:
			"Choose the language of the app. This does not change anything people write.",
		current: "Current language: {language}",
		switchTo: "Switch to {language}",
		saved: "Language changed",
		failed: "Could not save your language. Try again.",
	},
});
