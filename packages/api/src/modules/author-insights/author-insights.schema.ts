import zod from "zod";

/**
 * `authorInsights`: the filterable "community" tabs of an author page (Sittings, Shelves,
 * Favorites) and the Stats tab. All procedures are public and take the author's `slug`
 * (the canonical, a merged, an old or an alias slug). Every output carries `redirectTo`:
 * the canonical slug when the one asked for was not canonical (the page sends a 308).
 *
 * Procedures
 * - `sittings`  filters: search, statuses, outcomes, bookSlugs, rangeMin/rangeMax; sort; paged.
 *               Output also has `facets` (counts before filtering) so the filter UI can show options.
 * - `shelves`   public shelves with the author's books: search, types, ownerUsernames, minBooks,
 *               minAuthorBooks, sort; paged; `facets` (owners, types).
 * - `favorites` search, bookSlugs, sort (books and members sorted separately); members paged.
 * - `stats`     charts and stat cards; every filter applies to every number (see StatsInput).
 *
 * Paging: `{ cursor?, limit }` in, `{ items, metadata }` out (cursor is a row offset; pass
 * `metadata.nextCursor` back; `metadata.total` only on the first page).
 */

const CountSchema = zod.number().int().min(0);

const slugText = zod.string().trim().min(1).max(200);

export const InsightsBookRefSchema = zod.object({
	slug: zod.string(),
	title: zod.string(),
	authors: zod.array(zod.string()),
	/** Open Library id, or negative for an uploaded cover. */
	coverId: zod.number().int().nullable(),
});

export const InsightsMemberRefSchema = zod.object({
	username: zod.string(),
	name: zod.string(),
	image: zod.string().nullable(),
});

export const InsightsMetadataSchema = zod.object({
	limit: zod.number().int().min(1),
	hasNextPage: zod.boolean(),
	hasPreviousPage: zod.boolean(),
	nextCursor: zod.string().nullable(),
	total: CountSchema.optional(),
});

const pagingShape = {
	cursor: zod.string().max(40).optional(),
	limit: zod.number().int().min(1).max(50).default(12),
};

const searchText = zod.string().trim().max(100).optional();
const bookSlugsFilter = zod.array(slugText).max(50).optional();

// ── Sittings ───────────────────────────────────────────────────────────────

export const SittingStatusValueSchema = zod.enum([
	"voting",
	"reading",
	"finished",
]);
/** Whether the author's book was picked, is still in the poll, or lost. */
export const SittingOutcomeValueSchema = zod.enum([
	"picked",
	"in_poll",
	"not_picked",
]);

export const AuthorInsightSittingsInputSchema = zod.object({
	slug: slugText,
	/** Matches the sitting's title, a book title, or the organiser's name or username. */
	search: searchText,
	statuses: zod.array(SittingStatusValueSchema).max(3).optional(),
	outcomes: zod.array(SittingOutcomeValueSchema).max(3).optional(),
	/** Only sittings that involve one of these books (picked or in the poll). */
	bookSlugs: bookSlugsFilter,
	/** Bounds for the sitting's date (the poll deadline, else when it was created). */
	rangeMin: zod.coerce.date().optional(),
	rangeMax: zod.coerce.date().optional(),
	sort: zod
		.enum(["newest", "oldest", "participants", "deadline"])
		.default("newest"),
	...pagingShape,
});

export const AuthorInsightSittingItemSchema = zod.object({
	slug: zod.string(),
	displayName: zod.string(),
	status: SittingStatusValueSchema,
	outcome: SittingOutcomeValueSchema,
	/** ISO. The poll deadline, else the creation date. */
	date: zod.string(),
	createdAt: zod.string(),
	pollDeadline: zod.string().nullable(),
	readingStartedAt: zod.string().nullable(),
	midtermAt: zod.string().nullable(),
	/** End of the reading period. */
	deadline: zod.string(),
	/** The author's books involved (picked or in the poll). */
	books: zod.array(InsightsBookRefSchema),
	/** The book the sitting picked, if any (can be by someone else). */
	pickedBook: InsightsBookRefSchema.nullable(),
	/** Members taking part (removed members and hidden members left out). */
	participantCount: CountSchema,
	completedCount: CountSchema,
	/** How many books were in the poll. */
	pollOptionCount: CountSchema,
	organiser: InsightsMemberRefSchema.nullable(),
	joinType: zod.enum(["public", "unlisted", "private"]),
});

export const AuthorInsightSittingsOutputSchema = zod.object({
	redirectTo: zod.string().nullable(),
	items: zod.array(AuthorInsightSittingItemSchema),
	metadata: InsightsMetadataSchema,
	/** Counts over all of the author's sittings (before the filters), for the filter UI. */
	facets: zod.object({
		statuses: zod.object({
			voting: CountSchema,
			reading: CountSchema,
			finished: CountSchema,
		}),
		outcomes: zod.object({
			picked: CountSchema,
			in_poll: CountSchema,
			not_picked: CountSchema,
		}),
		books: zod.array(
			zod.object({ book: InsightsBookRefSchema, count: CountSchema }),
		),
	}),
});

