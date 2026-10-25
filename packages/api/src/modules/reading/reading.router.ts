import { notBannedProcedure, publicProcedure } from "../../procedures";
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
	SetReadingPreferencesInputSchema,
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
	setReadingPreferences,
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
	mine: notBannedProcedure
		.output(ListMyReadingsOutputSchema)
		.handler(async ({ context }) => ({
			items: await listMyReadings(context.db, context.session.user.id),
		})),
	state: notBannedProcedure
		.input(BookSlugInputSchema)
		.output(ReadingBookStateOutputSchema)
		.handler(({ input, context }) =>
			getReadingBookState(context.db, context.session.user.id, input.bookSlug),
		),
	start: notBannedProcedure
		.input(StartReadingInputSchema)
		.output(ReadingItemSchema)
		.handler(({ input, context }) =>
			startReading(context.db, context.session.user.id, input),
		),
	update: notBannedProcedure
		.input(UpdateReadingProgressInputSchema)
		.output(ReadingItemSchema)
		.handler(({ input, context }) =>
			updateReadingProgress(context.db, context.session.user.id, input),
		),
	setEdition: notBannedProcedure
		.input(SetReadingEditionInputSchema)
		.output(ReadingItemSchema)
		.handler(({ input, context }) =>
			setReadingEdition(context.db, context.session.user.id, input),
		),
	abandon: notBannedProcedure
		.input(ReadingIdInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await abandonReading(context.db, context.session.user.id, input.id);
			return { ok: true as const };
		}),
	readers: publicProcedure
		.input(BookSlugInputSchema)
		.output(ListBookReadersOutputSchema)
		.handler(({ input, context }) =>
			listBookReaders(
				context.db,
				context.session?.user.id ?? null,
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
		.handler(({ input, context }) =>
			getUserCurrentReading(
				context.db,
				context.session?.user.id ?? null,
				input.username,
			),
		),
	preferences: notBannedProcedure
		.output(ReadingPreferencesSchema)
		.handler(({ context }) =>
			getReadingPreferences(context.db, context.session.user.id),
		),
	setPreferences: notBannedProcedure
		.input(SetReadingPreferencesInputSchema)
		.output(ReadingPreferencesSchema)
		.handler(({ input, context }) =>
			setReadingPreferences(context.db, context.session.user.id, input),
		),
	stats: notBannedProcedure
		.output(ReadingStatsOutputSchema)
		.handler(({ context }) =>
			getMyReadingStats(context.db, context.session.user.id),
		),
	wishlist: {
		get: notBannedProcedure
			.output(WishlistStateOutputSchema)
			.handler(({ context }) =>
				getWishlist(context.db, context.session.user.id),
			),
		add: notBannedProcedure
			.input(BookSlugInputSchema)
			.output(WishlistChangeOutputSchema)
			.handler(({ input, context }) =>
				addToWishlist(context.db, context.session.user.id, input.bookSlug),
			),
		remove: notBannedProcedure
			.input(BookSlugInputSchema)
			.output(WishlistChangeOutputSchema)
			.handler(({ input, context }) =>
				removeFromWishlist(context.db, context.session.user.id, input.bookSlug),
			),
		popularForSitting: notBannedProcedure
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
