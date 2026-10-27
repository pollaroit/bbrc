import { createLooseTranslator, DEFAULT_LOCALE, type Locale } from "@bbrc/i18n";
import {
	FEEDBACK_RATING_STEPS,
	type FeedbackRatingStep,
	formatFeedbackRating,
} from "./feedback-rating";

/**
 * What every rating means. The defaults every member starts with live in the `ratings` messages
 * (per language); a member can rewrite the text of any single rating in Preferences (and reset it
 * to the default). The label is short and fixed; only the text is customised.
 */
export type RatingDefinition = { label: string; text: string };

export const RATING_DEFINITION_MAX_LENGTH = 600;

/** Key of a rating's texts in the `ratings.definitions` messages: `s` + the rating, `_` for the dot. */
export const ratingMessageKey = (rating: number): string =>
	`s${formatFeedbackRating(rating).replace(".", "_")}`;

/** The default label and text of a rating in a language (the member's own wording is separate). */
export function defaultRatingDefinition(
	rating: number,
	locale: Locale = DEFAULT_LOCALE,
): RatingDefinition {
	const t = createLooseTranslator(
		locale,
		`ratings.definitions.${ratingMessageKey(rating)}`,
	);
	return { label: t("label"), text: t("text") };
}

/** Key of a rating in the definition maps ("4.5", "0"). */
export const ratingKey = (rating: number): string =>
	formatFeedbackRating(rating);

/** Ratings highest first, the order they are listed in. */
export const RATING_DEFINITION_STEPS: readonly FeedbackRatingStep[] = [
	...FEEDBACK_RATING_STEPS,
].reverse();

export type ResolvedRatingDefinition = RatingDefinition & {
	/** True when the member wrote their own text for this rating. */
	custom: boolean;
	rating: FeedbackRatingStep;
};

/** The definition a member sees for a rating: their own text when set, otherwise the default. */
export function resolveRatingDefinition(
	rating: FeedbackRatingStep,
	overrides: Readonly<Record<string, string>> | null | undefined,
	locale: Locale = DEFAULT_LOCALE,
): ResolvedRatingDefinition {
	const key = ratingKey(rating);
	const base = defaultRatingDefinition(rating, locale);
	const own = overrides?.[key]?.trim();
	return {
		rating,
		label: base.label,
		text: own ? own : base.text,
		custom: Boolean(own),
	};
}
