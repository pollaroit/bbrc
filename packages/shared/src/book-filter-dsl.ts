import { authorNameToSlug } from "./author-slug";
import { bookCountryCodeSchema } from "./book-country";

/**
 * Tiny filter language used by the search palette, for example
 * `random:nr:p<400:p>200:y<2010:a[dostoyevski]:c[uk,us]`.
 *
 * Segments are separated by `:` (outside brackets) and every segment narrows
 * the result, like an AND gate. The output uses the same field names as the
 * books list, so it can feed the books page URL or the random-book endpoint.
 */

export type BookFilterStatus = "wishlist" | "reading" | "completed";

export type BookFilterSpec = {
	minPages?: number;
	maxPages?: number;
	minPublishedIn?: number;
	maxPublishedIn?: number;
	minReads?: number;
	maxReads?: number;
	minFeedbacks?: number;
	maxFeedbacks?: number;
	minAverageRating?: number;
	maxAverageRating?: number;
	authors?: string[];
	countries?: string[];
	statuses?: BookFilterStatus[];
	viewerRead?: "read" | "unread";
};

export type BookFilterParseResult =
	| { ok: true; filters: BookFilterSpec }
	| { ok: false; error: string };

type NumericKey = "p" | "y" | "r" | "f" | "cr";

const NUMERIC_KEYS: Record<
	NumericKey,
	{
		label: string;
		min: keyof BookFilterSpec;
		max: keyof BookFilterSpec;
		integer: boolean;
		floor: number;
		ceiling: number;
	}
> = {
	p: {
		label: "pages",
		min: "minPages",
		max: "maxPages",
		integer: true,
		floor: 1,
		ceiling: Number.POSITIVE_INFINITY,
	},
	y: {
		label: "publish year",
		min: "minPublishedIn",
		max: "maxPublishedIn",
		integer: true,
		floor: 0,
		ceiling: Number.POSITIVE_INFINITY,
	},
	r: {
		label: "read count",
		min: "minReads",
		max: "maxReads",
		integer: true,
		floor: 0,
		ceiling: Number.POSITIVE_INFINITY,
	},
	f: {
		label: "review count",
		min: "minFeedbacks",
		max: "maxFeedbacks",
		integer: true,
		floor: 0,
		ceiling: Number.POSITIVE_INFINITY,
	},
	cr: {
		label: "club rating",
		min: "minAverageRating",
		max: "maxAverageRating",
		integer: false,
		floor: 0,
		ceiling: 5,
	},
};

const STATUS_LETTERS: Record<string, BookFilterStatus> = {
	w: "wishlist",
	r: "reading",
	c: "completed",
	wishlist: "wishlist",
	reading: "reading",
	completed: "completed",
};

const READ_FLAGS: Record<string, "read" | "unread"> = {
	ir: "read",
	read: "read",
	nr: "unread",
	"not-read": "unread",
	unread: "unread",
};

const NUMERIC_PATTERN = /^(cr|p|y|r|f)(<=|>=|<|>|=)(-?\d+(?:\.\d+)?)$/;
const LIST_PATTERN = /^(a|c|w)\[([^\]]*)\]$/;
const STATUS_EQUALS_PATTERN = /^w=([a-z-]+)$/;

/** Splits on `:` but keeps colons that sit inside `[...]`. */
export function splitFilterSegments(text: string): string[] {
	const segments: string[] = [];
	let depth = 0;
	let current = "";

	for (const char of text) {
		if (char === "[") {
			depth += 1;
		} else if (char === "]") {
			depth = Math.max(0, depth - 1);
		}

		if (char === ":" && depth === 0) {
			segments.push(current);
			current = "";
			continue;
		}
		current += char;
	}
	segments.push(current);

	return segments.map((segment) => segment.trim()).filter(Boolean);
}

