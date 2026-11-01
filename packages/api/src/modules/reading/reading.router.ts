import { protectedProcedure, publicProcedure } from "../../procedures";
import { loadViewer } from "../visibility/viewer";
import {
	BookReadingCountsOutputSchema,
	BookSlugInputSchema,
	ListBookReadersOutputSchema,
	ListMyReadingsOutputSchema,
	OkSchema,
	ReadingBookStateOutputSchema,
	ReadingIdInputSchema,
	ReadingItemSchema,
	ReadingPreferencesSchema,
	ReadingStatsOutputSchema,
	SetReadingEditionInputSchema,
	SetReadingPaceInputSchema,
	SetReadingPreferencesInputSchema,
	SetReadingTrackingInputSchema,
	StartReadingInputSchema,
	UpdateReadingProgressInputSchema,
	UserCurrentReadingInputSchema,
	UserCurrentReadingOutputSchema,
	WishlistChangeOutputSchema,
	WishlistPopularityInputSchema,
	WishlistPopularityOutputSchema,
	WishlistStateOutputSchema,
} from "./reading.schema";
import {
	abandonReading,
	getBookReadingCounts,
	getMyReadingStats,
	getReadingBookState,
	getReadingPreferences,
	getUserCurrentReading,
	listBookReaders,
	listMyReadings,
	setReadingEdition,
	setReadingPace,
	setReadingPreferences,
	setReadingTracking,
	startReading,
	updateReadingProgress,
} from "./reading.service";
import {
	addToWishlist,
	getWishlist,
	removeFromWishlist,
	wishlistPopularityForSitting,
} from "./wishlist.service";

export const readingRouter = {
	mine: protectedProcedure
		.output(ListMyReadingsOutputSchema)
		.handler(async ({ context }) => ({
			items: await listMyReadings(context.db, context.session.user.id),
		})),
	state: protectedProcedure
		.input(BookSlugInputSchema)
		.output(ReadingBookStateOutputSchema)
		.handler(({ input, context }) =>
			getReadingBookState(context.db, context.session.user.id, input.bookSlug),
		),
	start: protectedProcedure
		.input(StartReadingInputSchema)
		.output(ReadingItemSchema)
		.handler(({ input, context }) =>
			startReading(context.db, context.session.user.id, input),
		),
	update: protectedProcedure
		.input(UpdateReadingProgressInputSchema)
		.output(ReadingItemSchema)
		.handler(({ input, context }) =>
			updateReadingProgress(context.db, context.session.user.id, input),
		),
	setEdition: protectedProcedure
		.input(SetReadingEditionInputSchema)
		.output(ReadingItemSchema)
		.handler(({ input, context }) =>
			setReadingEdition(context.db, context.session.user.id, input),
		),
	setTracking: protectedProcedure
		.input(SetReadingTrackingInputSchema)
		.output(ReadingItemSchema)
		.handler(({ input, context }) =>
			setReadingTracking(context.db, context.session.user.id, input),
		),
	setPace: protectedProcedure
		.input(SetReadingPaceInputSchema)
		.output(ReadingItemSchema)
		.handler(({ input, context }) =>
			setReadingPace(context.db, context.session.user.id, input),
		),
	abandon: protectedProcedure
		.input(ReadingIdInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await abandonReading(context.db, context.session.user.id, input.id);
			return { ok: true as const };
		}),
	readers: publicProcedure
		.input(BookSlugInputSchema)
		.output(ListBookReadersOutputSchema)
		.handler(async ({ input, context }) =>
			listBookReaders(
				context.db,
				await loadViewer(context.db, context.session),
				input.bookSlug,
			),
		),
	counts: publicProcedure
		.input(BookSlugInputSchema)
		.output(BookReadingCountsOutputSchema)
		.handler(({ input, context }) =>
			getBookReadingCounts(context.db, input.bookSlug),
		),
	forUser: publicProcedure
		.input(UserCurrentReadingInputSchema)
		.output(UserCurrentReadingOutputSchema)
		.handler(async ({ input, context }) =>
			getUserCurrentReading(
				context.db,
				await loadViewer(context.db, context.session),
				input.username,
			),
		),
	preferences: protectedProcedure
		.output(ReadingPreferencesSchema)
		.handler(({ context }) =>
			getReadingPreferences(context.db, context.session.user.id),
		),
	setPreferences: protectedProcedure
		.input(SetReadingPreferencesInputSchema)
		.output(ReadingPreferencesSchema)
		.handler(({ input, context }) =>
			setReadingPreferences(context.db, context.session.user.id, input),
		),
	stats: protectedProcedure
		.output(ReadingStatsOutputSchema)
		.handler(({ context }) =>
			getMyReadingStats(context.db, context.session.user.id),
		),
	wishlist: {
		get: protectedProcedure
			.output(WishlistStateOutputSchema)
			.handler(({ context }) =>
				getWishlist(context.db, context.session.user.id),
			),
		add: protectedProcedure
			.input(BookSlugInputSchema)
			.output(WishlistChangeOutputSchema)
			.handler(({ input, context }) =>
				addToWishlist(context.db, context.session.user.id, input.bookSlug),
			),
		remove: protectedProcedure
			.input(BookSlugInputSchema)
			.output(WishlistChangeOutputSchema)
			.handler(({ input, context }) =>
				removeFromWishlist(context.db, context.session.user.id, input.bookSlug),
			),
		popularForSitting: protectedProcedure
			.input(WishlistPopularityInputSchema)
			.output(WishlistPopularityOutputSchema)
			.handler(({ input, context }) =>
				wishlistPopularityForSitting(
					context.db,
					input.sittingSlug,
					input.limit,
				),
			),
	},
};
