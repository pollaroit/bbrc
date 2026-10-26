import zod from "zod";

/**
 * `userCompare`: compare the reading of two members (page `/users/compare/{a}/{b}`).
 * All procedures need a signed-in member who is not banned.
 *
 * Access rules (the same for every procedure)
 * - A member who is not an admin must be one of the two (`a` or `b`); otherwise FORBIDDEN with
 *   `data: { code: "compare_not_participant", redirectUsername }`: the page sends the viewer
 *   to `/users/compare/{viewer}/{theOther}`. Both names equal -> BAD_REQUEST.
 * - Unknown, hidden or banned members -> NOT_FOUND (admins and the member themself still see them).
 * - A member who switched off "Allow others to compare with me" (`User.allowCompare`) cannot be
 *   compared by other members: `compare` answers `blocked: "compare_off"` (names and avatars
 *   only, no numbers); admins can always compare. The other member is never notified.
 *
 * Score (`@bbrc/shared` user-compare.ts): 60% overlap of the books read (Jaccard) + 40% rating
 * agreement on co-rated books (100 for the same rating, 0 for the largest gap; pulled toward 50
 * with fewer than 5 co-rated books). 100 = identical books and ratings, 0 = nothing in common.
 *
 * Procedures
 * - `compare`       header: both members' figures, the score, a summary line, the three group counts.
 * - `books`         the book lists: group `both` (with both ratings and the per-book score),
 *                   `onlyA`, `onlyB`; search, sort, paged.
 * - `extras`        taste radar, shared authors/favourites, timeline, shelves, currently reading,
 *                   sittings together, wishlist overlap (each part is null when it cannot be shown).
 * - `searchMembers` the member picker.
 * - `getPreferences` / `setPreferences`  the "Allow others to compare with me" switch (on by default).
 */

const CountSchema = zod.number().int().min(0);
const username = zod.string().trim().min(1).max(100);

export const CompareMemberRefSchema = zod.object({
	username: zod.string(),
	name: zod.string(),
	image: zod.string().nullable(),
});

export const CompareBookSchema = zod.object({
	slug: zod.string(),
	title: zod.string(),
	authors: zod.array(zod.string()),
	/** Linked author records in order (empty until the author backfill linked the book). */
	authorRefs: zod.array(
		zod.object({ id: zod.string(), slug: zod.string(), name: zod.string() }),
	),
	/** Open Library id, or negative for an uploaded cover. */
	coverId: zod.number().int().nullable(),
	pages: CountSchema,
	publishedIn: zod.number().int(),
	/** The club's average rating of the book. */
	averageRating: zod.number().nullable(),
});

export const CompareFavoriteAuthorSchema = zod.object({
	slug: zod.string(),
	name: zod.string(),
	/** Books they read by this author. */
	count: CountSchema,
});

/** The figures shown side by side in the header. */
export const CompareMemberStatsSchema = zod.object({
	joinedAt: zod.coerce.date(),
	booksRead: CountSchema,
	/** Average of the ratings this member gave, null with no ratings. */
	averageRating: zod.number().nullable(),
	ratingsGiven: CountSchema,
	pagesRead: CountSchema,
	/** Books finished in the current calendar year (UTC). */
	readsThisYear: CountSchema,
	achievementsCount: CountSchema,
	/** Up to 3 authors this member read most. */
	favoriteAuthors: zod.array(CompareFavoriteAuthorSchema),
});

export const CompareMemberSchema = CompareMemberRefSchema.extend({
	/** Null when the comparison is blocked. */
	stats: CompareMemberStatsSchema.nullable(),
});

export const CompareScoreSchema = zod.object({
	/** 0–100, whole number. */
	overall: zod.number().int().min(0).max(100),
	/** Jaccard overlap of the books read, 0–100. */
	overlap: zod.number().int().min(0).max(100),
	/** Average rating agreement on co-rated books, null with none. */
	ratingAgreement: zod.number().int().min(0).max(100).nullable(),
	sharedCount: CountSchema,
	onlyACount: CountSchema,
	onlyBCount: CountSchema,
	coRatedCount: CountSchema,
	confidence: zod.enum(["low", "medium", "high"]),
	/** Plain label for the score ("Reading twins", "Very similar", ...). */
	band: zod.object({
		key: zod.enum([
			"twins",
			"very_similar",
			"some_overlap",
			"different",
			"none",
		]),
		label: zod.string(),
	}),
	/** The weights behind the score, so the page can explain it. */
	weights: zod.object({
		overlap: zod.number(),
		rating: zod.number(),
		ratingFullWeightAt: zod.number().int(),
	}),
});

