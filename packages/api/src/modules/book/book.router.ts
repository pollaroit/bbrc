import { BookSchema } from "@bbrc/schemas";
import {
	adminProcedure,
	notBannedProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	revalidateBookIsr,
	revalidateFeedsIsr,
	revalidateSeriesIsr,
} from "../../revalidate-isr";
import { invalidateDiscoverLanes } from "../book-discover/book-discover.service";
import {
	AddBookInputSchema,
	AddBookOutputSchema,
	GetBookBySlugOutputSchema,
	GetBookListAuthorFacetsInputSchema,
	GetBookListAuthorFacetsOutputSchema,
	GetBookListCountryFacetsInputSchema,
	GetBookListCountryFacetsOutputSchema,
	GetBookListInputSchema,
	GetBookListOutputSchema,
	GetRandomBookInputSchema,
	GetRandomBookOutputSchema,
	UpdateBookInputSchema,
	UpdateBookOutputSchema,
} from "./book.schema";
import {
	addBook,
	getBookBySlug,
	getBookList,
	getBookListAuthorFacets,
	getBookListCountryFacets,
	getRandomBook,
	removeBook,
	updateBook,
} from "./book.service";
import {
	FindSimilarBooksInputSchema,
	FindSimilarBooksOutputSchema,
	SuggestBookDetailsInputSchema,
	SuggestBookDetailsOutputSchema,
} from "./book-assist.schema";
import { findSimilarBooks, suggestBookDetails } from "./book-assist.service";
import {
	GetBookCatalogDiscoveryInputSchema,
	GetBookCatalogDiscoveryOutputSchema,
} from "./book-catalog-discovery.schema";
import { getBookCatalogDiscovery } from "./book-catalog-discovery.service";
import {
	ExportBookListInputSchema,
	ExportBookListOutputSchema,
} from "./book-export.schema";
import { exportBookList } from "./book-export.service";
import {
	SuggestBookOriginCountriesInputSchema,
	SuggestBookOriginCountriesOutputSchema,
} from "./book-origin.schema";
import { suggestBookOriginCountries } from "./book-origin.service";
import { ListCatalogOlidsOutputSchema } from "./book-recommendation.schema";
import { listCatalogOlids } from "./book-recommendation.service";
import {
	BlockOpenLibraryWorkInputSchema,
	ListBlockedOpenLibraryWorksOutputSchema,
	OpenLibraryOlidResultSchema,
	UnblockOpenLibraryWorkInputSchema,
} from "./book-recommendation-block.schema";
import {
	blockOpenLibraryWork,
	listBlockedOpenLibraryWorks,
	unblockOpenLibraryWork,
} from "./book-recommendation-block.service";
import {
	GetBookSittingsInputSchema,
	GetBookSittingsOutputSchema,
	GetMyBookSittingMarksOutputSchema,
} from "./book-sittings.schema";
import {
	getBookSittings,
	getMyBookSittingMarks,
} from "./book-sittings.service";
import {
	GetBookStatsInputSchema,
	GetBookStatsOutputSchema,
} from "./book-stats.schema";
import { getBookStats } from "./book-stats.service";

