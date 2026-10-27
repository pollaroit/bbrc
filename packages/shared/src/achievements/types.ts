/**
 * Achievements are defined in code (see `definitions.ts`) and evaluated from a
 * plain snapshot of a member's activity (`AchievementFacts`), so the logic is
 * pure and testable. Only the awards themselves are stored in the database.
 */

export const ACHIEVEMENT_CATEGORIES = [
	"reading",
	"sittings",
	"community",
	"library",
	"goals",
	"club",
] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

/** Parts of a member's activity an achievement needs, so triggers load only what changed. */
export const FACT_SECTIONS = [
	"reads",
	"reviews",
	"posts",
	"comments",
	"sittings",
	"votes",
	"goals",
	"shelves",
	"library",
	"quizzes",
	"profile",
	"views",
	"reading",
	"club",
] as const;
export type FactSection = (typeof FACT_SECTIONS)[number];

export type ReadFact = {
	bookId: string;
	/** When the read was marked on the site. */
	at: Date;
	/** When it counts for yearly achievements: the finish month when set, else when it was marked. */
	period: Date;
	pages: number;
	publishedIn: number;
	countries: string[];
	/** One key per author (the Author id, or the lower-case name before the backfill), so renames and merges count once. */
	authors: string[];
};

export type FeedbackFact = {
	createdAt: Date;
	length: number;
	likeTimes: Date[];
};

export type PostFact = { createdAt: Date; commentTimes: Date[] };

export type ParticipationFact = {
	progress: "not_started" | "in_progress" | "completed" | "dnf";
	/** When the sitting's reading period ends. */
	deadline: Date;
	/** When the member's progress last changed; for completed ones, roughly when they finished. */
	completedAt: Date;
};

export type VoteFact = {
	pollClosesAt: Date;
	votedAt: Date;
	/** True once the poll closed and one of the member's picks won. */
	pickedWinner: boolean;
	closed: boolean;
};

export type GoalFact = { createdAt: Date; completedAt: Date | null };

export type ShelfFact = { createdAt: Date; bookAddedTimes: Date[] };

/** The most opens an item has had, and when its count last changed. */
export type OpenedFact = { opens: number; at: Date };

/** How often others opened the member's things (never counting their own opens or bots). */
export type ViewFacts = {
	mostOpenedPost: OpenedFact | null;
	mostOpenedReview: OpenedFact | null;
	profileOpens: OpenedFact | null;
};

/** What the member's reading sessions and wishlist show. */
export type ReadingFacts = {
	/** When each reading session was finished on or before its sitting's deadline. */
	onTimeFinishes: Date[];
	/** The longest run of days with progress logged, and the day it ended. */
	longestStreak: { days: number; at: Date } | null;
	/** Books on the wishlist now, and when the shelf last changed. */
	wishlistSize: number;
	wishlistAt: Date | null;
};

export type SeriesFact = { id: string; bookIds: string[] };

export type AchievementFacts = {
	now: Date;
	/** IANA zone used to cut days, months and years (the club's). */
	timeZone: string;
	user: {
		createdAt: Date;
		/** 1 for the first member to join, 2 for the second, and so on. */
		joinRank: number;
		hasAvatar: boolean;
	};
	profile: {
		updatedAt: Date;
		hasBio: boolean;
		hasLocation: boolean;
		hasGenres: boolean;
	} | null;
	reads: ReadFact[];
	/** Book ids this member was the first in the club to mark as read. */
	firstReadBookIds: string[];
	feedbacks: FeedbackFact[];
	posts: PostFact[];
	commentTimes: Date[];
	likesReceived: Date[];
	participations: ParticipationFact[];
	votes: VoteFact[];
	goals: GoalFact[];
	shelves: ShelfFact[];
	documentTimes: Date[];
	requestedBookTimes: Date[];
	favoriteTimes: Date[];
	quizzes: { at: Date; perfect: boolean }[];
	series: SeriesFact[];
	views: ViewFacts;
	reading: ReadingFacts;
};

/** A cumulative value reached at a moment; values never go down. */
export type Point = { at: Date; value: number };

export type MetricKey =
	| "reads"
	| "pages"
	| "countries"
	| "authors"
	| "loyalAuthor"
	| "seriesDone"
	| "classics"
	| "doorstoppers"
	| "quickReads"
	| "decades"
	| "readingMonths"
	| "firstReaders"
	| "bingeDay"
	| "sittingsDone"
	| "sittingStreak"
	| "perfectAttendance"
	| "earlyFinishes"
	| "photoFinishes"
	| "redemptions"
	| "pollsVoted"
	| "winningPicks"
	| "pickStreak"
	| "reviews"
	| "longReviews"
	| "reviewLikes"
	| "likesReceived"
	| "posts"
	| "postComments"
	| "comments"
	| "nightPosts"
	| "leapDay"
	| "documents"
	| "requests"
	| "shelves"
	| "shelfSize"
	| "favorites"
	| "quizzes"
	| "perfectQuizzes"
	| "goalsCreated"
	| "goalsDone"
	| "profile"
	| "postOpens"
	| "reviewOpens"
	| "profileOpens"
	| "paceSetter"
	| "readingStreak"
	| "wishlistKeeper"
	| "founder"
	| "tenure";

export type AchievementDefinition = {
	key: string;
	slug: string;
	/** Its name and description live in the `achievements.items.<key>` messages (see `text.ts`). */
	category: AchievementCategory;
	/** A lucide icon name; the web app maps it to a component. */
	icon: string;
	metric: MetricKey;
	/** "year" tracks the metric separately for each calendar year. */
	period: "all" | "year";
	/** Values at which each tier is earned, ascending. */
	thresholds: readonly number[];
	/** Hidden achievements are not listed until the member earns them. */
	isHidden?: boolean;
	/** Counts only once the period is over (for example a full year without a DNF). */
	finalizeAfterPeriod?: boolean;
	needs: readonly FactSection[];
};

export type EarnedTier = {
	key: string;
	/** 1-based. */
	tier: number;
	/** "" for all-time achievements, the year (for example "2026") otherwise. */
	periodKey: string;
	earnedAt: Date;
};

export type AchievementProgress = {
	key: string;
	periodKey: string;
	value: number;
	/** Highest tier reached (0 when none). */
	tier: number;
	/** Threshold of the next tier, or null when maxed. */
	next: number | null;
};
