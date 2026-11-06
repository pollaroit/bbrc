/*
 * "Rated higher / lower than the club". A member's own rating is taken out of the
 * club average for each book, because it would pull the average toward them and
 * hide how far apart they really are. A book needs enough OTHER ratings to say
 * anything about the club; one rated only by the member is left out completely.
 */

/** Fewest ratings from other members a book needs to be compared. Loosen as the club grows. */
export const MIN_OTHER_RATINGS = 2;

/** How many books each side shows. */
export const RATING_COMPARE_LIMIT = 6;

/** What the club says about a book, everyone's ratings included. */
export type ClubRatingFacts = {
	ratingSum: number;
	ratingCount: number;
};

export type RatingCompareInput = {
	bookId: string;
	/** The member's own rating. */
	mine: number;
	club: ClubRatingFacts;
};

export type RatingCompareRow = {
	bookId: string;
	mine: number;
	/** The club average with the member's own rating taken out. */
	othersAverage: number;
	othersCount: number;
	/** `mine` minus `othersAverage`, to two decimals. */
	delta: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** The club average without the member's rating, or null when too few others rated the book. */
export function averageWithoutMine(
	mine: number,
	club: ClubRatingFacts,
	minOthers = MIN_OTHER_RATINGS,
): { average: number; count: number } | null {
	const count = club.ratingCount - 1;
	if (count < Math.max(1, minOthers)) return null;
	return { average: (club.ratingSum - mine) / count, count };
}

export type RatingCompareResult = {
	/** Books the member liked more than the others did, biggest gap first. */
	higher: RatingCompareRow[];
	/** Books the member liked less than the others did, biggest gap first. */
	lower: RatingCompareRow[];
	/** Books with a rating of the member's that had too few others to compare. */
	skipped: number;
};

export function ratedVersusClub(
	rows: readonly RatingCompareInput[],
	options: { minOthers?: number; limit?: number } = {},
): RatingCompareResult {
	const limit = options.limit ?? RATING_COMPARE_LIMIT;
	const compared: RatingCompareRow[] = [];
	let skipped = 0;

	for (const row of rows) {
		const others = averageWithoutMine(row.mine, row.club, options.minOthers);
		if (!others) {
			skipped += 1;
			continue;
		}
		const delta = round2(row.mine - others.average);
		if (delta === 0) continue;
		compared.push({
			bookId: row.bookId,
			mine: row.mine,
			othersAverage: round2(others.average),
			othersCount: others.count,
			delta,
		});
	}

	return {
		higher: compared
			.filter((row) => row.delta > 0)
			.sort((a, b) => b.delta - a.delta || b.othersCount - a.othersCount)
			.slice(0, limit),
		lower: compared
			.filter((row) => row.delta < 0)
			.sort((a, b) => a.delta - b.delta || b.othersCount - a.othersCount)
			.slice(0, limit),
		skipped,
	};
}
