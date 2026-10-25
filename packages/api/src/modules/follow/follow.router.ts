import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	FollowStateInputSchema,
	FollowStatesInputSchema,
	ToggleFollowInputSchema,
} from "./follow.schema";
import {
	getFollowState,
	getFollowStates,
	listMyFollows,
	toggleFollow,
} from "./follow.service";

export const followRouter = {
	/** Follow, or stop following. Returns the new state and the follower count. */
	toggle: protectedProcedure
		.input(ToggleFollowInputSchema)
		.handler(({ input, context }) =>
			toggleFollow(input.target, context.session.user.id, context.db),
		),

	/** Counts only, never names. `following` is false when nobody is signed in. */
	state: publicProcedure
		.input(FollowStateInputSchema)
		.handler(({ input, context }) =>
			getFollowState(input.target, context.session?.user?.id, context.db),
		),

	/** The same for a list of cards (at most 60 targets). */
	states: publicProcedure
		.input(FollowStatesInputSchema)
		.handler(({ input, context }) =>
			getFollowStates(input.targets, context.session?.user?.id, context.db),
		),

	mine: protectedProcedure.handler(({ context }) =>
		listMyFollows(context.session.user.id, context.db),
	),
};
