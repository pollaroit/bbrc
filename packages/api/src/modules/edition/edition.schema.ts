import { z } from "zod";

/*
 * The edition page: `/books/<slug>/editions/<key>` where `<key>` is an Open
 * Library edition id (`OL123M`), `m-<8 chars>` for a member-added edition, or an
 * ISBN alias (`isbn-9780441172719`) that redirects. See `parseEditionKey`.
 *
 * Three calls power it:
 * - `edition.get`      public data, safe to cache and index (no names).
 * - `edition.readers`  who is reading and who read it (names only for signed-in members).
 * - `edition.viewer`   what the signed-in member can do here.
 * plus `edition.compare` for the side-by-side view on the editions page.
 */

const Count = z.number().int().min(0);

export const EditionPersonSchema = z.object({
	username: z.string(),
	name: z.string(),
	image: z.string().nullable(),
});

export const EditionSourceSchema = z.enum(["open_library", "member"]);

export const EditionCoverSchema = z.object({
	/** Open Library cover id, when the cover comes from Open Library. */
	coverId: z.number().int().nullable(),
	/** A cover we host (a member edition's upload). */
	url: z.string().nullable(),
});

export const EditionIdentifiersSchema = z.object({
	oclc: z.array(z.string()),
	lccn: z.array(z.string()),
	goodreads: z.array(z.string()),
	librarything: z.array(z.string()),
	/** Internet Archive item id, when Open Library knows a scanned copy. */
	ocaid: z.string().nullable(),
});

export const EditionCoreSchema = z.object({
	/** The address of this edition (also the canonical one). */
	key: z.string(),
	source: EditionSourceSchema,
	/** For member editions: whether an admin has checked it. */
	verified: z.boolean(),
	/** Title of the edition when it differs from the work (translated title, subtitle). */
	title: z.string().nullable(),
	/** "Penguin Classics", "Revised edition", … */
	editionName: z.string().nullable(),
	languageCode: z.string().nullable(),
	/** "Turkish". */
	language: z.string().nullable(),
	/** "Paperback". */
	format: z.string().nullable(),
	pages: z.number().int().nullable(),
	publishers: z.array(z.string()),
	publishPlaces: z.array(z.string()),
	publishedYear: z.number().int().nullable(),
	/** As Open Library has it ("October 1990"). */
	publishDate: z.string().nullable(),
	isbn10: z.string().nullable(),
	isbn13: z.string().nullable(),
	translator: z.string().nullable(),
	description: z.string().nullable(),
	notes: z.string().nullable(),
	series: z.string().nullable(),
	/** First is the main cover. */
	covers: z.array(EditionCoverSchema),
	identifiers: EditionIdentifiersSchema,
	/** The Open Library record behind this edition (itself, or the one a member edition is linked to). */
	openLibraryOlid: z.string().nullable(),
	/** A member edition linked to this Open Library one (readers of both share this page). */
	linkedMemberKey: z.string().nullable(),
	createdBy: EditionPersonSchema.nullable(),
	createdAt: z.coerce.date().nullable(),
	/** The data came from our saved copy because Open Library did not answer. */
	fromSnapshot: z.boolean(),
});
export type EditionCore = z.infer<typeof EditionCoreSchema>;

/** One edition in a strip, a list or the comparison. */
export const EditionSummarySchema = z.object({
	key: z.string(),
	source: EditionSourceSchema,
	verified: z.boolean(),
	/** A short line that tells it apart: "Penguin · 2003 · Turkish". */
	label: z.string(),
	language: z.string().nullable(),
	format: z.string().nullable(),
	pages: z.number().int().nullable(),
	publisher: z.string().nullable(),
	publishedYear: z.number().int().nullable(),
	translator: z.string().nullable(),
	cover: EditionCoverSchema,
	/** Members who read it or are reading it. */
	readers: Count,
	/** Average days from starting to finishing, over finished readings. */
	averageDaysToFinish: z.number().nullable(),
	isClubFavourite: z.boolean(),
});
export type EditionSummary = z.infer<typeof EditionSummarySchema>;

export const EditionStatsSchema = z.object({
	readingNow: Count,
	finished: Count,
	averageDaysToFinish: z.number().nullable(),
	pagesPerDay: z.number().nullable(),
	/** The average rating members who read this edition gave the book (reviews are per book, not per edition). */
	bookRating: z.object({ average: z.number().nullable(), count: Count }),
});

