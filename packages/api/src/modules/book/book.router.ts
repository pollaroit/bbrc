import { BookSchema } from "@bbrc/schemas";
import {
	minRoleProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	revalidateBookIsr,
	revalidateFeedsIsr,
	revalidateSeriesIsr,
} from "../../revalidate-isr";
import { audited } from "../audit/audit-middleware";
import { bookBeforeBySlug, namedTarget } from "../audit/audit-targets";
import { authorSlugsOfBook, revalidateAuthorSlugs } from "../author/author-isr";
import { invalidateDiscoverLanes } from "../book-discover/book-discover.service";
import { loadViewer } from "../visibility/viewer";
import {
	AddBookInputSchema,
	AddBookOutputSchema,
	AddManualBookInputSchema,
	GetBookBySlugOutputSchema,
	GetBookListAuthorFacetsInputSchema,
	GetBookListAuthorFacetsOutputSchema,
	GetBookListCountryFacetsInputSchema,
	GetBookListCountryFacetsOutputSchema,
	GetBookListInputSchema,
	GetBookListOutputSchema,
	GetRandomBookInputSchema,
	GetRandomBookOutputSchema,
	SetBookHiddenInputSchema,
	SetBookHiddenOutputSchema,
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
import { setBookHidden } from "./book-hidden.service";
import { addManualBook } from "./book-manual.service";
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
			getBookStats(
				input.bookSlug,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	getCatalogDiscovery: publicProcedure
		.input(GetBookCatalogDiscoveryInputSchema)
		.output(GetBookCatalogDiscoveryOutputSchema)
		.handler(async ({ input, context }) =>
			getBookCatalogDiscovery(input.bookSlug, context.db),
		),
	suggestOriginCountries: minRoleProcedure("admin")
		.input(SuggestBookOriginCountriesInputSchema)
		.output(SuggestBookOriginCountriesOutputSchema)
		.handler(async ({ input }) => suggestBookOriginCountries(input)),
	findSimilar: minRoleProcedure("admin")
		.input(FindSimilarBooksInputSchema)
		.output(FindSimilarBooksOutputSchema)
		.handler(async ({ input, context }) => findSimilarBooks(context.db, input)),
	suggestDetails: minRoleProcedure("admin")
		.input(SuggestBookDetailsInputSchema)
		.output(SuggestBookDetailsOutputSchema)
		.handler(async ({ input }) => suggestBookDetails(input)),
	addBook: minRoleProcedure("admin")
		.input(AddBookInputSchema)
		.use(
			audited("book.created", {
				target: async ({ output, db }) =>
					namedTarget(
						"book",
						await bookBeforeBySlug(db, output.slug),
						output.slug,
					),
			}),
		)
		.output(AddBookOutputSchema)
		.handler(async ({ input, context }) => {
			const book = await addBook(input, context.db, context.session.user.id);
			revalidateBookIsr(context, book.slug);
			revalidateFeedsIsr(context);
			revalidateAuthorSlugs(
				context,
				await authorSlugsOfBook(context.db, book.slug),
			);
			if (book.seriesSlug) {
				revalidateSeriesIsr(context, book.seriesSlug);
			}
			return book;
		}),
	addManualBook: minRoleProcedure("admin")
		.input(AddManualBookInputSchema)
		.use(
			audited("book.created_manual", {
				target: async ({ output, db }) =>
					namedTarget(
						"book",
						await bookBeforeBySlug(db, output.slug),
						output.slug,
					),
			}),
		)
		.output(AddBookOutputSchema)
		.handler(async ({ input, context }) => {
			const book = await addManualBook(
				input,
				context.db,
				context.session.user.id,
			);
			revalidateBookIsr(context, book.slug);
			revalidateFeedsIsr(context);
			revalidateAuthorSlugs(
				context,
				await authorSlugsOfBook(context.db, book.slug),
			);
			if (book.seriesSlug) {
				revalidateSeriesIsr(context, book.seriesSlug);
			}
			return book;
		}),
	updateBook: minRoleProcedure("admin")
		.input(UpdateBookInputSchema)
		.use(
			audited("book.updated", {
				target: async ({ output, db }) =>
					namedTarget(
						"book",
						await bookBeforeBySlug(db, output.slug),
						output.slug,
					),
			}),
		)
		.output(UpdateBookOutputSchema)
		.handler(async ({ input, context }) => {
			const authorsChanged =
				input.authorIds !== undefined || input.authors !== undefined;
			const before = authorsChanged
				? await authorSlugsOfBook(context.db, input.slug)
				: [];
			const book = await updateBook(input, context.db, context.session.user.id);
			revalidateBookIsr(context, book.slug);
			if (authorsChanged) {
				revalidateAuthorSlugs(context, [
					...before,
					...(await authorSlugsOfBook(context.db, book.slug)),
				]);
			}
			return book;
		}),
	removeBook: minRoleProcedure("admin")
		.input(BookSchema.shape.slug)
		.use(
			audited("book.removed", {
				before: ({ input, db }) => bookBeforeBySlug(db, input),
				target: ({ before, input }) => namedTarget("book", before, input),
			}),
		)
		.output(BookSchema.shape.slug)
		.handler(async ({ input, context }) => {
			const slug = await removeBook(input, context.db);
			revalidateBookIsr(context, slug);
			revalidateFeedsIsr(context);
			return slug;
		}),
	hideBook: minRoleProcedure("admin")
		.input(SetBookHiddenInputSchema)
		.use(
			audited("book.hidden", {
				before: ({ input, db }) => bookBeforeBySlug(db, input.slug),
				target: ({ before, input }) => namedTarget("book", before, input.slug),
			}),
		)
		.output(SetBookHiddenOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await setBookHidden(
				{ slug: input.slug, hidden: true },
				context.db,
			);
			revalidateBookIsr(context, result.slug);
			return result;
		}),
	unhideBook: minRoleProcedure("admin")
		.input(SetBookHiddenInputSchema)
		.use(
			audited("book.unhidden", {
				before: ({ input, db }) => bookBeforeBySlug(db, input.slug),
				target: ({ before, input }) => namedTarget("book", before, input.slug),
			}),
		)
		.output(SetBookHiddenOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await setBookHidden(
				{ slug: input.slug, hidden: false },
				context.db,
			);
			revalidateBookIsr(context, result.slug);
			return result;
		}),
	// Public information (the catalog), and members need it to see what is already in the library.
	listCatalogOlids: protectedProcedure
		.output(ListCatalogOlidsOutputSchema)
		.handler(async ({ context }) => ({
			olids: await listCatalogOlids(context.db),
		})),
	listBlockedOpenLibraryWorks: minRoleProcedure("admin")
		.output(ListBlockedOpenLibraryWorksOutputSchema)
		.handler(async ({ context }) => listBlockedOpenLibraryWorks(context.db)),
	blockOpenLibraryWork: minRoleProcedure("admin")
		.input(BlockOpenLibraryWorkInputSchema)
		.use(
			audited("book.work_blocked", {
				target: ({ input }) => ({
					type: "open_library_work",
					id: input.olid,
					label: input.title ?? input.olid,
				}),
			}),
		)
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
	unblockOpenLibraryWork: minRoleProcedure("admin")
		.input(UnblockOpenLibraryWorkInputSchema)
		.use(
			audited("book.work_unblocked", {
				target: ({ input }) => ({
					type: "open_library_work",
					id: input.olid,
					label: input.olid,
				}),
			}),
		)
		.output(OpenLibraryOlidResultSchema)
		.handler(async ({ input, context }) => {
			const result = await unblockOpenLibraryWork(input.olid, context.db);
			await invalidateDiscoverLanes(context.db);
			return result;
		}),
};
