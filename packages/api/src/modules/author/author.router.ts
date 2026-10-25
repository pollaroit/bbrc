import { publicProcedure } from "../../procedures";
import {
	AuthorAboutOutputSchema,
	AuthorBooksInputSchema,
	AuthorBooksOutputSchema,
	AuthorCommentsOutputSchema,
	AuthorFavoritesOutputSchema,
	AuthorGetOutputSchema,
	AuthorListInputSchema,
	AuthorListOutputSchema,
	AuthorMoreOutputSchema,
	AuthorNationalityFacetsInputSchema,
	AuthorNationalityFacetsOutputSchema,
	AuthorPostsOutputSchema,
	AuthorReadsOutputSchema,
	AuthorReviewsInputSchema,
	AuthorReviewsOutputSchema,
	AuthorSeriesOutputSchema,
	AuthorShelvesOutputSchema,
	AuthorSittingsOutputSchema,
	AuthorSlugInputSchema,
	AuthorStatsOutputSchema,
	AuthorTabInputSchema,
	GetAuthorListCountryFacetsInputSchema,
	GetAuthorListCountryFacetsOutputSchema,
	GetAuthorListInputSchema,
	GetAuthorListOutputSchema,
	GetAuthorPageInputSchema,
	GetAuthorPageOutputSchema,
} from "./author.schema";
import {
	getAuthorList,
	getAuthorListCountryFacets,
	getAuthorPage,
} from "./author.service";
import {
	getAuthor,
	getAuthorAbout,
	listAuthorNationalityFacets,
	listAuthors,
} from "./author-directory.service";
import { getAuthorComments, getAuthorPosts } from "./author-social.service";
import {
	getAuthorBooks,
	getAuthorFavorites,
	getAuthorMore,
	getAuthorReads,
	getAuthorReviews,
	getAuthorSeries,
	getAuthorShelves,
	getAuthorSittings,
	getAuthorStats,
} from "./author-tabs.service";

export const authorRouter = {
	// ── Author model (see the notes at the top of author.schema.ts) ──
	list: publicProcedure
		.input(AuthorListInputSchema)
		.output(AuthorListOutputSchema)
		.handler(async ({ input, context }) =>
			listAuthors(input, context.db, context.session),
		),
	nationalityFacets: publicProcedure
		.input(AuthorNationalityFacetsInputSchema)
		.output(AuthorNationalityFacetsOutputSchema)
		.handler(async ({ input, context }) =>
			listAuthorNationalityFacets(input, context.db, context.session),
		),
	get: publicProcedure
		.input(AuthorSlugInputSchema)
		.output(AuthorGetOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthor(input.slug, context.db, context.session),
		),
	about: publicProcedure
		.input(AuthorSlugInputSchema)
		.output(AuthorAboutOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorAbout(input.slug, context.db, context.session),
		),
	books: publicProcedure
		.input(AuthorBooksInputSchema)
		.output(AuthorBooksOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorBooks(input, context.db, context.session),
		),
	more: publicProcedure
		.input(AuthorSlugInputSchema)
		.output(AuthorMoreOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorMore(input.slug, context.db, context.session),
		),
	reads: publicProcedure
		.input(AuthorTabInputSchema)
		.output(AuthorReadsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorReads(input, context.db, context.session),
		),
	reviews: publicProcedure
		.input(AuthorReviewsInputSchema)
		.output(AuthorReviewsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorReviews(input, context.db, context.session),
		),
	posts: publicProcedure
		.input(AuthorTabInputSchema)
		.output(AuthorPostsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorPosts(input, context.db, context.session),
		),
	comments: publicProcedure
		.input(AuthorTabInputSchema)
		.output(AuthorCommentsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorComments(input, context.db, context.session),
		),
	sittings: publicProcedure
		.input(AuthorTabInputSchema)
		.output(AuthorSittingsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorSittings(input, context.db, context.session),
		),
	favorites: publicProcedure
		.input(AuthorTabInputSchema)
		.output(AuthorFavoritesOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorFavorites(input, context.db, context.session),
		),
	shelves: publicProcedure
		.input(AuthorTabInputSchema)
		.output(AuthorShelvesOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorShelves(input, context.db, context.session),
		),
	series: publicProcedure
		.input(AuthorSlugInputSchema)
		.output(AuthorSeriesOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorSeries(input.slug, context.db, context.session),
		),
	stats: publicProcedure
		.input(AuthorSlugInputSchema)
		.output(AuthorStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorStats(input.slug, context.db, context.session),
		),

	// ── Legacy, name based: the old author pages still use these until the web moves ──
	/** @deprecated use `get` */
	getPage: publicProcedure
		.input(GetAuthorPageInputSchema)
		.output(GetAuthorPageOutputSchema)
		.handler(async ({ input, context }) => getAuthorPage(input, context.db)),
	/** @deprecated use `list` */
	getList: publicProcedure
		.input(GetAuthorListInputSchema)
		.output(GetAuthorListOutputSchema)
		.handler(async ({ input, context }) => getAuthorList(input, context.db)),
	/** @deprecated use `nationalityFacets` */
	getCountryFacets: publicProcedure
		.input(GetAuthorListCountryFacetsInputSchema)
		.output(GetAuthorListCountryFacetsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorListCountryFacets(input, context.db),
		),
};
