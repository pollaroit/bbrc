import { createLooseTranslator, DEFAULT_LOCALE, type Locale } from "@bbrc/i18n";
import type { AchievementCategory } from "./types";

/** Names for tiers, lowest first, as keys of `achievements.tiers`. An achievement with n tiers uses the first n. */
export const ACHIEVEMENT_TIER_KEYS = [
	"bronze",
	"silver",
	"gold",
	"platinum",
	"diamond",
] as const;

const translator = (locale: Locale, path: string) =>
	createLooseTranslator(locale, `achievements.${path}`);

/** The name of an achievement ("Bookworm"), by its key. */
export function achievementName(key: string, locale: Locale = DEFAULT_LOCALE) {
	return translator(locale, `items.${key}`)("name");
}

/** What one tier asks for ("Mark 15 books as read."): the threshold goes into the plural-aware message. */
export function achievementDescription(
	key: string,
	threshold: number,
	locale: Locale = DEFAULT_LOCALE,
) {
	return translator(locale, `items.${key}`)("description", { n: threshold });
}

export function achievementCategoryLabel(
	category: AchievementCategory,
	locale: Locale = DEFAULT_LOCALE,
) {
	return translator(locale, "categories")(category);
}

/** The name of tier `tier` (1-based): "Bronze", "Silver" ...; "Tier 6" past the last name. */
export function achievementTierLabel(
	tier: number,
	locale: Locale = DEFAULT_LOCALE,
) {
	const key = ACHIEVEMENT_TIER_KEYS[tier - 1];
	return key
		? translator(locale, "tiers")(key)
		: translator(locale, "tiers")("fallback", { n: tier });
}
