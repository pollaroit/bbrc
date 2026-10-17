export function formatPollChipRankLabel(rank: 1 | 2 | null): string | null {
	if (rank === 1) {
		return "Rank 1 · Golden & Silver chips";
	}

	if (rank === 2) {
		return "Rank 2 · Silver chip";
	}

	return null;
}