function splitList(raw: string): string[] {
	return raw
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

type Bounds = { min?: number; max?: number };

/** Applies one comparison to the running bounds of a numeric filter. */
function applyComparison(
	bounds: Bounds,
	op: string,
	value: number,
	integer: boolean,
): Bounds {
	const next = { ...bounds };
	const step = integer ? 1 : 0;
	const raise = (candidate: number) => {
		next.min = next.min == null ? candidate : Math.max(next.min, candidate);
	};
	const lower = (candidate: number) => {
		next.max = next.max == null ? candidate : Math.min(next.max, candidate);
	};

	switch (op) {
		case "<":
			lower(value - step);
			break;
		case "<=":
			lower(value);
			break;
		case ">":
			raise(value + step);
			break;
		case ">=":
			raise(value);
			break;
		default:
			raise(value);
			lower(value);
	}
	return next;
}

export function parseBookFilterSegments(
	segments: readonly string[],
): BookFilterParseResult {
	const bounds = new Map<NumericKey, Bounds>();
	const filters: BookFilterSpec = {};
	const authors = new Set<string>();
	const countries = new Set<string>();
	const statuses = new Set<BookFilterStatus>();
	let viewerRead: "read" | "unread" | undefined;

	for (const raw of segments) {
		const segment = raw.trim().toLowerCase();
		if (!segment) {
			continue;
		}

		const readFlag = READ_FLAGS[segment];
		if (readFlag) {
			if (viewerRead && viewerRead !== readFlag) {
				return {
					ok: false,
					error: "Use either ir (I read) or nr (not read), not both.",
				};
			}
			viewerRead = readFlag;
			continue;
		}

		const numeric = NUMERIC_PATTERN.exec(segment);
		if (numeric) {
			const key = numeric[1] as NumericKey;
			const config = NUMERIC_KEYS[key];
			const value = Number(numeric[3]);
			if (config.integer && !Number.isInteger(value)) {
				return {
					ok: false,
					error: `${config.label} needs a whole number, got ${numeric[3]}.`,
				};
			}
			bounds.set(
				key,
				applyComparison(
					bounds.get(key) ?? {},
					numeric[2] as string,
					value,
					config.integer,
				),
			);
			continue;
		}

		const list = LIST_PATTERN.exec(segment);
		const statusEquals = STATUS_EQUALS_PATTERN.exec(segment);
		if (list || statusEquals) {
			const key = list ? (list[1] as string) : "w";
			const items = list
				? splitList(list[2] as string)
				: [statusEquals?.[1] as string];
			if (items.length === 0) {
				return { ok: false, error: `${key}[…] needs at least one value.` };
			}

			if (key === "a") {
				for (const name of items) {
					const slug = authorNameToSlug(name);
					if (!slug) {
						return { ok: false, error: `"${name}" is not a valid author.` };
					}
					authors.add(slug);
				}
			} else if (key === "c") {
				for (const code of items) {
					const parsed = bookCountryCodeSchema.safeParse(code);
					if (!parsed.success) {
						return {
							ok: false,
							error: `"${code}" is not a country code (try uk, us, ru).`,
						};
					}
					countries.add(parsed.data);
				}
			} else {
				for (const item of items) {
					const status = STATUS_LETTERS[item];
					if (!status) {
						return {
							ok: false,
							error: `"${item}" is not a status. Use w (wishlist), r (reading) or c (completed).`,
						};
					}
					statuses.add(status);
				}
			}
			continue;
		}

		return {
			ok: false,
			error: `Unknown filter "${raw.trim()}". Try p<300, y>1990, a[orwell], ir or nr.`,
		};
	}

	for (const [key, range] of bounds) {
		const config = NUMERIC_KEYS[key];
		const min = range.min;
		const max = range.max;

		if (min != null && max != null && min > max) {
			return {
				ok: false,
				error: `Impossible ${config.label} range: at least ${min} but at most ${max}.`,
			};
		}
		if (max != null && max < config.floor) {
			return {
				ok: false,
				error: `No book can have ${config.label} below ${config.floor}.`,
			};
		}
		if (min != null && min > config.ceiling) {
			return {
				ok: false,
				error: `${config.label} cannot be above ${config.ceiling}.`,
			};
		}

		if (min != null) {
			(filters as Record<string, number>)[config.min as string] = Math.max(
				min,
				config.floor,
			);
		}
		if (max != null) {
			(filters as Record<string, number>)[config.max as string] = Math.min(
				max,
				config.ceiling,
			);
		}
	}

	if (authors.size > 0) filters.authors = [...authors];
	if (countries.size > 0) filters.countries = [...countries];
	if (statuses.size > 0) filters.statuses = [...statuses];
	if (viewerRead) filters.viewerRead = viewerRead;

	return { ok: true, filters };
}

/** Parses `p<300:ir` style text (no command root). */
export function parseBookFilterText(text: string): BookFilterParseResult {
	return parseBookFilterSegments(splitFilterSegments(text));
}
