import { protectedProcedure, publicProcedure } from "../../procedures";
import { checkAchievementsAfter } from "../achievement/achievement-middleware";
import { loadViewer } from "../visibility/viewer";
import {
	AddFavoriteInputSchema,
	AddFavoriteOutputSchema,
	GetBookFavoriteStateInputSchema,
	GetBookFavoriteStateOutputSchema,
	GetUserFavoritesInputSchema,
	GetUserFavoritesOutputSchema,
	GetViewerLibraryEngagementOutputSchema,
	ListBookFavoritesInputSchema,
	ListBookFavoritesOutputSchema,
	ListMyFavoritesOutputSchema,
	RemoveFavoriteInputSchema,
	RemoveFavoriteOutputSchema,
} from "./favorite.schema";
import {
	addFavorite,
	getBookFavoriteState,
	getUserFavorites,
	getViewerLibraryEngagement,
	listBookFavorites,
	listMyFavorites,
	removeFavorite,
} from "./favorite.service";

export const favoriteRouter = {
	listForBook: publicProcedure
		.input(ListBookFavoritesInputSchema)
		.output(ListBookFavoritesOutputSchema)
		.handler(async ({ context, input }) =>
			listBookFavorites(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),

	getUserFavorites: publicProcedure
		.input(GetUserFavoritesInputSchema)
		.output(GetUserFavoritesOutputSchema)
		.handler(async ({ input, context }) =>
			getUserFavorites(
				input.username,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	listMine: protectedProcedure
		.output(ListMyFavoritesOutputSchema)
		.handler(async ({ context }) =>
			listMyFavorites(context.session.user.id, context.db),
		),
	getViewerLibraryEngagement: protectedProcedure
		.output(GetViewerLibraryEngagementOutputSchema)
		.handler(async ({ context }) =>
			getViewerLibraryEngagement(context.session.user.id, context.db),
		),
	getBookFavoriteState: protectedProcedure
		.input(GetBookFavoriteStateInputSchema)
		.output(GetBookFavoriteStateOutputSchema)
		.handler(async ({ input, context }) =>
			getBookFavoriteState(input, context.session.user.id, context.db),
		),
	add: protectedProcedure
		.use(checkAchievementsAfter("library"))
		.input(AddFavoriteInputSchema)
		.output(AddFavoriteOutputSchema)
		.handler(async ({ input, context }) =>
			addFavorite(input, context.session.user.id, context.db),
		),
	remove: protectedProcedure
		.input(RemoveFavoriteInputSchema)
		.output(RemoveFavoriteOutputSchema)
		.handler(async ({ input, context }) =>
			removeFavorite(input, context.session.user.id, context.db),
		),
};
