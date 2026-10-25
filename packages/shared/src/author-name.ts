/*
 * Author names from Open Library are often dirty: "Fyodor Dostoyevsky",
 * "Fiodor Dostoevski", "Tolkien, J. R. R.", "J.R.R. Tolkien". These helpers
 * make names comparable so one person ends up as one author.
 *
 * - `authorNameKey`      strict key: same key = same spelling (accents, case, dots, word order of "Last, First" ignored).
 * - `looseAuthorKey`     key that also ignores common transliteration differences.
 * - `authorNameSimilarity` 0 to 1 score between two names.
 * - `isLikelySameAuthor` the score used for "Looks like X, already in the library".
 */

const HONORIFICS = new Set([
	"dr",
	"mr",
	"mrs",
	"ms",
	"sir",
	"prof",
	"professor",
]);
const SUFFIXES = new Set(["jr", "sr"]);

function stripDiacritics(value: string) {
	return value.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/** "Tolkien, J. R. R." becomes "J. R. R. Tolkien"; other names are left alone. */
function reorderLastFirst(name: string) {
	const parts = name.split(",").map((part) => part.trim());
	if (parts.length === 2 && parts[0] && parts[1]) {
		return `${parts[1]} ${parts[0]}`;
	}
	return name;
}

function tokenize(name: string): string[] {
	return (
		stripDiacritics(reorderLastFirst(name))
			// "J.R.R." and "J. R. R." are the same initials.
			.replace(/\b([A-Za-z])\.(?=[A-Za-z])/g, "$1 ")
			.toLowerCase()
			.replace(/&/g, " and ")
			.replace(/[.'’`´]/g, "")
			.replace(/[^a-z0-9\s-]/g, " ")
			.replace(/-/g, " ")
			.split(/\s+/)
			.filter(Boolean)
			.filter((token) => !HONORIFICS.has(token) && !SUFFIXES.has(token))
	);
}

/** The strict comparison key of a name (also what aliases are stored under). */
export function authorNameKey(name: string): string {
	return tokenize(name).join(" ");
}

/** A token with common transliteration differences flattened (y/i, kh/h, double letters …). */
function looseToken(token: string): string {
	return token
		.replace(/ph/g, "f")
		.replace(/kh/g, "h")
		.replace(/ck/g, "k")
		.replace(/ou/g, "u")
		.replace(/w/g, "v")
		.replace(/y/g, "i")
		.replace(/j/g, "i")
		.replace(/(.)\1+/g, "$1");
}

export function looseAuthorKey(name: string): string {
	return tokenize(name).map(looseToken).join(" ");
}

function levenshteinRatio(a: string, b: string) {
	if (a === b) return 1;
	if (!a || !b) return 0;
	const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		let diagonal = prev[0] ?? 0;
		prev[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const above = prev[j] ?? 0;
			prev[j] = Math.min(
				above + 1,
				(prev[j - 1] ?? 0) + 1,
				diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
			);
			diagonal = above;
		}
	}
	return 1 - (prev[b.length] ?? 0) / Math.max(a.length, b.length);
}

/**
 * How alike two names are, from 0 to 1. The surname carries most of the weight;
 * given names compare by spelling, or only by first letter when one side has an initial.
 */
export function authorNameSimilarity(a: string, b: string): number {
	const left = tokenize(a).map(looseToken);
	const right = tokenize(b).map(looseToken);
	if (left.length === 0 || right.length === 0) return 0;
	if (left.join(" ") === right.join(" ")) return 1;

	const surnameLeft = left[left.length - 1] ?? "";
	const surnameRight = right[right.length - 1] ?? "";
	const surname = levenshteinRatio(surnameLeft, surnameRight);
	if (surname < 0.75) return surname * 0.5;

	const givenLeft = left.slice(0, -1);
	const givenRight = right.slice(0, -1);
	let given: number;
	if (givenLeft.length === 0 || givenRight.length === 0) {
		// "Tolkien" against "J. R. R. Tolkien": a surname-only match is a weak signal.
		given = 0.7;
	} else {
		const pairs = Math.min(givenLeft.length, givenRight.length);
		let total = 0;
		for (let index = 0; index < pairs; index++) {
			const x = givenLeft[index] ?? "";
			const y = givenRight[index] ?? "";
			total +=
				x.length === 1 || y.length === 1
					? x[0] === y[0]
						? 1
						: 0
					: levenshteinRatio(x, y);
		}
		given = total / pairs;
	}
	return Math.round((surname * 0.6 + given * 0.4) * 1000) / 1000;
}

/** The score at which the add flow says "Looks like <existing author>". */
export const LIKELY_SAME_AUTHOR_SCORE = 0.85;

export function isLikelySameAuthor(a: string, b: string): boolean {
	return authorNameSimilarity(a, b) >= LIKELY_SAME_AUTHOR_SCORE;
}

// ── Dates ──────────────────────────────────────────────────────────────────

export type AuthorDate = {
	year: number | null;
	month?: number | null;
	day?: number | null;
};

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

/** "1821", "Nov 1821", "11 Nov 1821", "384 BC"; null when the year is unknown. */
export function formatAuthorDate(date: AuthorDate): string | null {
	if (date.year == null) return null;
	const year = date.year < 0 ? `${Math.abs(date.year)} BC` : String(date.year);
	const month =
		date.month && date.month >= 1 && date.month <= 12
			? MONTHS[date.month - 1]
			: null;
	if (!month) return year;
	return date.day ? `${date.day} ${month} ${year}` : `${month} ${year}`;
}

/** "1821–1881", "b. 1965", "d. 1881", or null when nothing is known. */
export function formatAuthorLifespan(input: {
	birth: AuthorDate;
	death: AuthorDate;
}): string | null {
	const birth = input.birth.year;
	const death = input.death.year;
	if (birth != null && death != null) {
		return `${birth < 0 ? `${Math.abs(birth)} BC` : birth}–${death < 0 ? `${Math.abs(death)} BC` : death}`;
	}
	if (birth != null) return `b. ${birth < 0 ? `${Math.abs(birth)} BC` : birth}`;
	if (death != null) return `d. ${death < 0 ? `${Math.abs(death)} BC` : death}`;
	return null;
}

// ── Field provenance ───────────────────────────────────────────────────────

export const AUTHOR_FIELDS = [
	"name",
	"sortName",
	"bio",
	"birth",
	"death",
	"birthPlace",
	"deathPlace",
	"nationalities",
	"gender",
	"wikipediaUrl",
	"goodreadsUrl",
	"websiteUrl",
	"photo",
] as const;
export type AuthorField = (typeof AUTHOR_FIELDS)[number];

export type AuthorFieldSource =
	| "openlibrary"
	| "wikidata"
	| "wikipedia"
	| "ai"
	| "admin";

export type AuthorFieldMeta = Partial<
	Record<AuthorField, { source: AuthorFieldSource; locked?: boolean }>
>;

export const AUTHOR_FIELD_SOURCE_LABELS: Record<AuthorFieldSource, string> = {
	openlibrary: "Open Library",
	wikidata: "Wikidata",
	wikipedia: "Wikipedia",
	ai: "AI-assisted",
	admin: "Added by an admin",
};

export const AUTHOR_BIO_MAX_LENGTH = 2000;
