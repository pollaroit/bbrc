/*
 * AUTHOR READ API (everything is computed from `Author` + `BookAuthor`).
 *
 * Slugs: every call takes an author `slug`. It may be the canonical slug, the slug of an
 * author that was merged into this one, or an old name-based slug that matches an alias.
 * `author.get` returns `redirectTo` (the canonical slug) when the one asked for is not
 * canonical, so the page can 308; the tab endpoints just answer for the right author.
 * Unknown slugs, and authors without books (unless the viewer is an admin), are NOT_FOUND.
 *
 * Procedures (all public; the viewer comes from the session):
 *   author.list              directory cards + filters + sorts (offset-style cursor)
 *   author.nationalityFacets nationalities for the directory filter, with counts
 *   author.get               overview: profile, headline numbers, series line, viewer state
 *   author.about             sources, credits and completeness for the About tab
 *   author.more              related authors (nationality, era, read by the same members), max 12
 *   author.books             books by the author: same filters/sorts/cards as /books (paged)
 *   author.bookFacets        country and subject facets + slider ranges for the Books tab
 *   author.reads             members' reads of the author's books (paged, filters, sorts, search)
 *   author.reviews           reviews of the author's books (paged, filters, sorts, search)
 *   author.readerOptions     members to pick in the reads/reviews filters (search, top 20)
 *   author.bookOptions       books by the author to pick in filters (search, top 20)
 *   author.seriesOptions     series holding their books to pick in filters (search, top 20)
 *   author.followers         members who follow the author (people cards, filters, sorts)
 *   author.posts             feed posts that attach this author (paged, feed shape)
 *   author.sittings          sittings that picked or polled one of the author's books (paged)
 *   author.favorites         members who favorited the author's books (paged by member)
 *   author.shelves           public shelves holding the author's books (paged)
 *   author.series            series with the author's books, with viewer progress
 *   author.stats             club numbers: ratings, readers leaderboard, reading time, decades
 *
 * Privacy: hidden members never appear; only public active shelves show; spoiler reviews
 * come without an excerpt; admin-only fields (`status`, `fieldMeta`, enrichment) are null
 * for everyone else.
 *
 * Cursors are opaque strings (a number of rows already shown); pass back `nextCursor`.
 */
import {
	BookSchema,
	CursorPaginationInputSchema,
	UserSchema,
} from "@bbrc/schemas";
import { bookCountryCodeSchema } from "@bbrc/shared";
import zod from "zod";
import { bookListFiltersSchema } from "../book/book.listing";
import {
	BookListItemSchema,
	BookListMetadataSchema,
	bookListQueryInputShape,
	bookSortableFields,
	refineBookListQueryInput,
} from "../book/book.schema";
import { PeopleListItemSchema } from "../people/people.schema";
import { PostListItemSchema } from "../post/post.schema";
import { ReadEditionRefSchema } from "../read/read-edition-ref";
import { BookSeriesSummarySchema } from "../series/series.schema";
import {
	authorDirectoryFiltersSchema,
	authorDirectorySearching,
	authorDirectorySorting,
} from "./author-directory.listing";

// ── Building blocks ────────────────────────────────────────────────────────

const CountSchema = zod.number().int().min(0);

export const AuthorGenderSchema = zod.enum([
	"female",
	"male",
	"non_binary",
	"other",
	"unknown",
]);
/** verified = an admin confirmed it; auto = filled in automatically and live; needs_review = the pipeline was unsure. */
export const AuthorStatusSchema = zod.enum([
	"verified",
	"auto",
	"needs_review",
]);
export const AuthorEnrichmentStatusSchema = zod.enum([
	"pending",
	"running",
	"done",
	"failed",
]);
export const AuthorFieldSourceSchema = zod.enum([
	"openlibrary",
	"wikidata",
	"wikipedia",
	"ai",
	"admin",
]);

/** A member, as shown next to a read, a review or a leaderboard row. */
export const AuthorMemberSchema = zod.object({
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: UserSchema.shape.image,
});

/** A book, as a small reference. `coverId` is an Open Library id, or negative for an uploaded cover. */
export const AuthorBookRefSchema = zod.object({
	slug: BookSchema.shape.slug,
	title: zod.string(),
	/** Author names as printed on the book (a copy kept on the book). */
	authors: zod.array(zod.string()),
	coverId: zod.number().int().nullable(),
});

export const AuthorNationalitySchema = zod.object({
	/** ISO 3166-1 alpha-2. */
	code: zod.string(),
	name: zod.string(),
});

