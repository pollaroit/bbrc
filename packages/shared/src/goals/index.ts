import { authorNameToSlug } from "../author-slug";
import { normalizeBookCountryCodes } from "../book-country";
import { getZonedParts, resolveClubTimeZone } from "../club-timezone";

export type GoalScopeKind = "none" | "authors" | "countries";

export type GoalScope = {
	kind: GoalScopeKind;
	authorSlugs: string[];
	countryCodes: string[];
};

export type GoalBookForScope = {
	authors: readonly string[];
	/**
	 * Every address the book's authors answer to (canonical slug and merged slugs). When present
	 * it is used instead of the names, so a renamed or merged author still counts.
	 */
	authorSlugs?: readonly string[];
	countries: readonly string[];
};

export type GoalReadForProgress = {
	readEndYear: number | null;
	readEndMonth: number | null;
	book: GoalBookForScope;
};

const MAX_SCOPE_AUTHORS = 20;
const MAX_SCOPE_COUNTRIES = 20;

export function normalizeGoalAuthorSlugs(slugs: readonly string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];

	for (const raw of slugs) {
		const slug = raw.trim().toLowerCase();
		if (!slug || seen.has(slug)) {
			continue;
		}
		seen.add(slug);
		out.push(slug);
		if (out.length >= MAX_SCOPE_AUTHORS) {
			break;
		}
	}

	return out;
}

export function normalizeGoalCountryCodes(codes: readonly string[]): string[] {
	return normalizeBookCountryCodes(codes).slice(0, MAX_SCOPE_COUNTRIES);
}

export function goalScopeFromStored(input: {
	scopeKind: GoalScopeKind;
	scopeAuthors: readonly string[];
	scopeCountries: readonly string[];
}): GoalScope {
	if (input.scopeKind === "authors") {
		return {
			kind: "authors",
			authorSlugs: normalizeGoalAuthorSlugs(input.scopeAuthors),
			countryCodes: [],
		};
	}

	if (input.scopeKind === "countries") {
		return {
			kind: "countries",
			authorSlugs: [],
			countryCodes: normalizeGoalCountryCodes(input.scopeCountries),
		};
	}

	return { kind: "none", authorSlugs: [], countryCodes: [] };
}

export function goalScopeFingerprint(scope: GoalScope): string {
	if (scope.kind === "none") {
		return "none";
	}

	if (scope.kind === "authors") {
		return `authors:${[...scope.authorSlugs].sort().join(",")}`;
	}

	return `countries:${[...scope.countryCodes].sort().join(",")}`;
}

export function bookMatchesGoalScope(
	book: GoalBookForScope,
	scope: GoalScope,
): boolean {
	if (scope.kind === "none") {
		return true;
	}

	if (scope.kind === "authors") {
		if (scope.authorSlugs.length === 0) {
			return false;
		}
		const wanted = new Set(scope.authorSlugs);
		if (book.authorSlugs && book.authorSlugs.length > 0) {
			return book.authorSlugs.some((slug) => wanted.has(slug));
		}
		for (const name of book.authors) {
			if (wanted.has(authorNameToSlug(name))) {
				return true;
			}
		}
		return false;
	}

	if (scope.countryCodes.length === 0) {
		return false;
	}

	const wanted = new Set(scope.countryCodes);
	const bookCodes = normalizeBookCountryCodes([...book.countries]);
	return bookCodes.some((code) => wanted.has(code));
}

export function readCountsTowardGoal(
	read: GoalReadForProgress,
	goalYear: number,
	scope: GoalScope,
): boolean {
	if (read.readEndYear !== goalYear || read.readEndMonth == null) {
		return false;
	}

	return bookMatchesGoalScope(read.book, scope);
}

export function countReadsForGoal(
	reads: readonly GoalReadForProgress[],
	goalYear: number,
	scope: GoalScope,
): number {
	let count = 0;
	for (const read of reads) {
		if (readCountsTowardGoal(read, goalYear, scope)) {
			count += 1;
		}
	}
	return count;
}

export function getClubCalendarYear(
	now = new Date(),
	timeZone = resolveClubTimeZone(),
): number {
	return getZonedParts(now, timeZone).year;
}

export function allowedGoalYears(
	now = new Date(),
	timeZone = resolveClubTimeZone(),
): { min: number; max: number; options: [number, number] } {
	const current = getClubCalendarYear(now, timeZone);
	return { min: current, max: current + 1, options: [current, current + 1] };
}

export function isGoalYearAllowed(
	year: number,
	now = new Date(),
	timeZone = resolveClubTimeZone(),
): boolean {
	const { min, max } = allowedGoalYears(now, timeZone);
	return year >= min && year <= max;
}

export function isGoalExpired(
	goalYear: number,
	now = new Date(),
	timeZone = resolveClubTimeZone(),
): boolean {
	return goalYear < getClubCalendarYear(now, timeZone);
}

export function isGoalComplete(current: number, target: number): boolean {
	return current >= target;
}

export function goalProgressPercent(current: number, target: number): number {
	if (target <= 0) {
		return 0;
	}
	return Math.min(100, Math.round((current / target) * 100));
}
