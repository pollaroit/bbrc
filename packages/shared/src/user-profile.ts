import { type GenreSlug, genres, type SubgenreSlug } from "./genres";
import type { socialSites } from "./social-sites";

export const MIN_USER_AGE = 12;
export const MAX_USER_AGE = 112;

export const PROFILE_LOCATION_MAX_CHARS = 100;
export const PROFILE_BIO_MAX_PLAIN_CHARS = 600;
export const PROFILE_WEBSITE_MAX_CHARS = 200;

export const MIN_WPM = 100;
export const MAX_WPM = 500;
export const DEFAULT_WPM = 240;

export type SocialSiteSlug = (typeof socialSites)[number]["slug"];

const genreSlugSet: ReadonlySet<string> = new Set(genres.map((g) => g.slug));

/** subgenre slug -> parent genre slug */
const subgenreParents: ReadonlyMap<string, GenreSlug> = new Map(
	genres.flatMap((genre) =>
		(genre.subgenres ?? []).map(
			(sub) => [sub.slug, genre.slug as GenreSlug] as const,
		),
	),
);

export function isGenreSlug(value: string): value is GenreSlug {
	return genreSlugSet.has(value);
}

export function isSubgenreSlug(value: string): value is SubgenreSlug {
	return subgenreParents.has(value);
}

export function getSubgenreParent(slug: string): GenreSlug | undefined {
	return subgenreParents.get(slug);
}

/** Whole years completed on `now`, comparing UTC calendar dates. */
export function getAgeOn(birth: Date, now: Date = new Date()): number {
	let age = now.getUTCFullYear() - birth.getUTCFullYear();
	const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
	if (
		monthDiff < 0 ||
		(monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())
	) {
		age -= 1;
	}
	return age;
}

export function isBirthDateInRange(
	birth: Date,
	now: Date = new Date(),
): boolean {
	const age = getAgeOn(birth, now);
	return age >= MIN_USER_AGE && age <= MAX_USER_AGE;
}

/** Earliest and latest allowed birth dates, as UTC-midnight dates. */
export function getBirthDateBounds(now: Date = new Date()): {
	earliest: Date;
	latest: Date;
} {
	const y = now.getUTCFullYear();
	const m = now.getUTCMonth();
	const d = now.getUTCDate();
	return {
		// Turns 113 tomorrow or later => still 112 today.
		earliest: new Date(Date.UTC(y - MAX_USER_AGE - 1, m, d + 1)),
		latest: new Date(Date.UTC(y - MIN_USER_AGE, m, d)),
	};
}

export function countWords(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

export function calculateWpm(wordCount: number, elapsedMs: number): number {
	if (wordCount <= 0 || elapsedMs <= 0) return DEFAULT_WPM;
	const raw = Math.round(wordCount / (elapsedMs / 60_000));
	return Math.min(MAX_WPM, Math.max(MIN_WPM, raw));
}
