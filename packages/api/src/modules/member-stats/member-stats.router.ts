import { publicProcedure } from "../../procedures";
import { loadViewer } from "../visibility/viewer";
import {
	MemberStatsClubLifeOutputSchema,
	MemberStatsCommunityOutputSchema,
	MemberStatsInputSchema,
	MemberStatsOverviewOutputSchema,
	MemberStatsReadingOutputSchema,
	MemberStatsTasteOutputSchema,
} from "./member-stats.schema";
import { getMemberStatsClubLife } from "./member-stats-club-life.service";
import { getMemberStatsCommunity } from "./member-stats-community.service";
import { getMemberStatsOverview } from "./member-stats-overview.service";
import { getMemberStatsReading } from "./member-stats-reading.service";
import { getMemberStatsTaste } from "./member-stats-taste.service";

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
	taste: publicProcedure
		.input(MemberStatsInputSchema)
		.output(MemberStatsTasteOutputSchema)
		.handler(async ({ input, context }) =>
			getMemberStatsTaste(
				context.db,
				await loadViewer(context.db, context.session),
				input,
			),
		),
	community: publicProcedure
		.input(MemberStatsInputSchema)
		.output(MemberStatsCommunityOutputSchema)
		.handler(async ({ input, context }) =>
			getMemberStatsCommunity(
				context.db,
				await loadViewer(context.db, context.session),
				input,
			),
		),
	clubLife: publicProcedure
		.input(MemberStatsInputSchema)
		.output(MemberStatsClubLifeOutputSchema)
		.handler(async ({ input, context }) =>
			getMemberStatsClubLife(
				context.db,
				await loadViewer(context.db, context.session),
				input,
			),
		),
};
