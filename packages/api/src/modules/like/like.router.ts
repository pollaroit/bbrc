import { notBannedProcedure, publicProcedure } from "../../procedures";
import {
	GetLikeListInputSchema,
	GetLikeListOutputSchema,
	ToggleLikeInputSchema,
	ToggleLikeOutputSchema,
} from "./like.schema";
import { getLikeList, toggleLike } from "./like.service";

export const likeRouter = {
	getLikeList: publicProcedure
		.input(GetLikeListInputSchema)
		.output(GetLikeListOutputSchema)
		.handler(async ({ input, context }) => getLikeList(input, context.db)),
	toggle: notBannedProcedure
		.input(ToggleLikeInputSchema)
		.output(ToggleLikeOutputSchema)
		.handler(async ({ input, context }) =>
			toggleLike(input, context.session.user.id, context.db),
		),
};
