import { AUDIO_MAX_SECONDS, EDITION_FORMATS } from "@bbrc/shared";
import { z } from "zod";

const Count = z.number().int().min(0);

export const ReadingEditionSchema = z.object({
	/** The edition's address for `/books/<slug>/editions/<key>`; null once a member edition was removed. */
	key: z.string().nullable(),
	kind: z.enum(["open_library", "member"]),
	/** Open Library edition id (OL…M). */
	olid: z.string().nullable(),
	/** Our own edition's id (a member-added one). */
	memberEditionId: z.string().nullable(),
	label: z.string().nullable(),
	coverId: z.number().int().nullable(),
	coverUrl: z.string().nullable(),
	language: z.string().nullable(),
	pages: z.number().int().nullable(),
});

export const ReadingPaceSchema = z.object({
	status: z.enum([
		"done",
		"no_deadline",
		"no_data",
		"ahead",
		"on_track",
		"behind",
		"past_deadline",
	]),
	unit: z.enum(["pages", "percent"]),
	remaining: Count,
	perDayRecent: z.number().nullable(),
	perDayNeeded: z.number().nullable(),
	projectedFinish: z.coerce.date().nullable(),
	daysEarly: z.number().int().nullable(),
});

export const ReadingItemSchema = z.object({
	id: z.string(),
	startedAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	finishedAt: z.coerce.date().nullable(),
	percent: z.number().int().min(0).max(100),
	currentPage: z.number().int().nullable(),
	totalPages: z.number().int().nullable(),
	book: z.object({
		slug: z.string(),
		title: z.string(),
		authors: z.array(z.string()),
		coverId: z.number().int().nullable(),
		pages: z.number().int(),
	}),
	edition: ReadingEditionSchema.nullable(),
	/** What kind of edition it is, when known (saved when the edition was picked). */
	editionFormat: z.enum(EDITION_FORMATS).nullable(),
	/** Progress is counted in listening time (an audiobook). */
	trackByTime: z.boolean(),
	totalSeconds: z.number().int().nullable(),
	currentSeconds: z.number().int().nullable(),
	/** Learned reading speed per active minute (pages, percent or seconds of audio). */
	learnedPace: z.number().nullable(),
	/** The page moves by the learned pace while the timer runs. */
	autoPage: z.boolean(),
	/** The sitting this reading counts towards (the book is its pick and you are in it). */
	sitting: z
		.object({
			slug: z.string(),
			deadline: z.coerce.date().nullable(),
			status: z.enum(["voting", "reading", "finished"]),
		})
		.nullable(),
	pace: ReadingPaceSchema.nullable(),
});
export type ReadingItem = z.infer<typeof ReadingItemSchema>;

export const ListMyReadingsOutputSchema = z.object({
	items: z.array(ReadingItemSchema),
});

export const BookSlugInputSchema = z.object({
	bookSlug: z.string().min(1).max(160),
});

/** The viewer's state for one book: what the book page buttons need. */
export const ReadingBookStateOutputSchema = z.object({
	hasRead: z.boolean(),
	inWishlist: z.boolean(),
	reading: ReadingItemSchema.nullable(),
	/** Readings the viewer already has going (max 5). */
	activeCount: Count,
});
export type ReadingBookState = z.infer<typeof ReadingBookStateOutputSchema>;

export const StartReadingInputSchema = z.object({
	bookSlug: z.string().min(1).max(160),
	/** Open Library edition the member picked (OL…M). */
	editionOlid: z
		.string()
		.regex(/^OL\d+M$/)
		.nullish(),
	editionCoverId: z.number().int().nullish(),
	editionLabel: z.string().trim().max(200).nullish(),
	/** One of our own editions. */
	bookEditionId: z.string().uuid().nullish(),
	/** Typed by hand when no edition has it. */
	totalPages: z.number().int().min(1).max(20000).nullish(),
	/** The Open Library edition's format, worked out by the picker (a member edition carries its own). */
	editionFormat: z.enum(EDITION_FORMATS).nullish(),
});

export const UpdateReadingProgressInputSchema = z
	.object({
		id: z.string().uuid(),
		page: z.number().int().min(0).max(20000).optional(),
		percent: z.number().int().min(0).max(100).optional(),
		/** Seconds into the recording (a reading counted in listening time). */
		seconds: z.number().int().min(0).max(AUDIO_MAX_SECONDS).optional(),
		/** Moved by the estimate (auto page), not typed: left out of pace and streaks. */
		estimated: z.boolean().optional(),
	})
	.refine(
		(value) =>
			value.page != null || value.percent != null || value.seconds != null,
		{ message: "Send a page, a percentage or a time." },
	);

