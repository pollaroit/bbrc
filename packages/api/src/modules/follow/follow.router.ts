import { protectedProcedure, publicProcedure } from "../../procedures";
import { revalidateAuthorSlugs } from "../author/author-isr";
import { findAuthorBySlugOrRedirect } from "../author-admin/author-core";
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
		.handler(async ({ input, context }) => {
			const result = await toggleFollow(
				input.target,
				context.session.user.id,
				context.db,
			);
			if (input.target.type === "author") {
				const author = await findAuthorBySlugOrRedirect(
					context.db,
					input.target.slug,
				);
				if (author) revalidateAuthorSlugs(context, [author.slug]);
			}
			return result;
		}),

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