export const CompareInputSchema = zod.object({ a: username, b: username });

export const CompareOutputSchema = zod.object({
	/** True when the viewer is an admin (bypasses "Allow others to compare with me"). */
	viewerIsAdmin: zod.boolean(),
	/** "compare_off": the other member turned comparisons off; numbers are withheld. */
	blocked: zod.enum(["compare_off"]).nullable(),
	/** Who the viewer is in this comparison; null for an admin looking at two others. */
	viewerSide: zod.enum(["a", "b"]).nullable(),
	a: CompareMemberSchema,
	b: CompareMemberSchema,
	/** Null when blocked. */
	score: CompareScoreSchema.nullable(),
	/** "You agree on 4 of 6 books you both rated (7 shared books)." */
	summary: zod.string().nullable(),
});

// ── Book lists ─────────────────────────────────────────────────────────────

export const CompareBookGroupSchema = zod.enum(["both", "onlyA", "onlyB"]);
export const CompareBookSortSchema = zod.enum(["score", "title", "date"]);

export const CompareBooksInputSchema = CompareInputSchema.extend({
	group: CompareBookGroupSchema.default("both"),
	search: zod.string().trim().max(200).optional(),
	/** `score`: per-book rating agreement (books nobody rated both ways last), `title`, `date`: latest finish. */
	sort: CompareBookSortSchema.default("score"),
	sortDirection: zod.enum(["asc", "desc"]).default("desc"),
	cursor: zod.number().int().min(0).optional(),
	limit: zod.number().int().min(1).max(60).default(24),
});

export const CompareFinishSchema = zod.object({
	year: zod.number().int().nullable(),
	month: zod.number().int().nullable(),
});

export const CompareBookItemSchema = zod.object({
	book: CompareBookSchema,
	/** Rating each member gave the book (0–5), null when they did not rate it or did not read it. */
	ratingA: zod.number().nullable(),
	ratingB: zod.number().nullable(),
	/** Rating agreement 0–100, only in the `both` group and only when both rated. */
	score: zod.number().int().min(0).max(100).nullable(),
	/** Absolute rating gap, same condition as `score`. */
	diff: zod.number().nullable(),
	/** Null when the member did not read the book. */
	finishedA: CompareFinishSchema.nullable(),
	finishedB: CompareFinishSchema.nullable(),
});

export const CompareBooksOutputSchema = zod.object({
	/** Null when comparison is blocked (items is empty then). */
	blocked: zod.enum(["compare_off"]).nullable(),
	items: zod.array(CompareBookItemSchema),
	metadata: zod.object({
		limit: zod.number().int(),
		/** Offset to pass back as `cursor`, null on the last page. */
		nextCursor: zod.number().int().nullable(),
		/** Number of books in this group after the search. */
		total: CountSchema,
	}),
});

// ── Extras ─────────────────────────────────────────────────────────────────

export const CompareExtrasInputSchema = CompareInputSchema;

export const CompareRadarAxisSchema = zod.object({
	label: zod.string(),
	/** Share (0–100) of the member's books that carry this subject/country. */
	a: zod.number(),
	b: zod.number(),
});

export const CompareSharedAuthorSchema = zod.object({
	slug: zod.string(),
	name: zod.string(),
	photoUrl: zod.string().nullable(),
	countA: CountSchema,
	countB: CountSchema,
});

export const CompareTimelinePointSchema = zod.object({
	year: zod.number().int(),
	a: CountSchema,
	b: CountSchema,
});

export const CompareShelfRefSchema = zod.object({
	slug: zod.string(),
	title: zod.string(),
	owner: CompareMemberRefSchema,
	bookCount: CountSchema,
});

