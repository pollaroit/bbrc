/** Feature weights for content-based Open Library recommendations. */
export const RECOMMENDATION_WEIGHTS = {
	authors: 1,
	subjects: 0.8,
	publishedYear: 0.3,
	subjectTimes: 0.15,
	subjectPeople: 0.15,
	openLibraryRating: 0.1,
} as const;

export const RECOMMENDATION_RESULT_LIMIT = 5;
export const CANDIDATE_POOL_LIMIT = 48;
export const OPEN_LIBRARY_SEARCH_LIMIT = 12;
export const TOP_PROFILE_AUTHORS = 3;
export const TOP_PROFILE_SUBJECTS = 5;
export const RECOMMENDATION_CACHE_TTL_MS = 10 * 60 * 1000;

export const RECOMMENDATION_MAX_WEIGHTED_SCORE = Object.values(
	RECOMMENDATION_WEIGHTS,
).reduce((sum, weight) => sum + weight, 0);

/** Pre-scored alternates kept after the initial stream for fast swaps. */
export const RECOMMENDATION_RESERVE_SIZE = 12;
