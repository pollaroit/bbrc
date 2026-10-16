export type ReadingStreakParticipation = {
	progress: "not_started" | "in_progress" | "completed" | "dnf";
	sittingSlug: string;
	finishedAtMs: number;
};

export type ReadingStreak = {
	current: number;
	best: number;
	asOfSittingSlug: string | null;
	/** Newest-first slugs in the active streak (empty when current is 0). */
	currentSittingSlugs: readonly string[];
	/** Chronological order (oldest → newest) for one longest completed run. */
	bestSittingSlugs: readonly string[];
};

function compareFinishedAt(
	a: ReadingStreakParticipation,
	b: ReadingStreakParticipation,
) {
	return a.finishedAtMs - b.finishedAtMs;
}

/**
 * Consecutive finished sittings (newest first) where progress is `completed`.
 * Gaps in club sittings do not break the streak — only non-completed participations do.
 */
export function computeReadingStreak(
	participations: readonly ReadingStreakParticipation[],
): ReadingStreak {
	if (participations.length === 0) {
		return {
			current: 0,
			best: 0,
			asOfSittingSlug: null,
			currentSittingSlugs: [],
			bestSittingSlugs: [],
		};
	}

	const byNewest = [...participations].toSorted((a, b) =>
		compareFinishedAt(b, a),
	);

	const currentSittingSlugs: string[] = [];
	let asOfSittingSlug: string | null = null;

	for (const row of byNewest) {
		if (row.progress !== "completed") {
			break;
		}
		currentSittingSlugs.push(row.sittingSlug);
		if (asOfSittingSlug == null) {
			asOfSittingSlug = row.sittingSlug;
		}
	}

	const byOldest = [...participations].toSorted(compareFinishedAt);

	let best = 0;
	let run = 0;
	let runSlugs: string[] = [];
	let bestSittingSlugs: string[] = [];

	for (const row of byOldest) {
		if (row.progress === "completed") {
			run += 1;
			runSlugs.push(row.sittingSlug);
			if (run > best) {
				best = run;
				bestSittingSlugs = [...runSlugs];
			}
		} else {
			run = 0;
			runSlugs = [];
		}
	}

	return {
		current: currentSittingSlugs.length,
		best,
		asOfSittingSlug,
		currentSittingSlugs,
		bestSittingSlugs,
	};
}

export const READING_STREAK_TOOLTIP =
	"Consecutive club sittings you finished (completed). DNF or unfinished sittings break the run.";
