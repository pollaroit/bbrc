import { protectedProcedure } from "../../procedures";
import {
	DiscoverLaneSchema,
	GetDiscoverLaneInputSchema,
	ListDiscoverLanesOutputSchema,
} from "./book-discover.schema";
import { getDiscoverLane, listLanesFor } from "./book-discover.service";

const viewerOf = (context: {
	session: { user: { id: string; role?: string | null } };
}) => ({
	id: context.session.user.id,
	role: context.session.user.role,
});

export const bookDiscoverRouter = {
	lanes: protectedProcedure
		.output(ListDiscoverLanesOutputSchema)
		.handler(({ context }) => ({ lanes: listLanesFor(viewerOf(context)) })),
	lane: protectedProcedure
		.input(GetDiscoverLaneInputSchema)
		.output(DiscoverLaneSchema)
		.handler(({ input, context }) =>
			getDiscoverLane(context.db, viewerOf(context), input.id, {
				refresh: input.refresh,
			}),
		),
};
