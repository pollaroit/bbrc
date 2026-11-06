/*
 * Where a member stands among everyone on one number ("#3 of 14 in posts"). It is
 * worked out over every member, private ones included, and only the position is
 * shown, so nobody else is identified.
 */

export type StatsRank = {
	/** 1 is the highest value. Members with the same value share a place. */
	rank: number;
	/** How many members were compared. */
	of: number;
};

/**
 * `allValues` holds one number per member and includes the member being ranked.
 * Returns null when the member would be ranked alone (a rank of "#1 of 1" says nothing)
 * or when the value is zero (nobody is ranked for something they have not done).
 */
export function rankOf(
	value: number,
	allValues: readonly number[],
): StatsRank | null {
	if (value <= 0 || allValues.length < 2) return null;
	let better = 0;
	for (const other of allValues) {
		if (other > value) better += 1;
	}
	return { rank: better + 1, of: allValues.length };
}

/** "Top 20%" style share for a rank, rounded up so #1 of 14 reads "top 8%", never "top 0%". */
export function topPercent(rank: StatsRank): number {
	return Math.max(1, Math.ceil((rank.rank / rank.of) * 100));
}