export const bookRouter = {
	getBookList: publicProcedure
		.input(GetBookListInputSchema)
		.output(GetBookListOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getBookList(input, context.db, context.session?.user?.id),
		),
	getRandom: publicProcedure
		.input(GetRandomBookInputSchema)
		.output(GetRandomBookOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getRandomBook(input, context.db, context.session?.user?.id),
		),
	getBookListAuthorFacets: publicProcedure
		.input(GetBookListAuthorFacetsInputSchema)
		.output(GetBookListAuthorFacetsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getBookListAuthorFacets(
					input,
					context.db,
					context.session?.user?.id,
				),
		),
	getBookListCountryFacets: publicProcedure
		.input(GetBookListCountryFacetsInputSchema)
		.output(GetBookListCountryFacetsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getBookListCountryFacets(
					input,
					context.db,
					context.session?.user?.id,
				),
		),
	exportBookList: publicProcedure
		.input(ExportBookListInputSchema)
		.output(ExportBookListOutputSchema)
		.handler(
			async ({ input, context }) =>
				await exportBookList(input, context.db, context.session?.user?.id),
		),
	getBookBySlug: publicProcedure
		.input(BookSchema.shape.slug)
		.output(GetBookBySlugOutputSchema)
		.handler(
			async ({ input, context }) => await getBookBySlug(input, context.db),
		),
	getSittings: publicProcedure
		.input(GetBookSittingsInputSchema)
		.output(GetBookSittingsOutputSchema)
		.handler(async ({ input, context }) =>
			getBookSittings(input.bookSlug, context.db),
		),
	getMySittingMarks: protectedProcedure
		.input(GetBookSittingsInputSchema)
		.output(GetMyBookSittingMarksOutputSchema)
		.handler(async ({ input, context }) =>
			getMyBookSittingMarks(
				input.bookSlug,
				context.session.user.id,
				context.db,
			),
		),
	getStats: publicProcedure
		.input(GetBookStatsInputSchema)
		.output(GetBookStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getBookStats(input.bookSlug, context.db),
		),
	getCatalogDiscovery: publicProcedure
		.input(GetBookCatalogDiscoveryInputSchema)
		.output(GetBookCatalogDiscoveryOutputSchema)
		.handler(async ({ input, context }) =>
			getBookCatalogDiscovery(input.bookSlug, context.db),
		),
	suggestOriginCountries: adminProcedure
		.input(SuggestBookOriginCountriesInputSchema)
		.output(SuggestBookOriginCountriesOutputSchema)
		.handler(async ({ input }) => suggestBookOriginCountries(input)),
	findSimilar: adminProcedure
		.input(FindSimilarBooksInputSchema)
		.output(FindSimilarBooksOutputSchema)
		.handler(async ({ input, context }) => findSimilarBooks(context.db, input)),
	suggestDetails: adminProcedure
		.input(SuggestBookDetailsInputSchema)
		.output(SuggestBookDetailsOutputSchema)
		.handler(async ({ input }) => suggestBookDetails(input)),
	addBook: adminProcedure
		.input(AddBookInputSchema)
		.output(AddBookOutputSchema)
		.handler(async ({ input, context }) => {
			const book = await addBook(input, context.db, context.session.user.id);
			revalidateBookIsr(context, book.slug);
			revalidateFeedsIsr(context);
			if (book.seriesSlug) {
				revalidateSeriesIsr(context, book.seriesSlug);
			}
			return book;
		}),
	updateBook: adminProcedure
		.input(UpdateBookInputSchema)
		.output(UpdateBookOutputSchema)
		.handler(async ({ input, context }) => {
			const book = await updateBook(input, context.db, context.session.user.id);
			revalidateBookIsr(context, book.slug);
			return book;
		}),
	removeBook: adminProcedure
		.input(BookSchema.shape.slug)
		.output(BookSchema.shape.slug)
		.handler(async ({ input, context }) => {
			const slug = await removeBook(input, context.db);
			revalidateBookIsr(context, slug);
			revalidateFeedsIsr(context);
			return slug;
		}),
	// Public information (the catalog), and members need it to see what is already in the library.
	listCatalogOlids: notBannedProcedure
		.output(ListCatalogOlidsOutputSchema)
		.handler(async ({ context }) => ({
			olids: await listCatalogOlids(context.db),
		})),
	listBlockedOpenLibraryWorks: adminProcedure
		.output(ListBlockedOpenLibraryWorksOutputSchema)
		.handler(async ({ context }) => listBlockedOpenLibraryWorks(context.db)),
	blockOpenLibraryWork: adminProcedure
		.input(BlockOpenLibraryWorkInputSchema)
		.output(OpenLibraryOlidResultSchema)
		.handler(async ({ input, context }) => {
			const result = await blockOpenLibraryWork(
				input,
				context.session.user.id,
				context.db,
			);
			await invalidateDiscoverLanes(context.db);
			return result;
		}),
	unblockOpenLibraryWork: adminProcedure
		.input(UnblockOpenLibraryWorkInputSchema)
		.output(OpenLibraryOlidResultSchema)
		.handler(async ({ input, context }) => {
			const result = await unblockOpenLibraryWork(input.olid, context.db);
			await invalidateDiscoverLanes(context.db);
			return result;
		}),
};
