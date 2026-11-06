import { publicProcedure } from "../../procedures";
import { loadViewer } from "../visibility/viewer";
import {
	MemberStatsInputSchema,
	MemberStatsOverviewOutputSchema,
	MemberStatsReadingOutputSchema,
} from "./member-stats.schema";
import { getMemberStatsOverview } from "./member-stats-overview.service";
import { getMemberStatsReading } from "./member-stats-reading.service";

/**
 * A member's stats, one call per tab so only the tab on screen is computed. Every call
 * starts from the same context (who the member is, what this viewer may see, the period)
 * and leaves out what the viewer may not see.
 */
export const memberStatsRouter = {
	overview: publicProcedure
		.input(MemberStatsInputSchema)
		.output(MemberStatsOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getMemberStatsOverview(
				context.db,
				await loadViewer(context.db, context.session),
				input,
			),
		),
	reading: publicProcedure
		.input(MemberStatsInputSchema)
		.output(MemberStatsReadingOutputSchema)
		.handler(async ({ input, context }) =>
			getMemberStatsReading(
				context.db,
				await loadViewer(context.db, context.session),
				input,
			),
		),
};