export const SetReadingTrackingInputSchema = z.object({
	id: z.string().uuid(),
	/** Count progress in listening time. */
	trackByTime: z.boolean(),
	/** The length of the recording, asked once. */
	totalSeconds: z.number().int().min(60).max(AUDIO_MAX_SECONDS).optional(),
});

export const SetReadingPaceInputSchema = z.object({
	id: z.string().uuid(),
	/** A newly learned pace (units per active minute), or null to forget it. */
	learnedPace: z.number().positive().max(1000).nullable().optional(),
	autoPage: z.boolean().optional(),
});

export const SetReadingEditionInputSchema = StartReadingInputSchema.omit({
	bookSlug: true,
}).extend({ id: z.string().uuid() });

export const ReadingIdInputSchema = z.object({ id: z.string().uuid() });
export const OkSchema = z.object({ ok: z.literal(true) });

// ── Who is reading ─────────────────────────────────────────────────────────

export const BookReaderSchema = z.object({
	username: z.string(),
	name: z.string(),
	image: z.string().nullable(),
	startedAt: z.coerce.date(),
	/** Null when the member keeps their progress to themselves. */
	percent: z.number().int().nullable(),
	currentPage: z.number().int().nullable(),
	totalPages: z.number().int().nullable(),
	edition: ReadingEditionSchema.nullable(),
	isViewer: z.boolean(),
});

export const ListBookReadersOutputSchema = z.object({
	items: z.array(BookReaderSchema),
	/** Everyone reading it, including those who keep it private. */
	total: Count,
});

export const BookReadingCountsOutputSchema = z.object({
	readingNow: Count,
	onWishlists: Count,
});

export const UserCurrentReadingInputSchema = z.object({
	username: z.string().min(3).max(20),
});

export const UserCurrentReadingOutputSchema = z.object({
	items: z.array(
		ReadingItemSchema.omit({ pace: true, sitting: true }).extend({
			/** Hidden unless it is you or the member shows progress. */
			progressVisible: z.boolean(),
		}),
	),
	/** False when the member keeps what they read private. */
	visible: z.boolean(),
});

// ── Preferences ────────────────────────────────────────────────────────────

export const ReadingPreferencesSchema = z.object({
	wishlistPrivate: z.boolean(),
	showCurrentlyReading: z.boolean(),
	showReadingProgress: z.boolean(),
});
export const SetReadingPreferencesInputSchema =
	ReadingPreferencesSchema.partial();

// ── Stats ──────────────────────────────────────────────────────────────────

export const ReadingStatsOutputSchema = z.object({
	finishedCount: Count,
	averageDaysToFinish: z.number().nullable(),
	pagesPerDay: z.number().nullable(),
	longestStreak: Count,
	currentStreak: Count,
	perMonth: z.array(z.object({ month: z.string(), count: Count })),
	pagesFinished: Count,
	/** Reading Mode: saved sessions of at least half a minute. */
	sessions: z.object({
		count: Count,
		totalSeconds: Count,
		averageSeconds: Count,
		longestSeconds: Count,
	}),
	finished: z.array(
		z.object({
			book: z.object({
				slug: z.string(),
				title: z.string(),
				authors: z.array(z.string()),
				coverId: z.number().int().nullable(),
			}),
			startedAt: z.coerce.date(),
			finishedAt: z.coerce.date(),
			days: Count,
			totalPages: z.number().int().nullable(),
		}),
	),
	/** Days with progress logged in the last 120 days (`YYYY-MM-DD` → updates). */
	activity: z.array(z.object({ day: z.string(), updates: Count })),
});
export type ReadingStatsOutput = z.infer<typeof ReadingStatsOutputSchema>;

// ── Wishlist ───────────────────────────────────────────────────────────────

export const WishlistStateOutputSchema = z.object({
	slug: z.string(),
	count: Count,
	isPrivate: z.boolean(),
	/** Book slugs in priority order. */
	bookSlugs: z.array(z.string()),
});

export const WishlistChangeOutputSchema = z.object({
	inWishlist: z.boolean(),
	count: Count,
});

export const WishlistPopularityInputSchema = z.object({
	/** People whose wishlists count (a sitting's participants). */
	sittingSlug: z.string().min(1).max(160),
	limit: z.number().int().min(1).max(30).default(12),
});
export const WishlistPopularityOutputSchema = z.object({
	items: z.array(
		z.object({
			slug: z.string(),
			title: z.string(),
			authors: z.array(z.string()),
			coverId: z.number().int().nullable(),
			/** How many of those people have it on their wishlist (never who). */
			wishlisted: Count,
		}),
	),
});
