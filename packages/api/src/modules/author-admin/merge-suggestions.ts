import {
	authorNameSimilarity,
	LIKELY_SAME_AUTHOR_SCORE,
	looseAuthorKey,
} from "@bbrc/shared";

export type SuggestAuthor = {
	id: string;
	name: string;
	wikidataId: string | null;
	openLibraryId: string | null;
	/** An admin confirmed this record as a real, separate person. */
	verified: boolean;
	aliases?: readonly string[];
};

export type MergeSuggestion = {
	aId: string;
	bId: string;
	reason: "wikidata_id" | "openlibrary_id" | "similar_name";
	score: number;
};

function surnameBucket(name: string): string {
	const tokens = looseAuthorKey(name).split(" ").filter(Boolean);
	return tokens[tokens.length - 1]?.slice(0, 2) ?? "";
}

/**
 * Pairs of authors that may be the same person: the same Wikidata or Open Library id, or
 * names alike enough (spelling variants). Two authors an admin has confirmed are left alone:
 * confirming says "this is a distinct person", so the pair is not raised again unless an
 * outside id says they are one.
 */
export function findMergeSuggestions(
	authors: readonly SuggestAuthor[],
): MergeSuggestion[] {
	const out = new Map<string, MergeSuggestion>();
	const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

	const byWikidata = new Map<string, SuggestAuthor[]>();
	for (const author of authors) {
		if (!author.wikidataId) continue;
		const list = byWikidata.get(author.wikidataId) ?? [];
		list.push(author);
		byWikidata.set(author.wikidataId, list);
	}
	for (const group of byWikidata.values()) {
		for (let i = 0; i < group.length; i++) {
			for (let j = i + 1; j < group.length; j++) {
				const a = group[i] as SuggestAuthor;
				const b = group[j] as SuggestAuthor;
				out.set(pairKey(a.id, b.id), {
					aId: a.id,
					bId: b.id,
					reason: "wikidata_id",
					score: 1,
				});
			}
		}
	}

	// Surname bucket first, so a few thousand authors do not mean millions of comparisons.
	const buckets = new Map<string, SuggestAuthor[]>();
	for (const author of authors) {
		const labels = [author.name, ...(author.aliases ?? [])];
		for (const bucket of new Set(labels.map(surnameBucket))) {
			const list = buckets.get(bucket) ?? [];
			list.push(author);
			buckets.set(bucket, list);
		}
	}
	for (const group of buckets.values()) {
		for (let i = 0; i < group.length; i++) {
			for (let j = i + 1; j < group.length; j++) {
				const a = group[i] as SuggestAuthor;
				const b = group[j] as SuggestAuthor;
				const key = pairKey(a.id, b.id);
				if (out.has(key) || (a.verified && b.verified)) continue;
				let best = 0;
				for (const left of [a.name, ...(a.aliases ?? [])]) {
					for (const right of [b.name, ...(b.aliases ?? [])]) {
						best = Math.max(best, authorNameSimilarity(left, right));
					}
				}
				if (best >= LIKELY_SAME_AUTHOR_SCORE) {
					out.set(key, {
						aId: a.id,
						bId: b.id,
						reason: "similar_name",
						score: best,
					});
				}
			}
		}
	}

	return [...out.values()].sort((x, y) => y.score - x.score);
}
