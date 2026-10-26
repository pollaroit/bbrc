import { publicProcedure } from "../../procedures";
import {
	AuthorInsightFavoritesInputSchema,
	AuthorInsightFavoritesOutputSchema,
	AuthorInsightShelvesInputSchema,
	AuthorInsightShelvesOutputSchema,
	AuthorInsightSittingsInputSchema,
	AuthorInsightSittingsOutputSchema,
	AuthorInsightStatsInputSchema,
	AuthorInsightStatsOutputSchema,
} from "./author-insights.schema";
import {
	getAuthorInsightFavorites,
	getAuthorInsightShelves,
	getAuthorInsightSittings,
} from "./author-insights.service";
import { getAuthorInsightStats } from "./author-stats.service";

/** Filterable community tabs and the stats of an author page. See the schema file for the filters. */
export const authorInsightsRouter = {
	sittings: publicProcedure
		.input(AuthorInsightSittingsInputSchema)
		.output(AuthorInsightSittingsOutputSchema)
		.handler(({ input, context }) =>
			getAuthorInsightSittings(input, context.db, context.session),
		),

	shelves: publicProcedure
		.input(AuthorInsightShelvesInputSchema)
		.output(AuthorInsightShelvesOutputSchema)
		.handler(({ input, context }) =>
			getAuthorInsightShelves(input, context.db, context.session),
		),

	favorites: publicProcedure
		.input(AuthorInsightFavoritesInputSchema)
		.output(AuthorInsightFavoritesOutputSchema)
		.handler(({ input, context }) =>
			getAuthorInsightFavorites(input, context.db, context.session),
		),

	stats: publicProcedure
		.input(AuthorInsightStatsInputSchema)
		.output(AuthorInsightStatsOutputSchema)
		.handler(({ input, context }) =>
			getAuthorInsightStats(input, context.db, context.session),
		),
};
