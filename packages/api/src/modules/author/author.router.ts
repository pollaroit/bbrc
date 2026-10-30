import { publicProcedure } from "../../procedures";
import { loadViewer } from "../visibility/viewer";
import {
	AuthorAboutOutputSchema,
	AuthorBookFacetsInputSchema,
	AuthorBookFacetsOutputSchema,
	AuthorBookOptionsOutputSchema,
	AuthorBooksInputSchema,
	AuthorBooksOutputSchema,
	AuthorFavoritesOutputSchema,
	AuthorFollowersInputSchema,
	AuthorFollowersOutputSchema,
	AuthorGetOutputSchema,
	AuthorListInputSchema,
	AuthorListOutputSchema,
	AuthorMemberOptionsInputSchema,
	AuthorMemberOptionsOutputSchema,
	AuthorMoreOutputSchema,
	AuthorNationalityFacetsInputSchema,
	AuthorNationalityFacetsOutputSchema,
	AuthorOptionsInputSchema,
	AuthorPostsOutputSchema,
	AuthorReadsInputSchema,
	AuthorReadsOutputSchema,
	AuthorReviewsInputSchema,
	AuthorReviewsOutputSchema,
	AuthorSeriesOptionsOutputSchema,
	AuthorSeriesOutputSchema,
	AuthorShelvesOutputSchema,
	AuthorSittingsOutputSchema,
	AuthorSlugInputSchema,
	AuthorStatsOutputSchema,
	AuthorTabInputSchema,
} from "./author.schema";
import {
	getAuthorReads,
	getAuthorReviews,
	listAuthorBookOptions,
	listAuthorMemberOptions,
	listAuthorSeriesOptions,
} from "./author-activity.service";
import { getAuthorBookFacets, getAuthorBooks } from "./author-books.service";
import {
	getAuthor,
	getAuthorAbout,
	listAuthorNationalityFacets,
	listAuthors,
} from "./author-directory.service";
import { getAuthorFollowers } from "./author-followers.service";
import { getAuthorPosts } from "./author-social.service";
import {
	getAuthorFavorites,
	getAuthorMore,
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
			listAuthors(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	nationalityFacets: publicProcedure
		.input(AuthorNationalityFacetsInputSchema)
		.output(AuthorNationalityFacetsOutputSchema)
		.handler(async ({ input, context }) =>
			listAuthorNationalityFacets(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	get: publicProcedure
		.input(AuthorSlugInputSchema)
		.output(AuthorGetOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthor(
				input.slug,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	about: publicProcedure
		.input(AuthorSlugInputSchema)
		.output(AuthorAboutOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorAbout(
				input.slug,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	books: publicProcedure
		.input(AuthorBooksInputSchema)
		.output(AuthorBooksOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorBooks(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	more: publicProcedure
		.input(AuthorSlugInputSchema)
		.output(AuthorMoreOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorMore(
				input.slug,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	bookFacets: publicProcedure
		.input(AuthorBookFacetsInputSchema)
		.output(AuthorBookFacetsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorBookFacets(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	reads: publicProcedure
		.input(AuthorReadsInputSchema)
		.output(AuthorReadsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorReads(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	reviews: publicProcedure
		.input(AuthorReviewsInputSchema)
		.output(AuthorReviewsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorReviews(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	readerOptions: publicProcedure
		.input(AuthorMemberOptionsInputSchema)
		.output(AuthorMemberOptionsOutputSchema)
		.handler(async ({ input, context }) =>
			listAuthorMemberOptions(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	bookOptions: publicProcedure
		.input(AuthorOptionsInputSchema)
		.output(AuthorBookOptionsOutputSchema)
		.handler(async ({ input, context }) =>
			listAuthorBookOptions(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	seriesOptions: publicProcedure
		.input(AuthorOptionsInputSchema)
		.output(AuthorSeriesOptionsOutputSchema)
		.handler(async ({ input, context }) =>
			listAuthorSeriesOptions(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	followers: publicProcedure
		.input(AuthorFollowersInputSchema)
		.output(AuthorFollowersOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorFollowers(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	posts: publicProcedure
		.input(AuthorTabInputSchema)
		.output(AuthorPostsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorPosts(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	sittings: publicProcedure
		.input(AuthorTabInputSchema)
		.output(AuthorSittingsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorSittings(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	favorites: publicProcedure
		.input(AuthorTabInputSchema)
		.output(AuthorFavoritesOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorFavorites(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	shelves: publicProcedure
		.input(AuthorTabInputSchema)
		.output(AuthorShelvesOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorShelves(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	series: publicProcedure
		.input(AuthorSlugInputSchema)
		.output(AuthorSeriesOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorSeries(
				input.slug,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	stats: publicProcedure
		.input(AuthorSlugInputSchema)
		.output(AuthorStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorStats(
				input.slug,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
};