export const CompareShelfPairSchema = zod.object({
	shelfA: CompareShelfRefSchema,
	shelfB: CompareShelfRefSchema,
	sharedBooks: CountSchema,
	/** Jaccard overlap of the two shelves, 0–100. */
	similarity: zod.number().int().min(0).max(100),
});

export const CompareSittingTogetherSchema = zod.object({
	slug: zod.string(),
	title: zod.string(),
	status: zod.enum(["voting", "reading", "finished"]),
	deadline: zod.coerce.date(),
	book: CompareBookSchema.nullable(),
	progressA: zod.string(),
	progressB: zod.string(),
});

export const CompareExtrasOutputSchema = zod.object({
	blocked: zod.enum(["compare_off"]).nullable(),
	/** Top 8 subjects by combined share; null when neither member has books. */
	subjects: zod.array(CompareRadarAxisSchema).nullable(),
	/** Top 8 origin countries (names), same rule. */
	countries: zod.array(CompareRadarAxisSchema).nullable(),
	authors: zod
		.object({
			shared: zod.array(CompareSharedAuthorSchema),
			/** Books both favourited. */
			sharedFavorites: zod.array(CompareBookSchema),
		})
		.nullable(),
	/** Books finished per year (dated reads only) plus how many reads have no date. */
	timeline: zod
		.object({
			points: zod.array(CompareTimelinePointSchema),
			undatedA: CountSchema,
			undatedB: CountSchema,
		})
		.nullable(),
	/** Public shelves only (never drafts, private shelves or the wishlist). */
	shelves: zod
		.object({
			/** Books on a public shelf of both members. */
			sharedBookCount: CountSchema,
			sharedBooks: zod.array(CompareBookSchema),
			/** Most alike pairs (one shelf of each member), at most 6. */
			pairs: zod.array(CompareShelfPairSchema),
			/** Shelves one owns and the other helps edit. */
			collaborations: zod.array(CompareShelfRefSchema),
		})
		.nullable(),
	/** Null unless BOTH members show what they are reading. */
	currentlyReading: zod
		.object({
			both: zod.array(CompareBookSchema),
			onlyA: zod.array(CompareBookSchema),
			onlyB: zod.array(CompareBookSchema),
			/** Books both read during overlapping periods (finished sessions included). */
			readAtSameTimeCount: CountSchema,
		})
		.nullable(),
	sittings: zod
		.object({
			count: CountSchema,
			items: zod.array(CompareSittingTogetherSchema),
		})
		.nullable(),
	/** Null unless BOTH wishlists are public. */
	wishlist: zod
		.object({
			shared: zod.array(CompareBookSchema),
			countA: CountSchema,
			countB: CountSchema,
		})
		.nullable(),
});

// ── Member picker and preferences ──────────────────────────────────────────

export const CompareSearchMembersInputSchema = zod.object({
	query: zod.string().trim().max(100).default(""),
	excludeUsername: username.optional(),
	limit: zod.number().int().min(1).max(20).default(8),
});

export const CompareSearchMembersOutputSchema = zod.object({
	items: zod.array(
		CompareMemberRefSchema.extend({
			booksRead: CountSchema,
			/** True when the member turned comparisons off (only admins see such members, flagged). */
			compareOff: zod.boolean(),
			isMe: zod.boolean(),
		}),
	),
});

export const ComparePreferencesSchema = zod.object({
	allowCompare: zod.boolean(),
});

export type CompareInput = zod.infer<typeof CompareInputSchema>;
export type CompareOutput = zod.infer<typeof CompareOutputSchema>;
export type CompareBooksInput = zod.infer<typeof CompareBooksInputSchema>;
export type CompareBooksOutput = zod.infer<typeof CompareBooksOutputSchema>;
export type CompareExtrasOutput = zod.infer<typeof CompareExtrasOutputSchema>;
export type CompareBook = zod.infer<typeof CompareBookSchema>;
export type CompareSearchMembersInput = zod.infer<
	typeof CompareSearchMembersInputSchema
>;
export type CompareSearchMembersOutput = zod.infer<
	typeof CompareSearchMembersOutputSchema
>;
