import { notBannedProcedure, publicProcedure } from "../../procedures";
import {
	GetLikeListInputSchema,
	GetLikeListOutputSchema,
	GetViewerLikesInputSchema,
	GetViewerLikesOutputSchema,
	SetLikeInputSchema,
	ToggleLikeInputSchema,
	ToggleLikeOutputSchema,
} from "./like.schema";
import {
	getLikeList,
	getViewerLikes,
	setLike,
	toggleLike,
} from "./like.service";

export const likeRouter = {
	getLikeList: publicProcedure
		.input(GetLikeListInputSchema)
		.output(GetLikeListOutputSchema)
		.handler(async ({ input, context }) => getLikeList(input, context.db)),
	getViewerLikes: publicProcedure
		.input(GetViewerLikesInputSchema)
		.output(GetViewerLikesOutputSchema)
		.handler(async ({ input, context }) =>
			getViewerLikes(input, context.session?.user.id ?? null, context.db),
		),
	set: notBannedProcedure
		.input(SetLikeInputSchema)
		.output(ToggleLikeOutputSchema)
		.handler(async ({ input, context }) =>
			setLike(input, context.session.user.id, context.db),
		),
	toggle: notBannedProcedure
		.input(ToggleLikeInputSchema)
		.output(ToggleLikeOutputSchema)
		.handler(async ({ input, context }) =>
			toggleLike(input, context.session.user.id, context.db),
		),
};