export const AuthorTabMetadataSchema = zod.object({
	limit: zod.number().int().min(1),
	hasNextPage: zod.boolean(),
	hasPreviousPage: zod.boolean(),
	/** Pass back as `cursor` for the next page; null on the last page. */
	nextCursor: zod.string().nullable(),
	/** Total rows, on the first page only (when `cursor` was not sent). */
	total: CountSchema.optional(),
});

const authorSlugInput = zod.string().trim().min(1).max(200);

/** Input of every slug-only call. */
export const AuthorSlugInputSchema = zod.object({ slug: authorSlugInput });

/** Input of every paged tab call. */
export const AuthorTabInputSchema = zod.object({
	slug: authorSlugInput,
	cursor: CursorPaginationInputSchema.shape.cursor,
	limit: zod.number().int().min(1).max(100).default(10),
});

function pageOf<T extends zod.ZodType>(item: T) {
	return zod.object({
		items: zod.array(item),
		metadata: AuthorTabMetadataSchema,
	});
}

// ── Directory: author.list / author.nationalityFacets ──────────────────────

export const AuthorCardSchema = zod.object({
	slug: zod.string(),
	name: zod.string(),
	/** "1821–1881", "b. 1965", "d. 1881" or null. */
	lifespan: zod.string().nullable(),
	birthYear: zod.number().int().nullable(),
	deathYear: zod.number().int().nullable(),
	nationalities: zod.array(AuthorNationalitySchema),
	/** null when the gender is unknown (never show "unknown"). */
	gender: AuthorGenderSchema.exclude(["unknown"]).nullable(),
	photoUrl: zod.string().nullable(),
	/** Books by the author in the library. */
	bookCount: CountSchema,
	/** Different members who read at least one of their books. */
	readerCount: CountSchema,
	/** All reads of their books (one member reading two books counts twice). */
	readCount: CountSchema,
	/** Reviews of their books. */
	reviewCount: CountSchema,
	/** Pages of all their books in the library added together. */
	totalPages: CountSchema,
	/** Average club rating over all reviews of their books; null when none. */
	averageRating: zod.number().min(0).max(5).nullable(),
	/** How many members follow the author (names are private). */
	followerCount: CountSchema,
	followedByMe: zod.boolean(),
	/** Admins only; null for everyone else. */
	status: AuthorStatusSchema.nullable(),
	/** Up to 4 cover ids of their books (title order). */
	coverIds: zod.array(zod.number().int().nullable()).max(4),
});
export type AuthorCard = zod.infer<typeof AuthorCardSchema>;

const authorDirectoryQueryShape = authorDirectoryFiltersSchema
	.extend(authorDirectorySorting.inputSchema.shape)
	.extend(authorDirectorySearching.inputSchema.shape);

function refineDirectoryRanges(
	value: zod.infer<typeof authorDirectoryQueryShape>,
	ctx: zod.RefinementCtx,
) {
	const pairs = [
		["minBooks", "maxBooks"],
		["minReaders", "maxReaders"],
		["minReads", "maxReads"],
		["minPages", "maxPages"],
		["minReviews", "maxReviews"],
		["minAverageRating", "maxAverageRating"],
	] as const;
	for (const [min, max] of pairs) {
		const low = value[min];
		const high = value[max];
		if (low != null && high != null && high < low) {
			ctx.addIssue({
				code: "custom",
				message: "Maximum must be greater than or equal to minimum",
				path: [max],
			});
		}
	}
}

export const AuthorListInputSchema = authorDirectoryQueryShape
	.extend(CursorPaginationInputSchema.shape)
	.superRefine(refineDirectoryRanges);
export const AuthorListOutputSchema = pageOf(AuthorCardSchema);
export type AuthorListInput = zod.infer<typeof AuthorListInputSchema>;
export type AuthorListOutput = zod.infer<typeof AuthorListOutputSchema>;

export const AuthorNationalityFacetsInputSchema = authorDirectoryQueryShape
	.extend({ pinnedCountryCodes: zod.array(bookCountryCodeSchema).optional() })
	.superRefine(refineDirectoryRanges);
export const AuthorNationalityFacetsOutputSchema = zod.object({
	countries: zod.array(
		zod.object({
			alpha2: bookCountryCodeSchema,
			name: zod.string(),
			/** Authors with this nationality under the other active filters. */
			authorCount: CountSchema,
		}),
	),
});
export type AuthorNationalityFacetsInput = zod.infer<
	typeof AuthorNationalityFacetsInputSchema
>;
export type AuthorNationalityFacetsOutput = zod.infer<
	typeof AuthorNationalityFacetsOutputSchema
>;

// ── Overview: author.get ───────────────────────────────────────────────────

