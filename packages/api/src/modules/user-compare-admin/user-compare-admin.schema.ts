import zod from "zod";

/**
 * `userCompareAdmin` (admin only): compare any two members and see how the whole club's
 * reading compares. Scores come from `scoreComparison` in `@bbrc/shared/user-compare`
 * (60% overlap of what they read, 40% agreement of the ratings they gave, shrunk for few
 * co-rated books).
 *
 * Procedures
 * - `searchMembers({ query })`  up to 10 members (name or username), including hidden and
 *                               banned ones (admins can compare anyone), with flags.
 * - `compare({ a, b })`, `books(...)`, `extras({ a, b })`  the member compare procedures
 *                               (`user-compare.schema.ts`: same inputs and outputs) for any two
 *                               members, ignoring `allowCompare` and the participant rule.
 * - `stats({ filters, fresh? })`  every pair score of the club, cached for an hour per filter set.
 *
 * Stats rules (constants in `compare-stats.ts`)
 * - Only members who are not hidden and not banned are compared, and only those with at least
 *   MIN_READS (3) reads in the filtered universe.
 * - `topPairs` / `bottomPairs` (10 each) only list pairs with at least PAIR_MIN_SHARED (3)
 *   shared books, or where each member has at least PAIR_MIN_READS_EACH (5) reads.
 * - `mostSimilarMembers` (5): highest mean of a member's best TOP_K (5) pair scores.
 *   `mostUniqueMembers` (5): lowest mean over all of a member's pairs.
 * - Filters decide which reads count: members, books, authors (slugs: canonical, merged,
 *   old or alias), series, subjects and the finish date of the read (a read without a date is
 *   left out while a date range is set). Ratings follow the reads that count.
 * - `matrix` holds up to 30 members with the most reads; `matrix.scores[i][j]` is the overall
 *   score between `matrix.members[i]` and `matrix.members[j]` (null on the diagonal).
 */

const slugText = zod.string().trim().min(1).max(200);

export const CompareAdminMemberSchema = zod.object({
	username: zod.string(),
	name: zod.string(),
	image: zod.string().nullable(),
});

export const SearchCompareMembersInputSchema = zod.object({
	query: zod.string().trim().max(60).default(""),
});

export const SearchCompareMembersOutputSchema = zod.object({
	items: zod.array(
		CompareAdminMemberSchema.extend({
			isBanned: zod.boolean(),
			allowCompare: zod.boolean(),
		}),
	),
});

export const CompareStatsFiltersSchema = zod.object({
	/** Usernames; default all members who are not hidden or banned. */
	users: zod.array(slugText).max(200).optional(),
	/** Book slugs; default all books. */
	books: zod.array(slugText).max(200).optional(),
	/** Author slugs. */
	authors: zod.array(slugText).max(50).optional(),
	/** Series slugs. */
	series: zod.array(slugText).max(50).optional(),
	/** Subjects as written on the books. */
	subjects: zod.array(zod.string().trim().min(1).max(100)).max(50).optional(),
	finishedFrom: zod.coerce.date().optional(),
	finishedTo: zod.coerce.date().optional(),
});

export const CompareStatsInputSchema = zod.object({
	filters: CompareStatsFiltersSchema.default({}),
	/** Skip the one-hour cache and compute again. */
	fresh: zod.boolean().default(false),
});

export const CompareStatsPairSchema = zod.object({
	a: CompareAdminMemberSchema,
	b: CompareAdminMemberSchema,
	/** 0–100. */
	score: zod.number().int().min(0).max(100),
	overlap: zod.number(),
	ratingAgreement: zod.number().nullable(),
	sharedCount: zod.number().int().min(0),
	coRatedCount: zod.number().int().min(0),
	readsA: zod.number().int().min(0),
	readsB: zod.number().int().min(0),
});

export const CompareStatsMemberSchema = zod.object({
	user: CompareAdminMemberSchema,
	booksRead: zod.number().int().min(0),
	/** Mean of the member's best 5 pair scores (0–100, one decimal). */
	similarity: zod.number(),
	/** Mean over every pair the member is in (0–100, one decimal). */
	meanScore: zod.number(),
	/** How many other members they were compared with. */
	peers: zod.number().int().min(0),
	/** Their closest peer, null without peers. */
	closest: zod
		.object({
			user: CompareAdminMemberSchema,
			score: zod.number().int(),
			sharedCount: zod.number().int(),
		})
		.nullable(),
});

export const CompareStatsOutputSchema = zod.object({
	/** ISO time the numbers were computed (they are cached for an hour). */
	computedAt: zod.string(),
	cached: zod.boolean(),
	/** Filters that matched nothing (an author or series slug that does not exist). */
	unknownFilters: zod.array(zod.string()),
	totals: zod.object({
		/** Members compared (enough reads). */
		members: zod.number().int(),
		/** Members in the filtered universe, including those with too few reads. */
		membersInUniverse: zod.number().int(),
		pairs: zod.number().int(),
		listedPairs: zod.number().int(),
		averageScore: zod.number(),
		/** Reads counted across all members. */
		reads: zod.number().int(),
		books: zod.number().int(),
	}),
	topPairs: zod.array(CompareStatsPairSchema),
	bottomPairs: zod.array(CompareStatsPairSchema),
	mostSimilarMembers: zod.array(CompareStatsMemberSchema),
	mostUniqueMembers: zod.array(CompareStatsMemberSchema),
	matrix: zod.object({
		members: zod.array(
			CompareAdminMemberSchema.extend({ booksRead: zod.number().int() }),
		),
		scores: zod.array(zod.array(zod.number().int().nullable())),
	}),
	/** Ten buckets of all pair scores between compared members. */
	scoreDistribution: zod.array(
		zod.object({
			from: zod.number().int(),
			to: zod.number().int(),
			count: zod.number().int(),
		}),
	),
	membersScatter: zod.array(
		zod.object({
			user: CompareAdminMemberSchema,
			booksRead: zod.number().int(),
			/** Mean over all of the member's pairs. */
			meanSimilarity: zod.number(),
			/** Mean of the member's best 5 pairs. */
			topSimilarity: zod.number(),
		}),
	),
});

export type CompareStatsInput = zod.infer<typeof CompareStatsInputSchema>;
export type CompareStatsFilters = zod.infer<typeof CompareStatsFiltersSchema>;
export type CompareStatsOutput = zod.infer<typeof CompareStatsOutputSchema>;