// ── Shelves ────────────────────────────────────────────────────────────────

export const AuthorInsightShelvesInputSchema = zod.object({
	slug: slugText,
	/** Matches a shelf's title or description, or its owner's name or username. */
	search: searchText,
	types: zod
		.array(zod.enum(["ordered", "unordered"]))
		.max(2)
		.optional(),
	ownerUsernames: zod.array(slugText).max(50).optional(),
	/** Shelves holding at least this many books in all. */
	minBooks: zod.number().int().min(0).max(10_000).optional(),
	/** Shelves holding at least this many of the author's books. */
	minAuthorBooks: zod.number().int().min(0).max(10_000).optional(),
	/** Only shelves that hold this particular book of the author. */
	bookSlugs: bookSlugsFilter,
	sort: zod
		.enum(["newest", "updated", "authorBooks", "books", "views"])
		.default("updated"),
	...pagingShape,
});

export const AuthorInsightShelfItemSchema = zod.object({
	slug: zod.string(),
	title: zod.string(),
	description: zod.string().nullable(),
	coverImageUrl: zod.string().nullable(),
	type: zod.enum(["ordered", "unordered"]),
	owner: InsightsMemberRefSchema,
	bookCount: CountSchema,
	authorBookCount: CountSchema,
	viewCount: CountSchema,
	createdAt: zod.date(),
	updatedAt: zod.date(),
	/** Up to 4 covers of the shelf's first books. */
	coverPreviewCoverIds: zod.array(zod.number().int().nullable()),
});

export const AuthorInsightShelvesOutputSchema = zod.object({
	redirectTo: zod.string().nullable(),
	items: zod.array(AuthorInsightShelfItemSchema),
	metadata: InsightsMetadataSchema,
	facets: zod.object({
		types: zod.object({ ordered: CountSchema, unordered: CountSchema }),
		owners: zod.array(
			zod.object({ member: InsightsMemberRefSchema, count: CountSchema }),
		),
		books: zod.array(
			zod.object({ book: InsightsBookRefSchema, count: CountSchema }),
		),
	}),
});

// ── Favorites ──────────────────────────────────────────────────────────────

export const AuthorInsightFavoritesInputSchema = zod.object({
	slug: slugText,
	/** Matches a member's name or username, or a book title. */
	search: searchText,
	bookSlugs: bookSlugsFilter,
	/** Sort of the book list. */
	bookSort: zod.enum(["count", "title", "recent"]).default("count"),
	/** Sort of the member list. */
	memberSort: zod.enum(["recent", "name", "most"]).default("recent"),
	...pagingShape,
});

export const AuthorInsightFavoritesOutputSchema = zod.object({
	redirectTo: zod.string().nullable(),
	/** Favorites that match the filters. */
	totalFavorites: CountSchema,
	memberCount: CountSchema,
	/** Books with the number of members who favorited them (all matching books, not paged). */
	books: zod.array(
		zod.object({
			book: InsightsBookRefSchema,
			count: CountSchema,
			/** ISO of the latest favorite of the book. */
			latestAt: zod.string(),
		}),
	),
	members: zod.object({
		items: zod.array(
			zod.object({
				member: InsightsMemberRefSchema,
				books: zod.array(InsightsBookRefSchema),
				favoriteCount: CountSchema,
				/** ISO of the member's latest favorite among these books. */
				favoritedAt: zod.string(),
			}),
		),
		metadata: InsightsMetadataSchema,
	}),
});

// ── Stats ──────────────────────────────────────────────────────────────────

/**
 * Filters of the Stats tab. They apply to every number and chart:
 * - `bookSlugs`: only these books of the author.
 * - `readerUsernames`: only these members' reads, reviews and readings.
 * - `rangeMin` / `rangeMax`: reads count by finish month (a read without a date is left out while a
 *   range is set), reviews by the day written, finished readings by the day finished, followers
 *   by the day they followed. When both bounds are given the headline cards also carry the
 *   same number for the window of equal length right before (`previous`, `delta`).
 */
export const AuthorInsightStatsInputSchema = zod.object({
	slug: slugText,
	bookSlugs: bookSlugsFilter,
	readerUsernames: zod.array(slugText).max(50).optional(),
	rangeMin: zod.coerce.date().optional(),
	rangeMax: zod.coerce.date().optional(),
});

/** A stat with its comparison to the previous window (previous/delta null without a full range). */
export const InsightsComparedStatSchema = zod.object({
	value: zod.number(),
	previous: zod.number().nullable(),
	delta: zod.number().nullable(),
	deltaPercent: zod.number().nullable(),
});

const MonthPointSchema = zod.object({
	/** "2024-03" */
	month: zod.string(),
	count: CountSchema,
});

const BookStatRowSchema = zod.object({
	book: InsightsBookRefSchema,
	publishedIn: zod.number().int(),
	pages: zod.number().int(),
});

