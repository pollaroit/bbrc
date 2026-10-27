"use client";

import {
	type AchievementCategory,
	type AchievementDefinition,
	achievementCategoryLabel,
	achievementName,
	describeTier,
	genreName,
	tierName,
} from "@bbrc/shared";
import { useLocale } from "next-intl";

/** Achievement texts in the page's language: names, tier names, descriptions and categories. */
export function useAchievementText() {
	const locale = useLocale();
	return {
		name: (key: string) => achievementName(key, locale),
		category: (category: AchievementCategory) =>
			achievementCategoryLabel(category, locale),
		tier: (definition: AchievementDefinition, tier: number) =>
			tierName(definition, tier, locale),
		describe: (definition: AchievementDefinition, tier: number) =>
			describeTier(definition, tier, locale),
	};
}

/** The name of a genre, subgenre or category in the page's language, by slug. */
export function useGenreName() {
	const locale = useLocale();
	return (slug: string) => genreName(slug, locale);
}
