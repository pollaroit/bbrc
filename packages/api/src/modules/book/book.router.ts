import { BookSchema } from "@bbrc/schemas";
import { adminProcedure, publicProcedure } from "../../procedures";
import { revalidateBookIsr, revalidateFeedsIsr } from "../../revalidate-isr";
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
	UpdateBookInputSchema,
	UpdateBookOutputSchema,
} from "./book.schema";
import {
	addBook,
	getBookBySlug,
	getBookList,
	getBookListAuthorFacets,
	getBookListCountryFacets,
	removeBook,
	updateBook,
} from "./book.service";
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
import {
	ListCatalogOlidsOutputSchema,
	RecommendOpenLibraryBooksOutputSchema,
	RecommendOpenLibraryReplaceInputSchema,
	RecommendOpenLibraryReplaceOutputSchema,
} from "./book-recommendation.schema";
import {
	invalidateRecommendationCache,
	listCatalogOlids,
	recommendOpenLibraryBooks,
	replaceBookRecommendation,
} from "./book-recommendation.service";
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

export const bookRouter = {
	getBookList: publicProcedure
		.input(GetBookListInputSchema)
		.output(GetBookListOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getBookList(input, context.db, context.session?.user?.id),
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
	suggestOriginCountries: adminProcedure
		.input(SuggestBookOriginCountriesInputSchema)
		.output(SuggestBookOriginCountriesOutputSchema)
		.handler(async ({ input }) => suggestBookOriginCountries(input)),
	addBook: adminProcedure
		.input(AddBookInputSchema)
		.output(AddBookOutputSchema)
		.handler(async ({ input, context }) => {
			const book = await addBook(input, context.db, context.session.user.id);
			revalidateBookIsr(context, book.slug);
			revalidateFeedsIsr(context);
			return book;
		}),
	updateBook: adminProcedure
		.input(UpdateBookInputSchema)
		.output(UpdateBookOutputSchema)
		.handler(async ({ input, context }) => {
			const book = await updateBook(input, context.db);
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
	recommendOpenLibrary: adminProcedure
		.output(RecommendOpenLibraryBooksOutputSchema)
		.handler(async ({ context }) => recommendOpenLibraryBooks(context.db)),
	recommendOpenLibraryReplace: adminProcedure
		.input(RecommendOpenLibraryReplaceInputSchema)
		.output(RecommendOpenLibraryReplaceOutputSchema)
		.handler(async ({ input, context }) => ({
			item: await replaceBookRecommendation(context.db, input),
		})),
	listCatalogOlids: adminProcedure
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
			invalidateRecommendationCache();
			return result;
		}),
	unblockOpenLibraryWork: adminProcedure
		.input(UnblockOpenLibraryWorkInputSchema)
		.output(OpenLibraryOlidResultSchema)
		.handler(async ({ input, context }) => {
			const result = await unblockOpenLibraryWork(input.olid, context.db);
			invalidateRecommendationCache();
			return result;
		}),
};
