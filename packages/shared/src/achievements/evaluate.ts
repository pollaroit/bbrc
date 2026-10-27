import { DEFAULT_LOCALE, type Locale } from "@bbrc/i18n";
import { getZonedParts } from "../club-timezone";
import { ACHIEVEMENTS } from "./definitions";
import { METRICS } from "./metrics";
import { achievementDescription, achievementTierLabel } from "./text";
import type {
	AchievementDefinition,
	AchievementFacts,
	AchievementProgress,
	EarnedTier,
	FactSection,
	Point,
} from "./types";

function zonedYear(date: Date, timeZone: string): number {
	return getZonedParts(date, timeZone).year;
}

/** Years worth evaluating: from the first event through the current year. */
function yearsToCheck(facts: AchievementFacts): number[] {
	const current = zonedYear(facts.now, facts.timeZone);
	const first = zonedYear(facts.user.createdAt, facts.timeZone);
	const years: number[] = [];
	for (let year = Math.min(first, current); year <= current; year += 1) {
		years.push(year);
	}
	return years;
}

function seriesFor(
	definition: AchievementDefinition,
	facts: AchievementFacts,
	year: number | null,
): Point[] {
	const metric = METRICS[definition.metric];
	const inWindow =
		year == null
			? () => true
			: (date: Date) => zonedYear(date, facts.timeZone) === year;
	return metric(facts, inWindow);
}

/** First moment a series reached `value`, or null if it never did. */
function reachedAt(points: readonly Point[], value: number): Date | null {
	return points.find((point) => point.value >= value)?.at ?? null;
}

function finalValue(points: readonly Point[]): number {
	return points.at(-1)?.value ?? 0;
}

/** The name of a tier ("Gold"); empty for an achievement with a single tier. */
export function tierName(
	definition: AchievementDefinition,
	tier: number,
	locale: Locale = DEFAULT_LOCALE,
): string {
	if (definition.thresholds.length === 1) {
		return "";
	}
	return achievementTierLabel(tier, locale);
}

/** What one tier asks for, in words ("Mark 15 books as read."), in the given language. */
export function describeTier(
	definition: AchievementDefinition,
	tier: number,
	locale: Locale = DEFAULT_LOCALE,
): string {
	return achievementDescription(
		definition.key,
		definition.thresholds[tier - 1] ?? 0,
		locale,
	);
}

export type EvaluateOptions = {
	/** Limit to achievements that need one of these sections (event-driven checks). */
	sections?: readonly FactSection[];
};

function relevant(
	definition: AchievementDefinition,
	sections: readonly FactSection[] | undefined,
): boolean {
	return !sections || definition.needs.some((need) => sections.includes(need));
}

/**
 * Every tier the member has earned according to their activity, with the
 * moment each was reached. Pure: the caller decides what is new.
 */
export function evaluateAchievements(
	facts: AchievementFacts,
	options: EvaluateOptions = {},
): EarnedTier[] {
	const earned: EarnedTier[] = [];
	const currentYear = zonedYear(facts.now, facts.timeZone);

	for (const definition of ACHIEVEMENTS) {
		if (!relevant(definition, options.sections)) {
			continue;
		}

		const periods: { key: string; points: Point[] }[] =
			definition.period === "year"
				? yearsToCheck(facts)
						.filter(
							(year) => !definition.finalizeAfterPeriod || year < currentYear,
						)
						.map((year) => ({
							key: String(year),
							points: seriesFor(definition, facts, year),
						}))
				: [{ key: "", points: seriesFor(definition, facts, null) }];

		for (const period of periods) {
			definition.thresholds.forEach((threshold, index) => {
				const at = reachedAt(period.points, threshold);
				if (at && at.getTime() <= facts.now.getTime()) {
					earned.push({
						key: definition.key,
						tier: index + 1,
						periodKey: period.key,
						earnedAt: at,
					});
				}
			});
		}
	}

	return earned;
}

/**
 * Where the member stands on each achievement right now (this year for yearly
 * ones), for progress bars.
 */
export function achievementProgress(
	facts: AchievementFacts,
): AchievementProgress[] {
	const currentYear = zonedYear(facts.now, facts.timeZone);

	return ACHIEVEMENTS.map((definition) => {
		const points = seriesFor(
			definition,
			facts,
			definition.period === "year" ? currentYear : null,
		);
		const value = finalValue(points);
		const tier = definition.thresholds.filter(
			(threshold) => value >= threshold,
		).length;
		return {
			key: definition.key,
			periodKey: definition.period === "year" ? String(currentYear) : "",
			value,
			tier,
			next: definition.thresholds[tier] ?? null,
		};
	});
}
