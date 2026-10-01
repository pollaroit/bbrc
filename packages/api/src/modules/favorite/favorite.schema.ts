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

export const RemoveFavoriteInputSchema = zod.object({
	bookSlug: BookSchema.shape.slug,
});

export const RemoveFavoriteOutputSchema = zod.object({
	removed: zod.literal(true),
});

export type RemoveFavoriteInput = z.infer<typeof RemoveFavoriteInputSchema>;

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
