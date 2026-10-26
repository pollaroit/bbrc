/*
 * Small pure helpers behind the author pages: age lines, progress, decades,
 * rating buckets and the "related authors" score. They take plain numbers so
 * they can be unit-tested without a database.
 */

import type { AuthorDate } from "./author-name";

export type AuthorAgeLine =
	| { kind: "alive"; age: number; text: string }
	| { kind: "died"; age: number | null; text: string }
	| { kind: "unknown"; age: null; text: null };

/** Whole years between two dates; month and day only count when both sides know them. */
function yearsBetween(from: AuthorDate, to: AuthorDate): number | null {
	if (from.year == null || to.year == null) return null;
	let years = to.year - from.year;
	if (from.month && to.month) {
		const beforeBirthday =
			to.month < from.month ||
			(to.month === from.month && from.day && to.day && to.day < from.day);
		if (beforeBirthday) years -= 1;
	}
	return years >= 0 ? years : null;
}

/** An author nobody recorded a death for and born this long ago is treated as unknown, not alive. */
const MAX_PLAUSIBLE_AGE = 110;

/**
 * "died aged 59" for authors with a death year, "aged 60" for living ones,
 * nothing when the birth year is unknown (or the person would be implausibly old).
 */
export function authorAgeLine(input: {
	birth: AuthorDate;
	death: AuthorDate;
	now?: Date;
}): AuthorAgeLine {
	const { birth, death } = input;
	if (death.year != null) {
		const age = yearsBetween(birth, death);
		return {
			kind: "died",
			age,
			text: age == null ? "died" : `died aged ${age}`,
		};
	}
	if (birth.year == null) return { kind: "unknown", age: null, text: null };
	const now = input.now ?? new Date();
	const age = yearsBetween(birth, {
		year: now.getUTCFullYear(),
		month: now.getUTCMonth() + 1,
		day: now.getUTCDate(),
	});
	if (age == null || age > MAX_PLAUSIBLE_AGE) {
		return { kind: "unknown", age: null, text: null };
	}
	return { kind: "alive", age, text: `aged ${age}` };
}

/** "3 of 7 read". */
export function readProgress(read: number, total: number) {
	const safeTotal = Math.max(0, total);
	const safeRead = Math.min(Math.max(0, read), safeTotal);
	return {
		read: safeRead,
		total: safeTotal,
		percent: safeTotal === 0 ? 0 : Math.round((safeRead / safeTotal) * 100),
	};
}

/** Books per decade (1950, 1960 …), oldest first; unknown and zero years are skipped. */
export function bucketByDecade(
	years: readonly (number | null | undefined)[],
): { decade: number; count: number }[] {
	const counts = new Map<number, number>();
	for (const year of years) {
		if (year == null || year <= 0) continue;
		const decade = Math.floor(year / 10) * 10;
		counts.set(decade, (counts.get(decade) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([decade, count]) => ({ decade, count }))
		.sort((a, b) => a.decade - b.decade);
}

/** Ten half-star buckets from 0.5 to 5 (a rating lands in the bucket it is closest to). */
export function ratingDistribution(
	ratings: readonly number[],
): { rating: number; count: number }[] {
	const buckets = Array.from({ length: 10 }, (_, index) => ({
		rating: (index + 1) / 2,
		count: 0,
	}));
	for (const value of ratings) {
		if (!Number.isFinite(value) || value <= 0) continue;
		const index = Math.min(9, Math.max(0, Math.round(value * 2) - 1));
		const bucket = buckets[index];
		if (bucket) bucket.count += 1;
	}
	return buckets;
}

export type RelatedAuthorReason =
	| { kind: "nationality"; countries: string[] }
	| { kind: "era"; yearsApart: number }
	| { kind: "co_read"; members: number };

export type RelatedAuthorScore = {
	score: number;
	reasons: RelatedAuthorReason[];
};

export const RELATED_AUTHOR_ERA_YEARS = 40;

/**
 * How related two authors are: a shared nationality, a close birth year
 * (within 40 years) and members who read both. Zero means unrelated.
 */
export function scoreRelatedAuthor(input: {
	source: { nationalities: readonly string[]; birthYear: number | null };
	candidate: { nationalities: readonly string[]; birthYear: number | null };
	/** Members who read at least one book of each. */
	coReaders: number;
}): RelatedAuthorScore {
	const reasons: RelatedAuthorReason[] = [];
	let score = 0;

	const shared = input.candidate.nationalities.filter((code) =>
		input.source.nationalities.includes(code),
	);
	if (shared.length > 0) {
		reasons.push({ kind: "nationality", countries: shared });
		score += 2;
	}

	const { birthYear: sourceYear } = input.source;
	const { birthYear: candidateYear } = input.candidate;
	if (sourceYear != null && candidateYear != null) {
		const yearsApart = Math.abs(sourceYear - candidateYear);
		if (yearsApart <= RELATED_AUTHOR_ERA_YEARS) {
			reasons.push({ kind: "era", yearsApart });
			score += 1 + (1 - yearsApart / RELATED_AUTHOR_ERA_YEARS);
		}
	}

	if (input.coReaders > 0) {
		reasons.push({ kind: "co_read", members: input.coReaders });
		score += Math.min(input.coReaders, 5) * 1.5;
	}

	return { score: Math.round(score * 100) / 100, reasons };
}

/** The reasons as one short line: "Both from Russia · Born 7 years apart · 3 members read both". */
export function describeRelatedReasons(
	reasons: readonly RelatedAuthorReason[],
	countryName: (code: string) => string = (code) => code,
): string {
	const describe = (reason: RelatedAuthorReason): string => {
		if (reason.kind === "nationality") {
			return `Both from ${reason.countries.map(countryName).join(" and ")}`;
		}
		if (reason.kind === "era") {
			if (reason.yearsApart === 0) return "Born the same year";
			return `Born ${reason.yearsApart} ${reason.yearsApart === 1 ? "year" : "years"} apart`;
		}
		return `${reason.members} ${reason.members === 1 ? "member reads" : "members read"} both`;
	};
	return reasons.map(describe).join(" · ");
}

/** The middle value of a list of numbers (average of the two middle ones for an even count); null when empty. */
export function median(values: readonly number[]): number | null {
	if (values.length === 0) return null;
	const sorted = values.toSorted((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const low = sorted[mid - 1] ?? 0;
	const high = sorted[mid] ?? 0;
	return sorted.length % 2 === 0 ? (low + high) / 2 : high;
}