/** A date with the precision we know: year alone, year+month, or a full date. */
export const AuthorDateSchema = zod.object({
	year: zod.number().int().nullable(),
	month: zod.number().int().min(1).max(12).nullable(),
	day: zod.number().int().min(1).max(31).nullable(),
	/** "1821", "Nov 1821", "11 Nov 1821", "384 BC"; null when unknown. */
	text: zod.string().nullable(),
	place: zod.string().nullable(),
});

export const AuthorLinkSchema = zod.object({
	kind: zod.enum([
		"wikipedia",
		"goodreads",
		"openlibrary",
		"wikidata",
		"website",
	]),
	label: zod.string(),
	url: zod.string(),
});

export const AuthorProfileSchema = zod.object({
	/** Canonical slug (never changes when the name is edited). */
	slug: zod.string(),
	name: zod.string(),
	/** "Tolkien, J. R. R." */
	sortName: zod.string().nullable(),
	/** Other spellings of the name. */
	aliases: zod.array(zod.string()),
	/** Plain text, up to 2,000 characters. */
	bio: zod.string().nullable(),
	/** Where the bio came from; show the credit line when it is "wikipedia". */
	bioSource: AuthorFieldSourceSchema.nullable(),
	/** Present when the bio is from Wikipedia: link and licence line to show under it. */
	bioAttribution: zod
		.object({
			label: zod.string(),
			url: zod.string().nullable(),
			licenseNote: zod.string(),
		})
		.nullable(),
	birth: AuthorDateSchema,
	death: AuthorDateSchema,
	/** "1821–1881", "b. 1965", "d. 1881" or null. */
	lifespan: zod.string().nullable(),
	/** "died aged 59", "aged 60", or nothing known. */
	age: zod.object({
		kind: zod.enum(["alive", "died", "unknown"]),
		age: zod.number().int().nullable(),
		text: zod.string().nullable(),
	}),
	nationalities: zod.array(AuthorNationalitySchema),
	/** null when unknown. */
	gender: AuthorGenderSchema.exclude(["unknown"]).nullable(),
	/** Wikipedia, Goodreads, Open Library, Wikidata and website links that exist. */
	links: zod.array(AuthorLinkSchema),
	photo: zod
		.object({
			url: zod.string(),
			credit: zod.string().nullable(),
			license: zod.string().nullable(),
			sourceUrl: zod.string().nullable(),
		})
		.nullable(),
	/** True when an admin confirmed the details. */
	verified: zod.boolean(),
	/** True while the details were filled in automatically and no admin confirmed them yet ("Filled in automatically"). */
	autoFilled: zod.boolean(),
	/** Admins only: status, enrichment and per-field provenance with locks. null for others. */
	admin: zod
		.object({
			status: AuthorStatusSchema,
			enrichmentStatus: AuthorEnrichmentStatusSchema,
			enrichmentError: zod.string().nullable(),
			enrichedAt: zod.coerce.date().nullable(),
			openLibraryId: zod.string().nullable(),
			wikidataId: zod.string().nullable(),
			/** `{ bio: { source: "wikipedia", locked: false }, ... }` */
			fieldMeta: zod.record(
				zod.string(),
				zod.object({
					source: AuthorFieldSourceSchema,
					locked: zod.boolean().optional(),
				}),
			),
		})
		.nullable(),
	createdAt: zod.coerce.date(),
	updatedAt: zod.coerce.date(),
});
export type AuthorProfile = zod.infer<typeof AuthorProfileSchema>;

export const AuthorNumbersSchema = zod.object({
	/** Books by the author in the library. */
	bookCount: CountSchema,
	/** Different members who read at least one of their books. */
	readerCount: CountSchema,
	/** All reads of their books. */
	readCount: CountSchema,
	reviewCount: CountSchema,
	averageRating: zod.number().min(0).max(5).nullable(),
	followerCount: CountSchema,
});

export const AuthorGetOutputSchema = zod.object({
	/** Canonical slug when the slug asked for was a merged, old or alias slug (redirect the page); otherwise null. */
	redirectTo: zod.string().nullable(),
	profile: AuthorProfileSchema,
	numbers: AuthorNumbersSchema,
	/** One line for the overview, such as "Writes in 2 series: Foundation (3 of 7 books)"; null when no series. */
	seriesSummary: zod.object({
		count: CountSchema,
		line: zod.string().nullable(),
	}),
	viewer: zod.object({
		isSignedIn: zod.boolean(),
		isAdmin: zod.boolean(),
		/** Following the author. */
		followed: zod.boolean(),
		/** How many of the author's books the viewer has read (0 when signed out). */
		readCount: CountSchema,
		totalBooks: CountSchema,
		progress: zod.object({
			read: CountSchema,
			total: CountSchema,
			percent: zod.number().int().min(0).max(100),
		}),
	}),
});
export type AuthorGetOutput = zod.infer<typeof AuthorGetOutputSchema>;

