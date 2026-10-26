/**
 * Reading comparison between two members: how much of their reading overlaps and how closely
 * their ratings agree. Pure functions, shared by the member compare page and the admin stats.
 */

/** Ratings run from 0 to 5 (half steps), see `Feedback.rating`. */
export const COMPARE_MAX_RATING = 5;

/** Share of the overall score that comes from the overlap of the books read. */
export const OVERLAP_WEIGHT = 0.6;
/** Share of the overall score that comes from how closely the ratings agree. */
export const RATING_WEIGHT = 0.4;
/** Books both rated before the rating part counts fully; with fewer it is pulled toward neutral. */
export const RATING_FULL_WEIGHT_AT = 5;
/** What the rating part is pulled toward while there are few co-rated books. */
export const RATING_NEUTRAL = 50;

export type CompareRead = { bookId: string; rating: number | null };

export type CompareConfidence = "low" | "medium" | "high";

export type ComparePerBook = {
	bookId: string;
	/** 0–100 rating agreement for this book, null when either member did not rate it. */
	score: number | null;
	ratingA: number | null;
	ratingB: number | null;
	/** Absolute rating gap, null when either member did not rate it. */
	diff: number | null;
};

export type CompareScore = {
	/** 0–100, whole number. */
	overall: number;
	/** Jaccard overlap of the two read sets, 0–100. */
	overlap: number;
	/** Average rating agreement over co-rated books, 0–100; null with no co-rated books. */
	ratingAgreement: number | null;
	sharedCount: number;
	onlyACount: number;
	onlyBCount: number;
	coRatedCount: number;
	perBook: ComparePerBook[];
	confidence: CompareConfidence;
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

/** 100 for the same rating, dropping linearly to 0 for the largest possible gap. */
export function ratingAgreementScore(ratingA: number, ratingB: number): number {
	return clamp(
		100 * (1 - Math.abs(ratingA - ratingB) / COMPARE_MAX_RATING),
		0,
		100,
	);
}

function readMap(reads: CompareRead[]): Map<string, number | null> {
	const map = new Map<string, number | null>();
	for (const read of reads) map.set(read.bookId, read.rating);
	return map;
}

function confidenceFor(
	sharedCount: number,
	coRatedCount: number,
): CompareConfidence {
	if (sharedCount >= 10 && coRatedCount >= RATING_FULL_WEIGHT_AT) return "high";
	if (sharedCount >= 4) return "medium";
	return "low";
}

export function scoreComparison(
	a: CompareRead[],
	b: CompareRead[],
): CompareScore {
	const mapA = readMap(a);
	const mapB = readMap(b);

	const perBook: ComparePerBook[] = [];
	let sharedCount = 0;
	let ratingSum = 0;
	let coRatedCount = 0;

	for (const [bookId, ratingA] of mapA) {
		if (!mapB.has(bookId)) continue;
		sharedCount += 1;
		const ratingB = mapB.get(bookId) ?? null;
		if (ratingA != null && ratingB != null) {
			const score = ratingAgreementScore(ratingA, ratingB);
			ratingSum += score;
			coRatedCount += 1;
			perBook.push({
				bookId,
				score,
				ratingA,
				ratingB,
				diff: Math.abs(ratingA - ratingB),
			});
		} else {
			perBook.push({ bookId, score: null, ratingA, ratingB, diff: null });
		}
	}

	const onlyACount = mapA.size - sharedCount;
	const onlyBCount = mapB.size - sharedCount;
	const unionCount = sharedCount + onlyACount + onlyBCount;
	const overlap = unionCount === 0 ? 0 : (100 * sharedCount) / unionCount;
	const ratingAgreement = coRatedCount === 0 ? null : ratingSum / coRatedCount;

	let overall: number;
	if (sharedCount === 0) {
		overall = 0;
	} else if (ratingAgreement == null) {
		overall = overlap;
	} else {
		const weight = Math.min(1, coRatedCount / RATING_FULL_WEIGHT_AT);
		const shrunk = weight * ratingAgreement + (1 - weight) * RATING_NEUTRAL;
		overall = OVERLAP_WEIGHT * overlap + RATING_WEIGHT * shrunk;
	}

	return {
		overall: clamp(Math.round(overall), 0, 100),
		overlap: Math.round(overlap),
		ratingAgreement:
			ratingAgreement == null ? null : Math.round(ratingAgreement),
		sharedCount,
		onlyACount,
		onlyBCount,
		coRatedCount,
		perBook,
		confidence: confidenceFor(sharedCount, coRatedCount),
	};
}

/** Same key for (a, b) and (b, a), for pair maps. */
export function pairKey(a: string, b: string): string {
	return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Mean of the `k` highest scores (all of them when fewer); 0 for an empty list. */
export function topKMean(scores: number[], k: number): number {
	if (scores.length === 0 || k <= 0) return 0;
	const top = [...scores].sort((x, y) => y - x).slice(0, k);
	return top.reduce((sum, score) => sum + score, 0) / top.length;
}

export type ScoreBand = {
	key: "twins" | "very_similar" | "some_overlap" | "different" | "none";
	label: string;
};

export function describeScoreBand(overall: number): ScoreBand {
	if (overall >= 85) return { key: "twins", label: "Reading twins" };
	if (overall >= 60) return { key: "very_similar", label: "Very similar" };
	if (overall >= 30) return { key: "some_overlap", label: "Some overlap" };
	if (overall >= 1) return { key: "different", label: "Different shelves" };
	return { key: "none", label: "Nothing in common" };
}

/** "You agree on 4 of 6 shared books" style line; `agreeWithin` is the rating gap that counts as agreeing. */
export function compareSummaryLine(
	score: CompareScore,
	agreeWithin = 0.5,
): string {
	if (score.sharedCount === 0)
		return "You have not read any of the same books yet.";
	const shared =
		score.sharedCount === 1
			? "1 shared book"
			: `${score.sharedCount} shared books`;
	if (score.coRatedCount === 0)
		return `You both read ${shared}, but not both rated them.`;
	const agree = score.perBook.filter(
		(book) => book.diff != null && book.diff <= agreeWithin,
	).length;
	return `You agree on ${agree} of ${score.coRatedCount} books you both rated (${shared}).`;
}
