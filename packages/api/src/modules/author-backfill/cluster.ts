import { authorNameKey, authorNameSimilarity } from "@bbrc/shared";

export type BackfillBook = {
	id: string;
	olid: string;
	slug: string;
	title: string;
	excerpt: string | null;
	/** The names copy, in author order. */
	authors: string[];
};

export type NameCluster = {
	/** `authorNameKey` shared by every spelling in the cluster. */
	key: string;
	/** The spelling we keep as the author's name: the most used one, then the fullest. */
	name: string;
	/** Every spelling seen, most used first. */
	variants: string[];
	bookIds: string[];
};

/**
 * Groups the author names found on books into one cluster per person-by-name:
 * names that only differ in case, accents, dots, initials spacing or "Last, First" order
 * are one cluster. (Alike-but-different spellings stay apart: those are suggestions, not facts.)
 */
export function clusterAuthorNames(
	books: readonly Pick<BackfillBook, "id" | "authors">[],
): NameCluster[] {
	type Acc = { counts: Map<string, number>; bookIds: Set<string> };
	const byKey = new Map<string, Acc>();

	for (const book of books) {
		for (const raw of book.authors) {
			const name = raw.replace(/\s+/g, " ").trim();
			const key = authorNameKey(name);
			if (!key) continue;
			const acc = byKey.get(key) ?? {
				counts: new Map<string, number>(),
				bookIds: new Set<string>(),
			};
			acc.counts.set(name, (acc.counts.get(name) ?? 0) + 1);
			acc.bookIds.add(book.id);
			byKey.set(key, acc);
		}
	}

	return [...byKey.entries()]
		.map(([key, acc]) => {
			const variants = [...acc.counts.entries()]
				.sort(
					(a, b) =>
						b[1] - a[1] ||
						// "Last, First" is a filing form: show the natural order when both exist.
						Number(a[0].includes(",")) - Number(b[0].includes(",")) ||
						b[0].length - a[0].length ||
						a[0].localeCompare(b[0]),
				)
				.map(([name]) => name);
			return {
				key,
				name: variants[0] as string,
				variants,
				bookIds: [...acc.bookIds],
			};
		})
		.sort(
			(a, b) =>
				b.bookIds.length - a.bookIds.length || a.name.localeCompare(b.name),
		);
}

/** How alike a work's listed name and an Open Library author record must be to trust the mapping. */
export const OLID_MAPPING_MIN_SIMILARITY = 0.5;
const COUNT_MISMATCH_MIN_SIMILARITY = 0.85;

export type OlidMappingInput = {
	/** The book's names, in order. */
	bookNames: readonly string[];
	/** The name we want the id for (one of `bookNames`, any spelling of its cluster). */
	name: string;
	/** The author ids the work record lists, in order. */
	workOlids: readonly string[];
	/** The names of each Open Library record (name + alternates), by id; loaded lazily by the caller. */
	namesByOlid: ReadonlyMap<string, readonly string[]>;
};

/** Which of the ids needs a lookup before a choice can be made (all of them when counts differ). */
export function olidsToLookUp(
	input: Pick<OlidMappingInput, "bookNames" | "name" | "workOlids">,
): string[] {
	const { bookNames, name, workOlids } = input;
	if (workOlids.length === 0) return [];
	if (bookNames.length === workOlids.length) {
		const index = bookNames.findIndex(
			(candidate) => authorNameKey(candidate) === authorNameKey(name),
		);
		const id = workOlids[index];
		return index >= 0 && id ? [id] : [];
	}
	return workOlids.slice(0, 4);
}

/**
 * The exact mapping from a work record: when the book lists as many names as the work lists
 * author ids, the id at the same place; otherwise the one record whose names match.
 * Either way the chosen record's name must resemble the book's, so a reordered or
 * different list never links a wrong person. Null when it cannot be told.
 */
export function pickOlidForName(input: OlidMappingInput): string | null {
	const best = (olid: string): number =>
		Math.max(
			0,
			...(input.namesByOlid.get(olid) ?? []).map((candidate) =>
				authorNameSimilarity(candidate, input.name),
			),
		);

	if (input.bookNames.length === input.workOlids.length) {
		const [olid] = olidsToLookUp(input);
		return olid && best(olid) >= OLID_MAPPING_MIN_SIMILARITY ? olid : null;
	}

	let chosen: string | null = null;
	let score = 0;
	for (const olid of input.workOlids.slice(0, 4)) {
		const value = best(olid);
		if (value >= COUNT_MISMATCH_MIN_SIMILARITY && value > score) {
			chosen = olid;
			score = value;
		}
	}
	return chosen;
}

/** The id several books agree on (the most frequent one). */
export function mostCommon<T>(values: readonly T[]): T | null {
	const counts = new Map<T, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	let best: T | null = null;
	let bestCount = 0;
	for (const [value, count] of counts) {
		if (count > bestCount) {
			best = value;
			bestCount = count;
		}
	}
	return best;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
	const out: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		out.push(items.slice(index, index + size));
	}
	return out;
}

/** Start of the club's day as an ISO string, to count "today" without time zone surprises. */
export function startOfUtcDay(now: Date): string {
	return new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	).toISOString();
}