// ── About: author.about ────────────────────────────────────────────────────

export const AuthorAboutOutputSchema = zod.object({
	/** Where each filled-in field came from (only fields that have a value). */
	sources: zod.array(
		zod.object({
			field: zod.string(),
			label: zod.string(),
			source: AuthorFieldSourceSchema,
			sourceLabel: zod.string(),
			/** Admins only: the field is locked against automatic updates. */
			locked: zod.boolean().nullable(),
		}),
	),
	/** Credits to print on the page: photo credit and licence, bio source. */
	credits: zod.object({
		photo: zod
			.object({
				credit: zod.string().nullable(),
				license: zod.string().nullable(),
				sourceUrl: zod.string().nullable(),
			})
			.nullable(),
		/** Show the Wikipedia credit line (the bio is Wikipedia text). */
		wikipediaAttribution: zod.boolean(),
		bioAttribution: AuthorProfileSchema.shape.bioAttribution,
	}),
	verified: zod.boolean(),
	autoFilled: zod.boolean(),
	/** When the details were last filled in or changed. */
	updatedAt: zod.coerce.date(),
	/** Which details are still missing, for "Help complete this page" hints (admins can act on them). */
	missing: zod.array(
		zod.enum([
			"bio",
			"birth",
			"death",
			"places",
			"nationality",
			"gender",
			"photo",
			"links",
		]),
	),
});
export type AuthorAboutOutput = zod.infer<typeof AuthorAboutOutputSchema>;

// ── Books: author.books / author.bookFacets ────────────────────────────────

/**
 * `author.books` takes the same filters, sorts, range and search as `book.getBookList`
 * (so the author's Books tab works like /books) minus the author filter: the author is
 * the one in `slug`. It returns the same list item (`BookListItem`, with `authorRefs`
 * and `series`) plus `readByMe`. Defaults: oldest publication first.
 */
export const AuthorBooksInputSchema = bookListQueryInputShape
	.omit({ authors: true })
	.extend({
		slug: authorSlugInput,
		sortBy: zod.enum(bookSortableFields).default("publishedIn"),
		sortDirection: zod.enum(["asc", "desc"]).default("asc"),
		cursor: CursorPaginationInputSchema.shape.cursor,
		limit: zod.number().int().min(1).max(100).default(24),
	})
	.superRefine(refineBookListQueryInput);

export const AuthorBookItemSchema = BookListItemSchema.extend({
	/** The viewer has read it (false when signed out). */
	readByMe: zod.boolean(),
});
export const AuthorBooksOutputSchema = zod.object({
	items: zod.array(AuthorBookItemSchema),
	/** Same metadata as `book.getBookList` (cursor is a book slug; `total` on the first page). */
	metadata: BookListMetadataSchema,
});
export type AuthorBooksInput = zod.infer<typeof AuthorBooksInputSchema>;
export type AuthorBookItem = zod.infer<typeof AuthorBookItemSchema>;
export type AuthorBooksOutput = zod.infer<typeof AuthorBooksOutputSchema>;

/**
 * Facets for the Books tab filters, scoped to the author and to the other active
 * filters (the filter being faceted is ignored, like `book.getBookListCountryFacets`).
 * Subjects come with their slug (the `subjects` filter takes slugs).
 */
export const AuthorBookFacetsInputSchema = bookListQueryInputShape
	.omit({ authors: true })
	.extend({
		slug: authorSlugInput,
		pinnedCountryCodes: zod.array(bookCountryCodeSchema).optional(),
	})
	.superRefine(refineBookListQueryInput);
export const AuthorBookFacetsOutputSchema = zod.object({
	countries: zod.array(
		zod.object({
			alpha2: zod.string(),
			name: zod.string(),
			bookCount: CountSchema,
		}),
	),
	subjects: zod.array(
		zod.object({
			slug: zod.string(),
			name: zod.string(),
			bookCount: CountSchema,
		}),
	),
	/** Min and max of the numbers the sliders need (null when the author has no book). */
	ranges: zod.object({
		pages: zod.object({ min: zod.number(), max: zod.number() }).nullable(),
		publishedIn: zod
			.object({ min: zod.number(), max: zod.number() })
			.nullable(),
	}),
});
export type AuthorBookFacetsInput = zod.infer<
	typeof AuthorBookFacetsInputSchema
>;
export type AuthorBookFacetsOutput = zod.infer<
	typeof AuthorBookFacetsOutputSchema