export const EditionCompareSchema = z.object({
	/** The club's most read edition; null when this is it or nobody has read any. */
	baseline: EditionSummarySchema.nullable(),
	/** Plain sentences: "32 pages shorter", "Different translator (Ann Smith)". */
	differences: z.array(z.string()),
});

export const EditionReviewSchema = z.object({
	slug: z.string(),
	rating: z.number(),
	/** Plain-text preview (never raw rich text). */
	excerpt: z.string(),
	isSpoiler: z.boolean(),
	createdAt: z.coerce.date(),
	author: EditionPersonSchema,
});

export const EditionExternalLinkSchema = z.object({
	id: z.enum([
		"open_library",
		"internet_archive",
		"internet_archive_search",
		"worldcat",
		"google_books",
		"goodreads",
		"librarything",
		"library_of_congress",
	]),
	label: z.string(),
	href: z.string(),
	/** A short line of what you get there ("Borrow a scanned copy for free"). */
	hint: z.string(),
});
export type EditionExternalLink = z.infer<typeof EditionExternalLinkSchema>;

export const EditionPageSchema = z.object({
	book: z.object({
		slug: z.string(),
		title: z.string(),
		authors: z.array(z.string()),
		/** The author records in order (empty until the backfill linked the book). */
		authorRefs: z.array(
			z.object({ id: z.string(), slug: z.string(), name: z.string() }),
		),
		coverId: z.number().int().nullable(),
		pages: z.number().int(),
	}),
	edition: EditionCoreSchema,
	stats: EditionStatsSchema,
	compare: EditionCompareSchema,
	/** Reviews of the BOOK written by members who read this edition. */
	reviews: z.object({
		items: z.array(EditionReviewSchema),
		total: Count,
	}),
	/** Other editions of the same book, club favourites first. */
	others: z.array(EditionSummarySchema),
	isClubFavourite: z.boolean(),
	links: z.array(EditionExternalLinkSchema),
});
export type EditionPage = z.infer<typeof EditionPageSchema>;

export const EditionLookupSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("ok"), page: EditionPageSchema }),
	/** The address is an alias or an old address: go here instead. */
	z.object({ kind: z.literal("redirect"), key: z.string() }),
	/** A member edition that was deleted. */
	z.object({
		kind: z.literal("removed"),
		bookSlug: z.string(),
		bookTitle: z.string(),
	}),
]);
export type EditionLookup = z.infer<typeof EditionLookupSchema>;

export const EditionKeyInputSchema = z.object({
	bookSlug: z.string().min(1).max(160),
	key: z.string().min(1).max(80),
});

export const EditionReaderSchema = EditionPersonSchema.extend({
	isViewer: z.boolean(),
});

export const EditionReadersOutputSchema = z.object({
	/** Counts are always there (everyone, however private); names follow each member's privacy for this viewer. */
	signedIn: z.boolean(),
	readingNow: z.object({
		total: Count,
		/** Members in `total` whose name this viewer may not see. */
		privateCount: Count.default(0),
		items: z.array(
			EditionReaderSchema.extend({
				startedAt: z.coerce.date(),
				/** Null when the member keeps their progress private. */
				percent: z.number().int().nullable(),
				currentPage: z.number().int().nullable(),
				totalPages: z.number().int().nullable(),
			}),
		),
	}),
	finished: z.object({
		total: Count,
		privateCount: Count.default(0),
		items: z.array(
			EditionReaderSchema.extend({
				readEndYear: z.number().int().nullable(),
				readEndMonth: z.number().int().nullable(),
			}),
		),
	}),
});
export type EditionReaders = z.infer<typeof EditionReadersOutputSchema>;

export const EditionViewerOutputSchema = z.object({
	signedIn: z.boolean(),
	readingThis: z.boolean(),
	/** The id of the viewer's current reading of this book, to switch its edition. */
	readingId: z.string().nullable(),
	readingOtherEdition: z.boolean(),
	readThis: z.boolean(),
	hasReadBook: z.boolean(),
	canEdit: z.boolean(),
	canDelete: z.boolean(),
	isAdmin: z.boolean(),
});
export type EditionViewer = z.infer<typeof EditionViewerOutputSchema>;

export const EditionCompareInputSchema = z.object({
	bookSlug: z.string().min(1).max(160),
	keys: z.array(z.string().min(1).max(80)).min(2).max(3),
});
export const EditionCompareOutputSchema = z.object({
	items: z.array(EditionSummarySchema),
});
