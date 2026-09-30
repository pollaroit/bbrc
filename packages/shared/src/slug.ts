export const SLUG_MIN_LENGTH = 2;
export const SLUG_MAX_LENGTH = 60;

export const slugRegex = /^(?!_)(?!.*__)[a-z0-9_]+(?<!_)$/;

export const isSlug = (slug: string) => slugRegex.test(slug);

/** Maps Cyrillic letters (Russian / Ukrainian) to Latin ASCII for slug generation. */
const CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
	а: "a",
	б: "b",
	в: "v",
	г: "g",
	д: "d",
	е: "e",
	ё: "e",
	ж: "zh",
	з: "z",
	и: "i",
	й: "y",
	к: "k",
	л: "l",
	м: "m",
	н: "n",
	о: "o",
	п: "p",
	р: "r",
	с: "s",
	т: "t",
	у: "u",
	ф: "f",
	х: "h",
	ц: "ts",
	ч: "ch",
	ш: "sh",
	щ: "shch",
	ъ: "",
	ы: "y",
	ь: "",
	э: "e",
	ю: "yu",
	я: "ya",
	і: "i",
	ї: "yi",
	є: "ye",
	ґ: "g",
};

export function mapCyrillicToLatin(text: string): string {
	let result = "";
	for (const char of text) {
		const lower = char.toLowerCase();
		const mapped = CYRILLIC_TO_LATIN[lower];
		if (mapped !== undefined) {
			result += mapped;
			continue;
		}
		result += char;
	}
	return result;
}

function randomDigits(length: number): string {
	let digits = "";
	for (let i = 0; i < length; i++) {
		digits += Math.floor(Math.random() * 10).toString();
	}
	return digits;
}

function sanitizeSlugBody(text: string): string {
	const transliterated = mapCyrillicToLatin(
		text.normalize("NFKC").toLowerCase(),
	);
	let slug = "";

	for (const char of transliterated) {
		if (char >= "a" && char <= "z") {
			slug += char;
			continue;
		}
		if (char >= "0" && char <= "9") {
			slug += char;
			continue;
		}
		if (char === "_" || char === " " || char === "-") {
			slug += "_";
			continue;
		}
		slug += "_";
	}

	slug = slug.replace(/_+/g, "_").replace(/^_|_$/g, "");
	return slug;
}

function trimSlugEdges(slug: string): string {
	return slug.replace(/^_+|_+$/g, "").replace(/_+/g, "_");
}

function truncateToMaxLength(slug: string, maxLength: number): string {
	let truncated = trimSlugEdges(slug);
	if (truncated.length > maxLength) {
		truncated = trimSlugEdges(truncated.slice(0, maxLength));
	}
	return truncated;
}

function ensureMinLength(slug: string): string {
	if (slug.length >= SLUG_MIN_LENGTH && isSlug(slug)) {
		return slug;
	}

	const prefix = slug.length > 0 ? trimSlugEdges(slug) : "s";
	const needed = SLUG_MIN_LENGTH - prefix.length;

	if (needed <= 0) {
		return prefix.slice(0, SLUG_MAX_LENGTH);
	}

	const suffix = randomDigits(needed);
	const combined = truncateToMaxLength(`${prefix}${suffix}`, SLUG_MAX_LENGTH);

	if (isSlug(combined)) {
		return combined;
	}

	return truncateToMaxLength(`s${randomDigits(2)}`, SLUG_MAX_LENGTH);
}

/** Builds a slug from free text (transliterates Cyrillic, then applies slug rules). */
export function generateSlug(text: string): string {
	const sanitized = sanitizeSlugBody(text.trim());
	let slug = truncateToMaxLength(sanitized, SLUG_MAX_LENGTH);
	slug = ensureMinLength(slug);

	if (!isSlug(slug)) {
		return ensureMinLength("");
	}

	return slug;
}

function slugWithNumericSuffix(base: string, digit: number): string {
	const suffix = String(digit);
	const maxBaseLength = SLUG_MAX_LENGTH - suffix.length;
	const trimmedBase = truncateToMaxLength(base, maxBaseLength);
	const candidate = `${trimmedBase}${suffix}`;

	if (!isSlug(candidate)) {
		throw new Error("Failed to build a valid slug with numeric suffix");
	}

	return candidate;
}

export class UniqueSlugError extends Error {
	constructor(message = "Unable to generate a unique slug after 9 attempts") {
		super(message);
		this.name = "UniqueSlugError";
	}
}

/**
 * Generates a slug from `text`, then ensures uniqueness via `isAvailable`.
 * `isAvailable` must return `true` when the slug is free to use.
 * On conflict, tries suffixes `1` … `9`, then throws {@link UniqueSlugError}.
 */
export async function generateUniqueSlug(
	text: string,
	isAvailable: (slug: string) => boolean | Promise<boolean>,
): Promise<string> {
	const base = generateSlug(text);

	if (await isAvailable(base)) {
		return base;
	}

	for (let digit = 1; digit <= 9; digit++) {
		const candidate = slugWithNumericSuffix(base, digit);
		if (await isAvailable(candidate)) {
			return candidate;
		}
	}

	throw new UniqueSlugError();
}
