/**
 * Weight poll options by how many sitting participants have not read each book yet.
 * Weight for a book = (N - k) / N where N = participant count at create time and
 * k = participants who have marked the book read.
 */

export function participantReadWeight(
	participantCount: number,
	readersAmongParticipants: number,
): number {
	if (participantCount <= 0) {
		return 0;
	}

	const k = Math.min(Math.max(0, readersAmongParticipants), participantCount);
	return (participantCount - k) / participantCount;
}

export type PickWeightedPollBooksResult = {
	bookIds: string[];
	/** True if at least one draw used uniform fallback (all eligible weights were zero). */
	usedUniformFallback: boolean;
};

function pickIndexByWeight(weights: number[], random: () => number): number {
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	if (total <= 0) {
		return Math.floor(random() * weights.length);
	}

	let threshold = random() * total;
	for (let index = 0; index < weights.length; index += 1) {
		const weight = weights[index] ?? 0;
		threshold -= weight;
		if (threshold <= 0) {
			return index;
		}
	}

	return weights.length - 1;
}

export function pickWeightedPollBookIds(
	bookIds: string[],
	readCountByBookId: ReadonlyMap<string, number>,
	participantCount: number,
	take: number,
	random: () => number = Math.random,
): PickWeightedPollBooksResult {
	const pool = [...bookIds];
	const selected: string[] = [];
	let usedUniformFallback = false;

	while (selected.length < take && pool.length > 0) {
		const weights = pool.map((bookId) =>
			participantReadWeight(
				participantCount,
				readCountByBookId.get(bookId) ?? 0,
			),
		);

		const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
		const effectiveWeights = weightSum > 0 ? weights : weights.map(() => 1);
		if (weightSum <= 0) {
			usedUniformFallback = true;
		}

		const index = pickIndexByWeight(effectiveWeights, random);
		const [bookId] = pool.splice(index, 1);
		if (bookId) {
			selected.push(bookId);
		}
	}

	return { bookIds: selected, usedUniformFallback };
}

export function pickOneWeightedPollBookId(
	bookIds: string[],
	excludeBookIds: ReadonlySet<string>,
	readCountByBookId: ReadonlyMap<string, number>,
	participantCount: number,
	random: () => number = Math.random,
): { bookId: string | null; usedUniformFallback: boolean } {
	const pool = bookIds.filter((bookId) => !excludeBookIds.has(bookId));

	if (pool.length === 0) {
		return { bookId: null, usedUniformFallback: false };
	}

	const { bookIds: picked, usedUniformFallback } = pickWeightedPollBookIds(
		pool,
		readCountByBookId,
		participantCount,
		1,
		random,
	);

	return {
		bookId: picked[0] ?? null,
		usedUniformFallback,
	};
}
