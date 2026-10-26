import { OffsetPaginationInputSchema } from "@bbrc/schemas";
import { createRangingInputSchema } from "@bbrc/schemas/listing/ranging";
import { createSearchingInputSchema } from "@bbrc/schemas/listing/searching";
import { createSortingInputSchema } from "@bbrc/schemas/listing/sorting";
import { bookCountryCodeSchema } from "@bbrc/shared";
import zod from "zod";
import { AuthorFieldSchema, AuthorGenderSchema } from "./author-admin.schema";
import { ADMIN_AUTHOR_SORT_FIELDS } from "./author-dashboard.helpers";

/**
 * Admin author dashboards, modelled on `/admin/books` (same input pieces: filters + sorting +
 * ranging + searching + offset pagination; same output idea: kpis, rankings, chart series).
 *
 * - `authorAdmin.overview`  → AdminAuthorOverviewOutput (kpis, charts, rankings)   input: filters + range + search
 * - `authorAdmin.list`      → offset-paginated table rows                           input: filters + sort + range + search + page/limit
 * - `authorAdmin.stats`     → deeper breakdowns and time series                      input: filters + range + search
 *
 * Filters (all optional, combined with AND):
 * `statuses`, `enrichmentStatuses`, `nationalities` (any of), `genders`, `sources` (has a field from any
 * of these sources), `missingFields` (missing at least one of them), `hasPhoto`, `hasBio`, `hasLocks`
 * (a hand-locked field), `withoutBooks` (hidden from the public lists), `minBooks`/`maxBooks`,
 * `minReaders`, `minFollowers`. `rangeBy` is createdAt | updatedAt | enrichedAt with `rangeMin`/`rangeMax`.
 * `search` matches name, slug and aliases. Sorting: see ADMIN_AUTHOR_SORT_FIELDS (empty values last).
 */

const CountSchema = zod.number().int().min(0);

export const AuthorStatusValueSchema = zod.enum([
	"verified",
	"auto",
	"needs_review",
]);
export const AuthorEnrichmentValueSchema = zod.enum([
	"pending",
	"running",
	"done",
	"failed",
]);
export const AuthorSourceValueSchema = zod.enum([
	"openlibrary",
	"wikidata",
	"wikipedia",
	"ai",
	"admin",
]);

export const adminAuthorRangeFields = [
	"createdAt",
	"updatedAt",
	"enrichedAt",
] as const;

const sortingInput = createSortingInputSchema(
	ADMIN_AUTHOR_SORT_FIELDS,
	"createdAt",
	"desc",
);
const rangingInput = createRangingInputSchema(
	adminAuthorRangeFields,
	"createdAt",
);
const searchingInput = createSearchingInputSchema(["name"]);

export const adminAuthorFiltersShape = zod
	.object({
		statuses: zod.array(AuthorStatusValueSchema).max(3),
		enrichmentStatuses: zod.array(AuthorEnrichmentValueSchema).max(4),
		nationalities: zod.array(bookCountryCodeSchema).max(50),
		genders: zod.array(AuthorGenderSchema).max(5),
		sources: zod.array(AuthorSourceValueSchema).max(5),
		missingFields: zod.array(AuthorFieldSchema).max(13),
		hasPhoto: zod.boolean(),
		hasBio: zod.boolean(),
		hasLocks: zod.boolean(),
		withoutBooks: zod.boolean(),
		minBooks: zod.number().int().min(0),
		maxBooks: zod.number().int().min(0),
		minReaders: zod.number().int().min(0),
		minFollowers: zod.number().int().min(0),
	})
	.partial();

function refineBounds(
	value: {
		minBooks?: number;
		maxBooks?: number;
		rangeMin?: Date;
		rangeMax?: Date;
	},
	ctx: zod.RefinementCtx,
) {
	if (
		value.minBooks != null &&
		value.maxBooks != null &&
		value.maxBooks < value.minBooks
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum books must be greater than or equal to minimum",
			path: ["maxBooks"],
		});
	}
	if (value.rangeMin && value.rangeMax && value.rangeMin > value.rangeMax) {
		ctx.addIssue({
			code: "custom",
			message: "rangeMin must be before or equal to rangeMax",
			path: ["rangeMax"],
		});
	}
}

/** Input shared by overview and stats: filters, range and search (no sorting or paging). */
export const AdminAuthorScopeInputSchema = adminAuthorFiltersShape
	.extend(rangingInput.shape)
	.extend(searchingInput.shape)
	.partial()
	.superRefine(refineBounds)
	.default({});

