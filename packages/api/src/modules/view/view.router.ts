import {
	adminProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	AdminOverviewInputSchema,
	AdminOverviewOutputSchema,
	AdminViewListInputSchema,
	AdminViewListOutputSchema,
	InsightsInputSchema,
	InsightsOutputSchema,
	TrendingInputSchema,
	TrendingOutputSchema,
	ViewCountsInputSchema,
	ViewCountsOutputSchema,
} from "./view.schema";
import {
	getAdminViewsOverview,
	getTrending,
	getViewCounts,
	getViewInsights,
	listAdminViews,
} from "./view-insights.service";

/**
 * Recording happens in `POST /api/views` (it needs the request's headers), not here.
 */
export const viewRouter = {
	insights: protectedProcedure
		.input(InsightsInputSchema)
		.output(InsightsOutputSchema)
		.handler(({ input, context }) =>
			getViewInsights(
				context.db,
				{
					id: context.session.user.id,
					isAdmin: Boolean(context.session.user.isAdmin),
				},
				input,
			),
		),
	counts: publicProcedure
		.input(ViewCountsInputSchema)
		.output(ViewCountsOutputSchema)
		.handler(({ input, context }) => getViewCounts(context.db, input)),
	trending: publicProcedure
		.input(TrendingInputSchema)
		.output(TrendingOutputSchema)
		.handler(({ input, context }) => getTrending(context.db, input)),
	adminOverview: adminProcedure
		.input(AdminOverviewInputSchema)
		.output(AdminOverviewOutputSchema)
		.handler(({ input, context }) =>
			getAdminViewsOverview(context.db, input.range),
		),
	adminList: adminProcedure
		.input(AdminViewListInputSchema)
		.output(AdminViewListOutputSchema)
		.handler(({ input, context }) => listAdminViews(context.db, input)),
};
