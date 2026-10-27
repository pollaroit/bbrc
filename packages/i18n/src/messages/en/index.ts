import { defineMessages } from "../types";
import { achievements } from "./achievements";
import { errors } from "./errors";
import { genres } from "./genres";
import { labels } from "./labels";
import { notifications } from "./notifications";
import { ratings } from "./ratings";
import { ui } from "./ui";
import { validation } from "./validation";

/**
 * English, the source of every text. Messages are ICU: `{name}` for a value, and
 * `{count, plural, one {# book} other {# books}}` for a plural. Write whole sentences with
 * placeholders; never build a sentence from pieces (other languages order and inflect words
 * differently).
 */
export const en = defineMessages({
	errors,
	labels,
	achievements,
	genres,
	ratings,
	...ui,
	notifications,
	validation,
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