export const AdminAuthorListInputSchema = adminAuthorFiltersShape
	.extend(sortingInput.shape)
	.extend(rangingInput.shape)
	.extend(searchingInput.shape)
	.extend(OffsetPaginationInputSchema.shape)
	.superRefine(refineBounds);

export type AdminAuthorScopeInput = zod.infer<
	typeof AdminAuthorScopeInputSchema
>;
export type AdminAuthorListInput = zod.infer<typeof AdminAuthorListInputSchema>;

// ── Output pieces ──────────────────────────────────────────────────────────

export const AdminAuthorCoverageRowSchema = zod.object({
	/** An author field: bio, photo, birth, birthPlace, nationalities, gender, wikipediaUrl, goodreadsUrl, websiteUrl. */
	field: zod.string(),
	filled: CountSchema,
	total: CountSchema,
	percent: zod.number(),
});

/** Per field: how many filled values came from each source (`unknown` = filled, no source recorded). */
export const AdminAuthorSourceRowSchema = zod.object({
	field: zod.string(),
	openlibrary: CountSchema,
	wikidata: CountSchema,
	wikipedia: CountSchema,
	ai: CountSchema,
	admin: CountSchema,
	unknown: CountSchema,
});

export const AdminAuthorSourceTotalsSchema = zod.object({
	openlibrary: CountSchema,
	wikidata: CountSchema,
	wikipedia: CountSchema,
	ai: CountSchema,
	admin: CountSchema,
	unknown: CountSchema,
});

export const AdminAuthorRankingItemSchema = zod.object({
	slug: zod.string(),
	name: zod.string(),
	photoUrl: zod.string().nullable(),
	metric: zod.number(),
	secondaryMetric: zod.number().optional(),
});

const DayPointSchema = zod.object({ date: zod.string(), count: CountSchema });
const MonthPointSchema = zod.object({
	month: zod.string(),
	count: CountSchema,
});

const CountryCountSchema = zod.object({
	alpha2: zod.string(),
	name: zod.string(),
	count: CountSchema,
});

const GenderCountSchema = zod.object({
	gender: AuthorGenderSchema,
	count: CountSchema,
});

const DecadeCountSchema = zod.object({
	decade: zod.number().int(),
	count: CountSchema,
});

export const AdminAuthorOverviewOutputSchema = zod.object({
	kpis: zod.object({
		totalAuthors: CountSchema,
		/** Authors with at least one book (the ones the public lists show). */
		publicAuthors: CountSchema,
		withoutBooks: CountSchema,
		verified: CountSchema,
		auto: CountSchema,
		needsReview: CountSchema,
		enrichment: zod.object({
			pending: CountSchema,
			running: CountSchema,
			done: CountSchema,
			failed: CountSchema,
		}),
		withPhoto: CountSchema,
		withBio: CountSchema,
		/** Authors with at least one hand-locked field. */
		lockedAuthors: CountSchema,
		/** Authors with at least one AI-filled field. */
		aiFilledAuthors: CountSchema,
		followersTotal: CountSchema,
		addedLast7Days: CountSchema,
		addedLast30Days: CountSchema,
		/** Look-alike pairs waiting in the review queue (over all authors, not the filters). */
		mergeSuggestions: CountSchema,
	}),
	additionsByDay: zod.array(DayPointSchema),
	additionsByMonth: zod.array(MonthPointSchema),
	coverage: zod.array(AdminAuthorCoverageRowSchema),
	sourcesByField: zod.array(AdminAuthorSourceRowSchema),
	sourceTotals: AdminAuthorSourceTotalsSchema,
	distributions: zod.object({
		nationalities: zod.array(CountryCountSchema),
		genders: zod.array(GenderCountSchema),
		birthDecades: zod.array(DecadeCountSchema),
	}),
	rankings: zod.object({
		byBooks: zod.array(AdminAuthorRankingItemSchema),
		byReaders: zod.array(AdminAuthorRankingItemSchema),
		byReads: zod.array(AdminAuthorRankingItemSchema),
		byFollowers: zod.array(AdminAuthorRankingItemSchema),
	}),
	/** Authors whose enrichment failed, newest first. */
	enrichmentFailures: zod.array(
		zod.object({
			slug: zod.string(),
			name: zod.string(),
			attempts: CountSchema,
			error: zod.string().nullable(),
			updatedAt: zod.date(),
		}),
	),
});