>;

// ── More: author.more ──────────────────────────────────────────────────────

export const RelatedAuthorSchema = zod.object({
	slug: zod.string(),
	name: zod.string(),
	photoUrl: zod.string().nullable(),
	lifespan: zod.string().nullable(),
	nationalities: zod.array(AuthorNationalitySchema),
	bookCount: CountSchema,
	/** Higher is more related. */
	score: zod.number(),
	/** Why they are listed, machine readable. */
	reasons: zod.array(
		zod.discriminatedUnion("kind", [
			zod.object({
				kind: zod.literal("nationality"),
				countries: zod.array(zod.string()),
			}),
			zod.object({ kind: zod.literal("era"), yearsApart: CountSchema }),
			zod.object({ kind: zod.literal("co_read"), members: CountSchema }),
		]),
	),
	/** The same reasons as one short line, for example "Also Russian · Born 7 years apart · 3 members read both". */
	reasonText: zod.string(),
	coverIds: zod.array(zod.number().int().nullable()).max(4),
});
export const AuthorMoreOutputSchema = zod.object({
	/** At most 12, most related first. */
	items: zod.array(RelatedAuthorSchema),
});
export type RelatedAuthor = zod.infer<typeof RelatedAuthorSchema>;
export type AuthorMoreOutput = zod.infer<typeof AuthorMoreOutputSchema>;

// ── Shared filters of reads and reviews ────────────────────────────────────

/**
 * Book filters shared by `author.reads` and `author.reviews`: the same fields (and
 * meaning) as the filters of `book.getBookList`.
 */
export const authorScopedBookFiltersSchema = bookListFiltersSchema.pick({
	subjects: true,
	subjectsMatch: true,
	countries: true,
	minPages: true,
	maxPages: true,
	minPublishedIn: true,
	maxPublishedIn: true,
	minAverageRating: true,
	maxAverageRating: true,
});

const usernameListSchema = zod
	.array(zod.string().trim().min(1).max(60))
	.max(30);
const slugListSchema = zod.array(zod.string().trim().min(1).max(200)).max(30);

/**
 * Filters common to the reads and reviews lists. Members are given by username, books and
 * series by slug (what the option endpoints return), so they fit in a URL.
 */
export const authorActivityFiltersSchema = authorScopedBookFiltersSchema
	.extend({
		/** Members (usernames); empty or missing = everyone. */
		members: usernameListSchema.optional(),
		/** Books by this author (slugs). */
		books: slugListSchema.optional(),
		/** Series (slugs) that hold at least one of the author's books. */
		series: slugListSchema.optional(),
		/** Free text search; see each endpoint for what it matches. */
		search: zod.string().trim().max(100).optional(),
	})
	.partial();

// ── Reads: author.reads ────────────────────────────────────────────────────

export const AuthorReadSortFields = [
	"finishedAt",
	"loggedAt",
	"book",
	"member",
] as const;

/**
 * `search` matches member name and username, book title and slug, series title and slug.
 * `finishedFrom`/`finishedTo` bound the read end date (month precision: a read with only a
 * year matches any month of that year; reads with no end date never match a bound).
 * `loggedFrom`/`loggedTo` bound when the read was recorded in the app (the whole `loggedTo` day counts).
 * `finishedAt` sort: reads with no end date are always last, in both directions.
 */
export const AuthorReadsInputSchema = AuthorTabInputSchema.extend(
	authorActivityFiltersSchema.shape,
)
	.extend({
		finishedFrom: zod.coerce.date().optional(),
		finishedTo: zod.coerce.date().optional(),
		loggedFrom: zod.coerce.date().optional(),
		loggedTo: zod.coerce.date().optional(),
		sortBy: zod.enum(AuthorReadSortFields).default("finishedAt"),
		sortDirection: zod.enum(["asc", "desc"]).default("desc"),
	})
	.superRefine((value, ctx) => {
		for (const [from, to] of [
			["finishedFrom", "finishedTo"],
			["loggedFrom", "loggedTo"],
		] as const) {
			const low = value[from];
			const high = value[to];
			if (low && high && high < low) {
				ctx.addIssue({
					code: "custom",
					message: "The end date must be on or after the start date",
					path: [to],
				});
			}
		}
	});

