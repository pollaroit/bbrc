import { adminProcedure, publicProcedure } from "../../procedures";
import {
	revalidateBookIsr,
	revalidateBooksCatalogIsr,
	revalidateSeriesIsr,
} from "../../revalidate-isr";
import {
	AddBookToSeriesInputSchema,
	AddBookToSeriesOutputSchema,
	CreateSeriesInputSchema,
	CreateSeriesOutputSchema,
	DeleteSeriesInputSchema,
	DeleteSeriesOutputSchema,
	GetSeriesBySlugInputSchema,
	GetSeriesBySlugOutputSchema,
	GetSeriesListInputSchema,
	GetSeriesListOutputSchema,
	RemoveBookFromSeriesInputSchema,
	RemoveBookFromSeriesOutputSchema,
	ReorderSeriesBooksInputSchema,
	ReorderSeriesBooksOutputSchema,
	UpdateSeriesInputSchema,
	UpdateSeriesOutputSchema,
} from "./series.schema";
import {
	addBookToSeries,
	createSeries,
	deleteSeries,
	getSeriesBySlug,
	getSeriesList,
	listBookSlugsInSeries,
	removeBookFromSeries,
	reorderSeriesBooks,
	updateSeries,
} from "./series.service";

async function revalidateSeriesAndBooks(
	context: Parameters<typeof revalidateSeriesIsr>[0],
	seriesSlug: string,
	bookSlugs: string[],
) {
	revalidateSeriesIsr(context, seriesSlug);
	revalidateBooksCatalogIsr(context);
	for (const bookSlug of bookSlugs) {
		revalidateBookIsr(context, bookSlug);
	}
}

export const seriesRouter = {
	getList: publicProcedure
		.input(GetSeriesListInputSchema)
		.output(GetSeriesListOutputSchema)
		.handler(async ({ input, context }) => getSeriesList(input, context.db)),

	getBySlug: publicProcedure
		.input(GetSeriesBySlugInputSchema)
		.output(GetSeriesBySlugOutputSchema)
		.handler(async ({ input, context }) =>
			getSeriesBySlug(input.slug, context.db),
		),

	create: adminProcedure
		.input(CreateSeriesInputSchema)
		.output(CreateSeriesOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await createSeries(input, context.db);
			revalidateSeriesIsr(context, result.slug);
			return result;
		}),

	update: adminProcedure
		.input(UpdateSeriesInputSchema)
		.output(UpdateSeriesOutputSchema)
		.handler(async ({ input, context }) => {
			const bookSlugs = await listBookSlugsInSeries(input.slug, context.db);
			const result = await updateSeries(input, context.db);
			revalidateSeriesIsr(context, input.slug);
			if (result.slug !== input.slug) {
				revalidateSeriesIsr(context, result.slug);
			}
			await revalidateSeriesAndBooks(context, result.slug, bookSlugs);
			return result;
		}),

	delete: adminProcedure
		.input(DeleteSeriesInputSchema)
		.output(DeleteSeriesOutputSchema)
		.handler(async ({ input, context }) => {
			const bookSlugs = await listBookSlugsInSeries(input.slug, context.db);
			const result = await deleteSeries(input, context.db);
			revalidateSeriesIsr(context, input.slug);
			await revalidateSeriesAndBooks(context, input.slug, bookSlugs);
			return result;
		}),

	addBook: adminProcedure
		.input(AddBookToSeriesInputSchema)
		.output(AddBookToSeriesOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await addBookToSeries(input, context.db);
			const bookSlugs = await listBookSlugsInSeries(
				input.seriesSlug,
				context.db,
			);
			await revalidateSeriesAndBooks(context, input.seriesSlug, bookSlugs);
			return result;
		}),

	removeBook: adminProcedure
		.input(RemoveBookFromSeriesInputSchema)
		.output(RemoveBookFromSeriesOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await removeBookFromSeries(input, context.db);
			const bookSlugs = await listBookSlugsInSeries(
				input.seriesSlug,
				context.db,
			);
			await revalidateSeriesAndBooks(context, input.seriesSlug, [
				input.bookSlug,
				...bookSlugs,
			]);
			return result;
		}),

	reorderBooks: adminProcedure
		.input(ReorderSeriesBooksInputSchema)
		.output(ReorderSeriesBooksOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await reorderSeriesBooks(input, context.db);
			await revalidateSeriesAndBooks(
				context,
				input.seriesSlug,
				input.bookSlugs,
			);
			return result;
		}),
};
