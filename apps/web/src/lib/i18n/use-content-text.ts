"use client";

import {
	type AchievementCategory,
	type AchievementDefinition,
	achievementCategoryLabel,
	achievementName,
	bookCountryOptions,
	describeTier,
	formatEditionLanguage,
	genreName,
	getBookCountryName,
	tierName,
} from "@bbrc/shared";
import { useLocale } from "next-intl";
import { useMemo } from "react";

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

/** The name of a country in the page's language, by ISO code (the code itself when unknown). */
export function useCountryName() {
	const locale = useLocale();
	return (code: string) => getBookCountryName(code, locale) ?? code;
}

/** Every country as `{ alpha2, name }`, named and sorted in the page's language. */
export function useCountryOptions() {
	const locale = useLocale();
	return useMemo(() => bookCountryOptions(locale), [locale]);
}

/** The name of an edition's language ("Türk dili") in the page's language. */
export function useLanguageLabel() {
	const locale = useLocale();
	return (code: string) => formatEditionLanguage(code, locale);
}