export const AuthorInsightStatsOutputSchema = zod.object({
	redirectTo: zod.string().nullable(),
	/** What the filters resolved to. */
	scope: zod.object({
		bookCount: CountSchema,
		hasRange: zod.boolean(),
		hasComparison: zod.boolean(),
		/** Reads without a finish date (excluded from every date chart). */
		undatedReads: CountSchema,
	}),
	/** The headline stat cards. */
	cards: zod.object({
		/** Books in scope (not compared). */
		books: InsightsComparedStatSchema,
		/** Distinct members with a read. */
		readers: InsightsComparedStatSchema,
		reads: InsightsComparedStatSchema,
		reviews: InsightsComparedStatSchema,
		/** Mean rating of the reviews in scope (0 when there are none). */
		averageRating: InsightsComparedStatSchema,
		/** Sum of the pages of the books read, one count per read. */
		pagesRead: InsightsComparedStatSchema,
		/** Mean days between starting and finishing, from finished readings (0 when none). */
		averageDaysToFinish: InsightsComparedStatSchema,
		/** Members following the author (all time, or new ones in the range). */
		followers: InsightsComparedStatSchema,
	}),
	readsPerMonth: zod.array(MonthPointSchema),
	readsPerYear: zod.array(
		zod.object({ year: zod.number().int(), count: CountSchema }),
	),
	/** Reads by calendar month, January first (seasonality). */
	readsByMonthOfYear: zod.array(
		zod.object({
			month: zod.number().int().min(1).max(12),
			count: CountSchema,
		}),
	),
	/** New readers per month and the running total ("readers over time"). */
	readersGrowth: zod.array(
		zod.object({
			month: zod.string(),
			count: CountSchema,
			total: CountSchema,
		}),
	),
	/** Ten half-star buckets, 0.5 to 5. */
	ratingDistribution: zod.array(
		zod.object({ rating: zod.number(), count: CountSchema }),
	),
	/** Average rating and number of reviews per month (reviews by the day written). */
	ratingOverTime: zod.array(
		zod.object({
			month: zod.string(),
			average: zod.number(),
			count: CountSchema,
		}),
	),
	reviewsPerMonth: zod.array(MonthPointSchema),
	ratingsPerBook: zod.array(
		BookStatRowSchema.extend({
			average: zod.number().nullable(),
			reviewCount: CountSchema,
		}),
	),
	readsPerBook: zod.array(
		BookStatRowSchema.extend({
			readCount: CountSchema,
			readersNow: CountSchema,
			wishlistCount: CountSchema,
		}),
	),
	booksPerDecade: zod.array(
		zod.object({ decade: zod.number().int(), count: CountSchema }),
	),
	/** One dot per book for a publication timeline. */
	publicationTimeline: zod.array(
		BookStatRowSchema.extend({
			readCount: CountSchema,
			average: zod.number().nullable(),
		}),
	),
	readingTime: zod.object({
		finishedCount: CountSchema,
		averageDays: zod.number().nullable(),
		medianDays: zod.number().nullable(),
		distribution: zod.array(
			zod.object({
				key: zod.string(),
				label: zod.string(),
				count: CountSchema,
			}),
		),
		perBook: zod.array(
			zod.object({
				book: InsightsBookRefSchema,
				averageDays: zod.number(),
				readers: CountSchema,
			}),
		),
	}),
	pageCounts: zod.array(
		zod.object({ key: zod.string(), label: zod.string(), count: CountSchema }),
	),
	/** Most common subjects of the books read (one count per read). */
	subjects: zod.array(
		zod.object({ subject: zod.string(), count: CountSchema }),
	),
	/** Literary origin countries of the books read (one count per read). */
	originCountries: zod.array(
		zod.object({ code: zod.string(), name: zod.string(), count: CountSchema }),
	),
	leaderboard: zod.array(
		zod.object({
			member: InsightsMemberRefSchema,
			readCount: CountSchema,
			totalBooks: CountSchema,
		}),
	),
	/** New followers per month and the running total (follower counts only, never names). */
	followerGrowth: zod.array(
		zod.object({ month: zod.string(), count: CountSchema, total: CountSchema }),
	),
	/** Wishlist, reading now and read, per all books in scope and per book. */
	funnel: zod.object({
		totals: zod.object({
			wishlist: CountSchema,
			readingNow: CountSchema,
			read: CountSchema,
		}),
		perBook: zod.array(
			zod.object({
				book: InsightsBookRefSchema,
				wishlist: CountSchema,
				readingNow: CountSchema,
				read: CountSchema,
			}),
		),
	}),
});

export type AuthorInsightSittingsOutput = zod.infer<
	typeof AuthorInsightSittingsOutputSchema
>;
export type AuthorInsightShelvesOutput = zod.infer<
	typeof AuthorInsightShelvesOutputSchema
>;
export type AuthorInsightFavoritesOutput = zod.infer<
	typeof AuthorInsightFavoritesOutputSchema
>;
export type AuthorInsightStatsOutput = zod.infer<
	typeof AuthorInsightStatsOutputSchema
>;
