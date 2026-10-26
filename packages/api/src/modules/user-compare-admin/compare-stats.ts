/**
 * Pure helpers behind `userCompareAdmin.stats`: building every pair score, applying the
 * thresholds, ranking members and shaping the chart data. No database, no scoring formula
 * (the scorer is passed in so these stay testable on their own).
 */

/** A member needs at least this many reads (in the filtered universe) to be ranked at all. */
export const MIN_READS = 3;
/** A pair is listed in the top/bottom 10 with at least this many shared books... */
export const PAIR_MIN_SHARED = 3;
/** ...or when each of the two has at least this many reads. */
export const PAIR_MIN_READS_EACH = 5;
/** A member's "similarity to the club" is the mean of their best TOP_K pair scores. */
export const TOP_K = 5;
export const MATRIX_MAX_MEMBERS = 30;
export const RANKED_PAIRS = 10;
export const RANKED_MEMBERS = 5;
export const DISTRIBUTION_BUCKETS = 10;

export type StatsRead = { bookId: string; rating: number | null };

export type StatsMember<U> = { userId: string; user: U; reads: StatsRead[] };

export type PairScore = {
	overall: number;
	overlap: number;
	ratingAgreement: number | null;
	sharedCount: number;
	coRatedCount: number;
};

export type PairScorer = (a: StatsRead[], b: StatsRead[]) => PairScore;

export type Pair<U> = PairScore & {
	a: StatsMember<U>;
	b: StatsMember<U>;
	/** Passes the thresholds for the top/bottom lists. */
	listed: boolean;
};

export function mean(values: readonly number[]): number {
	if (values.length === 0) return 0;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

/** Mean of the best `k` values (all of them when there are fewer than `k`). */
export function topKMean(values: readonly number[], k: number = TOP_K): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((x, y) => y - x);
	return mean(sorted.slice(0, k));
}

export function isListedPair(
	sharedCount: number,
	readsA: number,
	readsB: number,
): boolean {
	return (
		sharedCount >= PAIR_MIN_SHARED ||
		(readsA >= PAIR_MIN_READS_EACH && readsB >= PAIR_MIN_READS_EACH)
	);
}

/** Members who have enough reads to be compared at all. */
export function eligibleMembers<U>(
	members: readonly StatsMember<U>[],
): StatsMember<U>[] {
	return members.filter((member) => member.reads.length >= MIN_READS);
}

/** Scores every unordered pair of eligible members once (a is listed before b). */
export function buildPairs<U>(
	members: readonly StatsMember<U>[],
	score: PairScorer,
): Pair<U>[] {
	const eligible = eligibleMembers(members);
	const pairs: Pair<U>[] = [];
	for (let i = 0; i < eligible.length; i++) {
		const a = eligible[i] as StatsMember<U>;
		for (let j = i + 1; j < eligible.length; j++) {
			const b = eligible[j] as StatsMember<U>;
			const result = score(a.reads, b.reads);
			pairs.push({
				...result,
				a,
				b,
				listed: isListedPair(
					result.sharedCount,
					a.reads.length,
					b.reads.length,
				),
			});
		}
	}
	return pairs;
}

/** Highest first; ties go to more shared books, then to the member names for a stable order. */
function compareDescending<U>(
	x: Pair<U>,
	y: Pair<U>,
	nameOf: (user: U) => string,
): number {
	return (
		y.overall - x.overall ||
		y.sharedCount - x.sharedCount ||
		`${nameOf(x.a.user)}|${nameOf(x.b.user)}`.localeCompare(
			`${nameOf(y.a.user)}|${nameOf(y.b.user)}`,
		)
	);
}

export function rankPairs<U>(
	pairs: readonly Pair<U>[],
	nameOf: (user: U) => string,
	limit: number = RANKED_PAIRS,
): { top: Pair<U>[]; bottom: Pair<U>[] } {
	const listed = pairs.filter((pair) => pair.listed);
	const descending = [...listed].sort((x, y) =>
		compareDescending(x, y, nameOf),
	);
	const ascending = [...listed].sort(
		(x, y) =>
			x.overall - y.overall ||
			y.sharedCount - x.sharedCount ||
			compareDescending(y, x, nameOf),
	);
	return { top: descending.slice(0, limit), bottom: ascending.slice(0, limit) };
}

export type MemberAggregate<U> = {
	member: StatsMember<U>;
	booksRead: number;
	/** Mean of the member's best TOP_K pair scores. */
	similarity: number;
	/** Mean over every pair the member is in. */
	meanScore: number;
	peers: number;
	closest: {
		member: StatsMember<U>;
		score: number;
		sharedCount: number;
	} | null;
};

/** One row per eligible member with at least one peer. */
export function aggregateMembers<U>(
	pairs: readonly Pair<U>[],
): MemberAggregate<U>[] {
	const byMember = new Map<
		string,
		{
			member: StatsMember<U>;
			scores: number[];
			closest: MemberAggregate<U>["closest"];
		}
	>();
	const touch = (
		member: StatsMember<U>,
		other: StatsMember<U>,
		pair: Pair<U>,
	) => {
		const entry = byMember.get(member.userId) ?? {
			member,
			scores: [],
			closest: null,
		};
		entry.scores.push(pair.overall);
		if (
			!entry.closest ||
			pair.overall > entry.closest.score ||
			(pair.overall === entry.closest.score &&
				pair.sharedCount > entry.closest.sharedCount)
		) {
			entry.closest = {
				member: other,
				score: pair.overall,
				sharedCount: pair.sharedCount,
			};
		}
		byMember.set(member.userId, entry);
	};
	for (const pair of pairs) {
		touch(pair.a, pair.b, pair);
		touch(pair.b, pair.a, pair);
	}
	return [...byMember.values()].map((entry) => ({
		member: entry.member,
		booksRead: entry.member.reads.length,
		similarity: round1(topKMean(entry.scores)),
		meanScore: round1(mean(entry.scores)),
		peers: entry.scores.length,
		closest: entry.closest,
	}));
}

