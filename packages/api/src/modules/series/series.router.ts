import { publicProcedure, superAdminProcedure } from "../../procedures";
import {
	revalidateBookIsr,
	revalidateBooksCatalogIsr,
	revalidateSeriesIsr,
} from "../../revalidate-isr";
import { audited } from "../audit/audit-middleware";
import { namedTarget, seriesBefore } from "../audit/audit-targets";
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

	create: superAdminProcedure
		.input(CreateSeriesInputSchema)
		.use(
			audited("series.created", {
				target: async ({ output, db }) =>
					namedTarget(
						"series",
						await seriesBefore(db, output.slug),
						output.slug,
					),
			}),
		)
		.output(CreateSeriesOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await createSeries(input, context.db);
			revalidateSeriesIsr(context, result.slug);
			return result;
		}),

	update: superAdminProcedure
		.input(UpdateSeriesInputSchema)
		.use(
			audited("series.updated", {
				before: ({ input, db }) => seriesBefore(db, input.slug),
				target: ({ before, input }) =>
					namedTarget("series", before, input.slug),
			}),
		)
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

	delete: superAdminProcedure
		.input(DeleteSeriesInputSchema)
		.use(
			audited("series.deleted", {
				before: ({ input, db }) => seriesBefore(db, input.slug),
				target: ({ before, input }) =>
					namedTarget("series", before, input.slug),
			}),
		)
		.output(DeleteSeriesOutputSchema)
		.handler(async ({ input, context }) => {
			const bookSlugs = await listBookSlugsInSeries(input.slug, context.db);
			const result = await deleteSeries(input, context.db);
			revalidateSeriesIsr(context, input.slug);
			await revalidateSeriesAndBooks(context, input.slug, bookSlugs);
			return result;
		}),

	addBook: superAdminProcedure
		.input(AddBookToSeriesInputSchema)
		.use(
			audited("series.book_added", {
				before: ({ input, db }) => seriesBefore(db, input.seriesSlug),
				target: ({ before, input }) =>
					namedTarget("series", before, input.seriesSlug),
				metadata: ({ input }) => ({ book: input.bookSlug }),
			}),
		)
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

	removeBook: superAdminProcedure
		.input(RemoveBookFromSeriesInputSchema)
		.use(
			audited("series.book_removed", {
				before: ({ input, db }) => seriesBefore(db, input.seriesSlug),
				target: ({ before, input }) =>
					namedTarget("series", before, input.seriesSlug),
				metadata: ({ input }) => ({ book: input.bookSlug }),
			}),
		)
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

	reorderBooks: superAdminProcedure
		.input(ReorderSeriesBooksInputSchema)
		.use(
			audited("series.reordered", {
				before: ({ input, db }) => seriesBefore(db, input.seriesSlug),
				target: ({ before, input }) =>
					namedTarget("series", before, input.seriesSlug),
			}),
		)
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