export const AuthorReadItemSchema = zod.object({
	member: AuthorMemberSchema,
	book: AuthorBookRefSchema,
	/** The book's series and place in it; null when it is in none. */
	series: BookSeriesSummarySchema.nullable(),
	/** When they finished it (month is null when only the year is known). */
	finishedMonth: zod.number().int().min(1).max(12).nullable(),
	finishedYear: zod.number().int().nullable(),
	/** The edition they read, when they picked one. */
	edition: ReadEditionRefSchema.nullable(),
	/** When the read was recorded. */
	createdAt: zod.coerce.date(),
});
export const AuthorReadsOutputSchema = pageOf(AuthorReadItemSchema);
export type AuthorReadsInput = zod.infer<typeof AuthorReadsInputSchema>;
export type AuthorReadItem = zod.infer<typeof AuthorReadItemSchema>;
export type AuthorReadsOutput = zod.infer<typeof AuthorReadsOutputSchema>;

// ── Reviews: author.reviews ────────────────────────────────────────────────

export const AuthorReviewSortFields = [
	"createdAt",
	"rating",
	"likes",
	"comments",
	"book",
] as const;

/**
 * `search` matches reviewer name and username, book title and slug, and the review text
 * (the text of spoiler reviews is never matched). `members` are the reviewers.
 * Sorts: createdAt desc = newest, asc = oldest; rating; likes; comments; book title.
 */
export const AuthorReviewsInputSchema = AuthorTabInputSchema.extend(
	authorActivityFiltersSchema.shape,
)
	.extend({
		minRating: zod.number().min(0).max(5).optional(),
		maxRating: zod.number().min(0).max(5).optional(),
		/** `written` has review text; `rating_only` is a rating with no text. */
		reviewType: zod.enum(["written", "rating_only"]).optional(),
		hasImage: zod.boolean().optional(),
		/** `only` keeps spoiler-tagged reviews; `hide` drops them. */
		spoilers: zod.enum(["only", "hide"]).optional(),
		/** Written between these dates (the whole `to` day counts). */
		createdFrom: zod.coerce.date().optional(),
		createdTo: zod.coerce.date().optional(),
		sortBy: zod.enum(AuthorReviewSortFields).default("createdAt"),
		sortDirection: zod.enum(["asc", "desc"]).default("desc"),
	})
	.superRefine((value, ctx) => {
		if (
			value.minRating != null &&
			value.maxRating != null &&
			value.maxRating < value.minRating
		) {
			ctx.addIssue({
				code: "custom",
				message: "Maximum rating must be greater than or equal to minimum",
				path: ["maxRating"],
			});
		}
		if (
			value.createdFrom &&
			value.createdTo &&
			value.createdTo < value.createdFrom
		) {
			ctx.addIssue({
				code: "custom",
				message: "The end date must be on or after the start date",
				path: ["createdTo"],
			});
		}
	});

export const AuthorReviewItemSchema = zod.object({
	/** Feedback slug (link to the review). */
	slug: zod.string(),
	member: AuthorMemberSchema,
	book: AuthorBookRefSchema,
	series: BookSeriesSummarySchema.nullable(),
	rating: zod.number(),
	isSpoiler: zod.boolean(),
	/** Plain-text excerpt (never raw JSON); null for spoiler reviews and rating-only reviews. */
	excerpt: zod.string().nullable(),
	hasImage: zod.boolean(),
	likeCount: CountSchema,
	commentCount: CountSchema,
	createdAt: zod.coerce.date(),
});
export const AuthorReviewsOutputSchema = pageOf(AuthorReviewItemSchema);
export type AuthorReviewsInput = zod.infer<typeof AuthorReviewsInputSchema>;
export type AuthorReviewItem = zod.infer<typeof AuthorReviewItemSchema>;
export type AuthorReviewsOutput = zod.infer<typeof AuthorReviewsOutputSchema>;

// ── Option lists for the multi-selects ─────────────────────────────────────

/**
 * Small searchable lists behind the multi-select filters (at most 20 rows, most active
 * first; an empty `query` gives the top ones). Hidden members never appear.
 */
export const AuthorOptionsInputSchema = zod.object({
	slug: authorSlugInput,
	query: zod.string().trim().max(100).default(""),
});
export const AuthorMemberOptionsInputSchema = AuthorOptionsInputSchema.extend({
	/** `reads` = members who read their books; `reviews` = members who reviewed them. */
	source: zod.enum(["reads", "reviews"]).default("reads"),
});
export const AuthorMemberOptionsOutputSchema = zod.object({
	items: zod.array(
		AuthorMemberSchema.extend({
			/** Reads or reviews of the author's books, by `source`. */
			count: CountSchema,
		}),
	),
});
export const AuthorBookOptionsOutputSchema = zod.object({
	items: zod.array(
		AuthorBookRefSchema.extend({ publishedIn: zod.number().int() }),
	),
});
export const AuthorSeriesOptionsOutputSchema = zod.object({
	/** Only series that hold at least one of the author's books. */
	items: zod.array(
		zod.object({
			slug: zod.string(),
			title: zod.string(),
			/** The author's books in the series. */
			authorBookCount: CountSchema,
		}),
	),
});
export type AuthorMemberOptionsOutput = zod.infer<
	typeof AuthorMemberOptionsOutputSchema
