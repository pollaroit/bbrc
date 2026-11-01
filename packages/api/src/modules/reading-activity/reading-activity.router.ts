import { publicProcedure } from "../../procedures";
import { loadViewer } from "../visibility/viewer";
import {
	ActivityOverviewInputSchema,
	ActivityOverviewOutputSchema,
	ActivitySessionsInputSchema,
	ActivitySessionsOutputSchema,
} from "./reading-activity.schema";
import {
	getActivityOverview,
	getActivitySessions,
} from "./reading-activity.service";

/** Open to anyone: what a viewer gets is decided from their relation to the member. */
export const readingActivityRouter = {
	overview: publicProcedure
		.input(ActivityOverviewInputSchema)
		.output(ActivityOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getActivityOverview(
				context.db,
				await loadViewer(context.db, context.session),
				input,
			),
		),
	sessions: publicProcedure
		.input(ActivitySessionsInputSchema)
		.output(ActivitySessionsOutputSchema)
		.handler(async ({ input, context }) =>
			getActivitySessions(
				context.db,
				await loadViewer(context.db, context.session),
				input,
			),
		),
};