export const AdminAuthorListItemSchema = zod.object({
	id: zod.string(),
	slug: zod.string(),
	name: zod.string(),
	sortName: zod.string().nullable(),
	status: AuthorStatusValueSchema,
	enrichmentStatus: AuthorEnrichmentValueSchema,
	enrichmentAttempts: CountSchema,
	enrichmentError: zod.string().nullable(),
	photoUrl: zod.string().nullable(),
	nationalities: zod.array(zod.string()),
	gender: AuthorGenderSchema,
	birthYear: zod.number().int().nullable(),
	deathYear: zod.number().int().nullable(),
	bookCount: CountSchema,
	readerCount: CountSchema,
	readCount: CountSchema,
	followerCount: CountSchema,
	aliasCount: CountSchema,
	/** Coverage fields that are empty, to show "missing: bio, photo". */
	missingFields: zod.array(AuthorFieldSchema),
	/** Distinct sources of the filled fields. */
	sources: zod.array(AuthorSourceValueSchema),
	hasLocks: zod.boolean(),
	createdAt: zod.date(),
	updatedAt: zod.date(),
	enrichedAt: zod.date().nullable(),
});

export const AdminAuthorListOutputSchema = zod.object({
	items: zod.array(AdminAuthorListItemSchema),
	metadata: zod.object({
		page: zod.number().int().min(1),
		limit: zod.number().int().min(1).max(100),
		total: CountSchema,
		totalPages: CountSchema,
		hasNextPage: zod.boolean(),
		nextPage: zod.number().int().min(1).nullable(),
		prevPage: zod.number().int().min(1).nullable(),
	}),
});

export const AdminAuthorStatsOutputSchema = zod.object({
	statusDistribution: zod.array(
		zod.object({ status: AuthorStatusValueSchema, count: CountSchema }),
	),
	enrichmentDistribution: zod.array(
		zod.object({ status: AuthorEnrichmentValueSchema, count: CountSchema }),
	),
	/** Authors created per day over the last 30 days. */
	additionsByDay: zod.array(DayPointSchema),
	/** Authors created per month with a running total. */
	additionsByMonth: zod.array(
		zod.object({ month: zod.string(), count: CountSchema, total: CountSchema }),
	),
	coverage: zod.array(AdminAuthorCoverageRowSchema),
	sourcesByField: zod.array(AdminAuthorSourceRowSchema),
	sourceTotals: AdminAuthorSourceTotalsSchema,
	/** Filled values by origin: AI vs a real source (Open Library, Wikidata, Wikipedia) vs an admin. */
	aiVersusSources: zod.object({
		ai: CountSchema,
		sourced: CountSchema,
		admin: CountSchema,
		unknown: CountSchema,
	}),
	nationalities: zod.array(CountryCountSchema),
	genders: zod.array(GenderCountSchema),
	birthDecades: zod.array(DecadeCountSchema),
	booksPerAuthor: zod.array(
		zod.object({ key: zod.string(), label: zod.string(), count: CountSchema }),
	),
	/** Enrichment attempts per author (how many needed a retry). */
	attemptsDistribution: zod.array(
		zod.object({ attempts: CountSchema, count: CountSchema }),
	),
	/** Authors enriched per month (by `enrichedAt`). */
	enrichedPerMonth: zod.array(MonthPointSchema),
	/** Authors still waiting for a review, by the month they appeared. */
	reviewBacklogByMonth: zod.array(
		zod.object({
			month: zod.string(),
			needsReview: CountSchema,
			auto: CountSchema,
		}),
	),
	followerGrowth: zod.array(
		zod.object({ month: zod.string(), count: CountSchema, total: CountSchema }),
	),
	/** A few headline numbers for cards. */
	totals: zod.object({
		authors: CountSchema,
		enrichmentFailed: CountSchema,
		reviewQueue: CountSchema,
		mergeSuggestions: CountSchema,
		followers: CountSchema,
	}),
});

export type AdminAuthorOverviewOutput = zod.infer<
	typeof AdminAuthorOverviewOutputSchema
>;
export type AdminAuthorListOutput = zod.infer<
	typeof AdminAuthorListOutputSchema
>;
export type AdminAuthorStatsOutput = zod.infer<
	typeof AdminAuthorStatsOutputSchema
>;
