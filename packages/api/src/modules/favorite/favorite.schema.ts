import { BookSchema, UserSchema } from "@bbrc/schemas";
import { MAX_FAVORITES_PER_USER } from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

export const FavoriteBookSchema = BookSchema.pick({
	slug: true,
	title: true,
	authors: true,
	coverId: true,
});

export const FavoriteItemSchema = zod.object({
	id: zod.string().uuid(),
	createdAt: zod.coerce.date(),
	book: FavoriteBookSchema,
});

export const GetUserFavoritesInputSchema = UserSchema.pick({
	username: true,
});

export const GetUserFavoritesOutputSchema = zod.array(FavoriteItemSchema);

export type GetUserFavoritesOutput = z.infer<
	typeof GetUserFavoritesOutputSchema
>;

export const GetBookFavoriteStateInputSchema = BookSchema.shape.slug;

export const GetBookFavoriteStateOutputSchema = zod.object({
	isFavorite: zod.boolean(),
	favoriteId: zod.uuid().nullable(),
	canFavorite: zod.boolean(),
	slotsUsed: zod.number().int().min(0).max(MAX_FAVORITES_PER_USER),
	maxSlots: zod.literal(MAX_FAVORITES_PER_USER),
	hint: zod.string().nullable(),
});

export type GetBookFavoriteStateOutput = z.infer<
	typeof GetBookFavoriteStateOutputSchema
>;

export const ListMyFavoritesOutputSchema = GetUserFavoritesOutputSchema;

export type ListMyFavoritesOutput = z.infer<typeof ListMyFavoritesOutputSchema>;

export const AddFavoriteInputSchema = zod.object({
	bookSlug: BookSchema.shape.slug,
	replaceFavoriteId: zod.string().uuid().optional(),
});

export const AddFavoriteOutputSchema = FavoriteItemSchema;

export type AddFavoriteInput = z.infer<typeof AddFavoriteInputSchema>;
export type AddFavoriteOutput = z.infer<typeof AddFavoriteOutputSchema>;

export const ListBookFavoritesInputSchema = zod.object({
	bookSlug: BookSchema.shape.slug,
	limit: zod.number().int().min(1).max(100).optional(),
});

export type ListBookFavoritesInput = zod.infer<
	typeof ListBookFavoritesInputSchema
>;

export const BookFavoriteListItemSchema = zod.object({
	favoritedAt: zod.coerce.date(),
	slotsUsed: zod.number().int().min(0).max(MAX_FAVORITES_PER_USER),
	maxSlots: zod.literal(MAX_FAVORITES_PER_USER),
	user: zod.object({
		username: zod.string(),
		name: zod.string(),
		image: zod.string().nullable(),
	}),
});

export const ListBookFavoritesOutputSchema = zod.object({
	total: zod.number().int().nonnegative(),
	/** Favouriters in `total` whose name this viewer may not see. */
	privateCount: zod.number().int().nonnegative().default(0),
	items: zod.array(BookFavoriteListItemSchema),
});

export type ListBookFavoritesOutput = zod.infer<
	typeof ListBookFavoritesOutputSchema
>;

export const RemoveFavoriteInputSchema = zod.object({
	bookSlug: BookSchema.shape.slug,
});

export const RemoveFavoriteOutputSchema = zod.object({
	removed: zod.literal(true),
});

export type RemoveFavoriteInput = z.infer<typeof RemoveFavoriteInputSchema>;

export const ViewerFeedbackRatingSchema = zod.object({
	bookSlug: BookSchema.shape.slug,
	rating: zod.number(),
});

/** One query for the library grid: personal reads + favorites for the viewer. */
export const GetViewerLibraryEngagementOutputSchema = zod.object({
	readSlugs: zod.array(BookSchema.shape.slug),
	favoriteSlugs: zod.array(BookSchema.shape.slug),
	feedbackBookSlugs: zod.array(BookSchema.shape.slug),
	feedbackRatings: zod.array(ViewerFeedbackRatingSchema),
	/** Books on the viewer's wishlist (for the bookmark on cards). */
	wishlistSlugs: zod.array(BookSchema.shape.slug),
	/** Books the viewer is reading right now. */
	readingSlugs: zod.array(BookSchema.shape.slug),
	slotsUsed: zod.number().int().min(0).max(MAX_FAVORITES_PER_USER),
	maxSlots: zod.literal(MAX_FAVORITES_PER_USER),
});

export type GetViewerLibraryEngagementOutput = z.infer<
	typeof GetViewerLibraryEngagementOutputSchema
>;

export const favoriteBookSelect = {
	slug: true,
	title: true,
	authors: true,
	coverId: true,
} as const;

export const favoriteItemSelect = {
	id: true,
	createdAt: true,
	book: { select: favoriteBookSelect },
} as const;