>;
export type AuthorBookOptionsOutput = zod.infer<
	typeof AuthorBookOptionsOutputSchema
>;
export type AuthorSeriesOptionsOutput = zod.infer<
	typeof AuthorSeriesOptionsOutputSchema
>;

// ── Followers: author.followers ────────────────────────────────────────────

export const AuthorFollowerSortFields = [
	"followedAt",
	"name",
	"username",
	"joinedAt",
	"reads",
	"reviews",
	"authorReads",
] as const;

/**
 * Members who follow the author, as people cards (`PeopleListItem`) plus when they
 * followed and what they did with this author's books. Hidden members never appear
 * and banned members only for admins. `search` matches name and username.
 */
export const AuthorFollowersInputSchema = AuthorTabInputSchema.extend({
	search: zod.string().trim().max(100).optional(),
	sortBy: zod.enum(AuthorFollowerSortFields).default("followedAt"),
	sortDirection: zod.enum(["asc", "desc"]).default("desc"),
	/** Read at least one book by the author. */
	readAuthor: zod.boolean().optional(),
	/** Reviewed at least one book by the author. */
	reviewedAuthor: zod.boolean().optional(),
	location: zod.string().trim().max(80).optional(),
	hasBio: zod.boolean().optional(),
	hasAvatar: zod.boolean().optional(),
	/** Followed between these dates (the whole `to` day counts). */
	followedFrom: zod.coerce.date().optional(),
	followedTo: zod.coerce.date().optional(),
});
export const AuthorFollowerItemSchema = PeopleListItemSchema.extend({
	/** When they followed (ISO). */
	followedAt: zod.string(),
	/** Books by this author they read, and reviews they wrote of them. */
	authorReads: CountSchema,
	authorReviews: CountSchema,
});
export const AuthorFollowersOutputSchema = zod.object({
	/** All followers (visible members), whatever the filters. */
	followerCount: CountSchema,
	items: zod.array(AuthorFollowerItemSchema),
	metadata: AuthorTabMetadataSchema,
});
export type AuthorFollowersInput = zod.infer<typeof AuthorFollowersInputSchema>;
export type AuthorFollowerItem = zod.infer<typeof AuthorFollowerItemSchema>;
export type AuthorFollowersOutput = zod.infer<
	typeof AuthorFollowersOutputSchema
>;

// ── Posts: author.posts ────────────────────────────────────────────────────

/** Feed posts that attach this author, in the same shape as the feed (`PostListItem`). */
export const AuthorPostsOutputSchema = pageOf(PostListItemSchema);
export type AuthorPostsOutput = zod.infer<typeof AuthorPostsOutputSchema>;

// ── Sittings: author.sittings ──────────────────────────────────────────────

export const AuthorSittingItemSchema = zod.object({
	slug: zod.string(),
	displayName: zod.string(),
	status: zod.enum(["voting", "reading", "finished"]),
	/** picked = one of their books was chosen; in_poll = voting is open; not_picked = it lost. */
	outcome: zod.enum(["picked", "in_poll", "not_picked"]),
	/** Poll deadline when there is a poll, else when the sitting was created (ISO). */
	date: zod.string(),
	/** Reading deadline (ISO). */
	deadline: zod.string(),
	pollDeadline: zod.string().nullable(),
	readingStartedAt: zod.string().nullable(),
	/** Their books involved in this sitting (usually one). */
	books: zod.array(AuthorBookRefSchema),
	/** The book the club picked (the author's own when outcome is picked). */
	pickedBook: AuthorBookRefSchema.nullable(),
	/** Members taking part (only when the author's book was picked). */
	participantCount: CountSchema,
	/** Of those, members who finished (only when picked). */
	completedCount: CountSchema,
});
export const AuthorSittingsOutputSchema = pageOf(AuthorSittingItemSchema);
export type AuthorSittingItem = zod.infer<typeof AuthorSittingItemSchema>;
export type AuthorSittingsOutput = zod.infer<typeof AuthorSittingsOutputSchema>;

// ── Favorites: author.favorites ────────────────────────────────────────────

