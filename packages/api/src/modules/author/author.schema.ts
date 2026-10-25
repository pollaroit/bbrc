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
 *   author.books             books by the author (paged, sortable, with series + viewer read state)
 *   author.more              related authors (nationality, era, read by the same members), max 12
 *   author.reads             members' reads of the author's books (paged)
 *   author.reviews           reviews of the author's books (paged, excerpts only)
 *   author.posts             feed posts that attach this author (paged, feed shape)
 *   author.comments          comments on posts that attach this author (paged, list shape)
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
import { CommentListItemSchema } from "../comment/comment.schema";
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
	/** Reviews of their books. */
	reviewCount: CountSchema,
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

// ── Books: author.books ────────────────────────────────────────────────────

export const AuthorBookSortFields = [
	"title",
	"publishedIn",
	"averageRating",
	"readCount",
	"createdAt",
] as const;

export const AuthorBooksInputSchema = AuthorTabInputSchema.extend({
	sortBy: zod.enum(AuthorBookSortFields).default("publishedIn"),
	sortDirection: zod.enum(["asc", "desc"]).default("asc"),
	limit: zod.number().int().min(1).max(100).default(24),
});

export const AuthorBookItemSchema = AuthorBookRefSchema.extend({
	publishedIn: zod.number().int(),
	pages: zod.number().int(),
	/** Club average (stored on the book); null when nobody rated it. */
	averageRating: zod.number().nullable(),
	/** Members who read it (visible members). */
	readCount: CountSchema,
	feedbackCount: CountSchema,
	createdAt: zod.coerce.date(),
	series: BookSeriesSummarySchema.nullable(),
	/** The other authors of the same book, linked to their pages. */
	coAuthors: zod.array(zod.object({ slug: zod.string(), name: zod.string() })),
	/** The viewer has read it (false when signed out). */
	readByMe: zod.boolean(),
});
export const AuthorBooksOutputSchema = pageOf(AuthorBookItemSchema);
export type AuthorBookItem = zod.infer<typeof AuthorBookItemSchema>;
export type AuthorBooksOutput = zod.infer<typeof AuthorBooksOutputSchema>;

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

// ── Reads: author.reads ────────────────────────────────────────────────────

export const AuthorReadItemSchema = zod.object({
	member: AuthorMemberSchema,
	book: AuthorBookRefSchema,
	/** When they finished it (month is null when only the year is known). */
	finishedMonth: zod.number().int().min(1).max(12).nullable(),
	finishedYear: zod.number().int().nullable(),
	/** The edition they read, when they picked one. */
	edition: ReadEditionRefSchema.nullable(),
	/** When the read was recorded. */
	createdAt: zod.coerce.date(),
});
export const AuthorReadsOutputSchema = pageOf(AuthorReadItemSchema);
export type AuthorReadItem = zod.infer<typeof AuthorReadItemSchema>;
export type AuthorReadsOutput = zod.infer<typeof AuthorReadsOutputSchema>;

// ── Reviews: author.reviews ────────────────────────────────────────────────

export const AuthorReviewsInputSchema = AuthorTabInputSchema.extend({
	sortBy: zod.enum(["createdAt", "rating"]).default("createdAt"),
	sortDirection: zod.enum(["asc", "desc"]).default("desc"),
});

export const AuthorReviewItemSchema = zod.object({
	/** Feedback slug (link to the review). */
	slug: zod.string(),
	member: AuthorMemberSchema,
	book: AuthorBookRefSchema,
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
export type AuthorReviewItem = zod.infer<typeof AuthorReviewItemSchema>;
export type AuthorReviewsOutput = zod.infer<typeof AuthorReviewsOutputSchema>;

// ── Posts and comments: author.posts / author.comments ─────────────────────

/** Feed posts that attach this author, in the same shape as the feed (`PostListItem`). */
export const AuthorPostsOutputSchema = pageOf(PostListItemSchema);
export type AuthorPostsOutput = zod.infer<typeof AuthorPostsOutputSchema>;

/**
 * Comments carry no attachment of their own, so this lists the comments written on posts
 * that attach this author (`CommentListItem` plus the post they belong to).
 */
export const AuthorCommentItemSchema = CommentListItemSchema.extend({
	post: zod.object({ slug: zod.string(), excerpt: zod.string() }).nullable(),
});
export const AuthorCommentsOutputSchema = pageOf(AuthorCommentItemSchema);
export type AuthorCommentItem = zod.infer<typeof AuthorCommentItemSchema>;
export type AuthorCommentsOutput = zod.infer<typeof AuthorCommentsOutputSchema>;

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