export function rankMembers<U>(
	aggregates: readonly MemberAggregate<U>[],
	nameOf: (user: U) => string,
	limit: number = RANKED_MEMBERS,
): { mostSimilar: MemberAggregate<U>[]; mostUnique: MemberAggregate<U>[] } {
	const byName = (x: MemberAggregate<U>, y: MemberAggregate<U>) =>
		nameOf(x.member.user).localeCompare(nameOf(y.member.user));
	const mostSimilar = [...aggregates]
		.sort((x, y) => y.similarity - x.similarity || byName(x, y))
		.slice(0, limit);
	const mostUnique = [...aggregates]
		.sort((x, y) => x.meanScore - y.meanScore || byName(x, y))
		.slice(0, limit);
	return { mostSimilar, mostUnique };
}

/** Members shown in the matrix: those with the most reads (ties by name), at most `max`. */
export function selectMatrixMembers<U>(
	members: readonly StatsMember<U>[],
	nameOf: (user: U) => string,
	max: number = MATRIX_MAX_MEMBERS,
): StatsMember<U>[] {
	return [...eligibleMembers(members)]
		.sort(
			(x, y) =>
				y.reads.length - x.reads.length ||
				nameOf(x.user).localeCompare(nameOf(y.user)),
		)
		.slice(0, max);
}

/** Square matrix of overall scores for `members` (null on the diagonal and for missing pairs). */
export function buildMatrix<U>(
	members: readonly StatsMember<U>[],
	pairs: readonly Pair<U>[],
): (number | null)[][] {
	const index = new Map(members.map((member, i) => [member.userId, i]));
	const matrix: (number | null)[][] = members.map(() =>
		members.map(() => null),
	);
	for (const pair of pairs) {
		const i = index.get(pair.a.userId);
		const j = index.get(pair.b.userId);
		if (i == null || j == null) continue;
		(matrix[i] as (number | null)[])[j] = pair.overall;
		(matrix[j] as (number | null)[])[i] = pair.overall;
	}
	return matrix;
}

/** Ten buckets: 0–9, 10–19 … 90–100 (a score of 100 lands in the last one). */
export function scoreHistogram(
	scores: readonly number[],
): { from: number; to: number; count: number }[] {
	const size = 100 / DISTRIBUTION_BUCKETS;
	const buckets = Array.from({ length: DISTRIBUTION_BUCKETS }, (_, i) => ({
		from: i * size,
		to: i === DISTRIBUTION_BUCKETS - 1 ? 100 : (i + 1) * size - 1,
		count: 0,
	}));
	for (const score of scores) {
		const clamped = Math.min(100, Math.max(0, score));
		const index = Math.min(
			DISTRIBUTION_BUCKETS - 1,
			Math.floor(clamped / size),
		);
		(buckets[index] as { count: number }).count += 1;
	}
	return buckets;
}

type Window = { from?: Date; to?: Date };

/**
 * A read counts when its finish month overlaps the window; a read without a date is left out
 * while a window is set (same rule as the author stats).
 */
export function readInWindow(
	read: { readEndYear: number | null; readEndMonth: number | null },
	window: Window,
): boolean {
	if (!window.from && !window.to) return true;
	if (read.readEndYear == null) return false;
	const month = read.readEndMonth ?? 1;
	const start = Date.UTC(read.readEndYear, month - 1, 1);
	const end =
		read.readEndMonth == null
			? Date.UTC(read.readEndYear + 1, 0, 1) - 1
			: Date.UTC(read.readEndYear, month, 1) - 1;
	if (window.from && end < window.from.getTime()) return false;
	if (window.to && start > window.to.getTime()) return false;
	return true;
}

/** Stable cache key: sorted, de-duplicated lists, dates as day strings. */
export function filtersCacheKey(filters: {
	users?: string[];
	books?: string[];
	authors?: string[];
	series?: string[];
	subjects?: string[];
	finishedFrom?: Date;
	finishedTo?: Date;
}): string {
	const list = (values?: string[]) =>
		values && values.length > 0
			? [...new Set(values.map((value) => value.trim().toLowerCase()))].sort()
			: null;
	const day = (value?: Date) =>
		value ? value.toISOString().slice(0, 10) : null;
	return JSON.stringify([
		list(filters.users),
		list(filters.books),
		list(filters.authors),
		list(filters.series),
		list(filters.subjects),
		day(filters.finishedFrom),
		day(filters.finishedTo),
	]);
}

/** A small in-process cache with a time to live (the club is small; a warm instance reuses it). */
export class TtlCache<T> {
	private readonly entries = new Map<string, { value: T; expiresAt: number }>();

	constructor(
		private readonly ttlMs: number,
		private readonly maxEntries: number,
	) {}

	get(key: string, now: number = Date.now()): T | undefined {
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt <= now) {
			this.entries.delete(key);
			return undefined;
		}
		return entry.value;
	}

	set(key: string, value: T, now: number = Date.now()): void {
		this.entries.delete(key);
		this.entries.set(key, { value, expiresAt: now + this.ttlMs });
		while (this.entries.size > this.maxEntries) {
			const oldest = this.entries.keys().next().value;
			if (oldest === undefined) break;
			this.entries.delete(oldest);
		}
	}

	clear(): void {
		this.entries.clear();
	}

	get size(): number {
		return this.entries.size;
	}
}