export const AuthorFavoritesOutputSchema = zod.object({
	/** All favorites of their books (one per member and book). */
	totalFavorites: CountSchema,
	/** Different members with at least one favorite. */
	memberCount: CountSchema,
	/** Their books ranked by favorites (only books that have some). */
	books: zod.array(
		zod.object({ book: AuthorBookRefSchema, count: CountSchema }),
	),
	/** Members, newest favorite first, paged. */
	members: pageOf(
		zod.object({
			member: AuthorMemberSchema,
			books: zod.array(AuthorBookRefSchema),
			/** Latest favorite (ISO). */
			favoritedAt: zod.string(),
		}),
	),
});
export type AuthorFavoritesOutput = zod.infer<
	typeof AuthorFavoritesOutputSchema
>;

// ── Shelves: author.shelves ────────────────────────────────────────────────

export const AuthorShelfItemSchema = zod.object({
	slug: zod.string(),
	title: zod.string(),
	description: zod.string().nullable(),
	coverImageUrl: zod.string().nullable(),
	type: zod.enum(["ordered", "unordered"]),
	owner: AuthorMemberSchema,
	/** Books on the shelf. */
	bookCount: CountSchema,
	/** Of those, by this author. */
	authorBookCount: CountSchema,
	updatedAt: zod.coerce.date(),
	/** First up to 4 covers by shelf order. */
	coverPreviewCoverIds: zod.array(zod.number().int().nullable()).max(4),
});
export const AuthorShelvesOutputSchema = pageOf(AuthorShelfItemSchema);
export type AuthorShelfItem = zod.infer<typeof AuthorShelfItemSchema>;
export type AuthorShelvesOutput = zod.infer<typeof AuthorShelvesOutputSchema>;

// ── Series: author.series ──────────────────────────────────────────────────

const ProgressSchema = zod.object({
	read: CountSchema,
	total: CountSchema,
	percent: zod.number().int().min(0).max(100),
});

export const AuthorSeriesItemSchema = zod.object({
	slug: zod.string(),
	title: zod.string(),
	description: zod.string().nullable(),
	/** Books in the series (series only hold books that are in the library). */
	bookCount: CountSchema,
	/** Of those, by this author. */
	authorBookCount: CountSchema,
	books: zod.array(
		zod.object({
			position: zod.number(),
			book: AuthorBookRefSchema.extend({ publishedIn: zod.number().int() }),
			byThisAuthor: zod.boolean(),
			readByMe: zod.boolean(),
		}),
	),
	/** The viewer's progress over the whole series; null when signed out. */
	progress: ProgressSchema.nullable(),
	/** The viewer's progress over this author's books in the series; null when signed out. */
	authorProgress: ProgressSchema.nullable(),
});
export const AuthorSeriesOutputSchema = zod.object({
	items: zod.array(AuthorSeriesItemSchema),
});
export type AuthorSeriesItem = zod.infer<typeof AuthorSeriesItemSchema>;
export type AuthorSeriesOutput = zod.infer<typeof AuthorSeriesOutputSchema>;

// ── Stats: author.stats ────────────────────────────────────────────────────

export const AuthorStatsOutputSchema = zod.object({
	totalBooks: CountSchema,
	ratings: zod.object({
		/** Average of all reviews' ratings; null when none. */
		average: zod.number().nullable(),
		count: CountSchema,
		/** Ten half-star buckets, 0.5 to 5. */
		distribution: zod.array(
			zod.object({ rating: zod.number(), count: CountSchema }),
		),
	}),
	mostReadBook: zod
		.object({ book: AuthorBookRefSchema, readCount: CountSchema })
		.nullable(),
	mostReviewedBook: zod
		.object({ book: AuthorBookRefSchema, reviewCount: CountSchema })
		.nullable(),
	highestRatedBook: zod
		.object({
			book: AuthorBookRefSchema,
			rating: zod.number(),
			reviewCount: CountSchema,
		})
		.nullable(),
	/** From finished readings (started to finished). */
	readingTime: zod.object({
		finishedCount: CountSchema,
		averageDays: zod.number().nullable(),
		medianDays: zod.number().nullable(),
		perBook: zod.array(
			zod.object({
				book: AuthorBookRefSchema,
				averageDays: zod.number(),
				readers: CountSchema,
			}),
		),
	}),
	/** Members who read the most of their books (top 10). */
	leaderboard: zod.array(
		zod.object({
			member: AuthorMemberSchema,
			readCount: CountSchema,
			totalBooks: CountSchema,
		}),
	),
	booksPerDecade: zod.array(
		zod.object({ decade: zod.number().int(), count: CountSchema }),
	),
	/** Reads per finish year (reads with a known year). */
	readsPerYear: zod.array(
		zod.object({ year: zod.number().int(), count: CountSchema }),
	),
});
export type AuthorStatsOutput = zod.infer<typeof AuthorStatsOutputSchema>;
