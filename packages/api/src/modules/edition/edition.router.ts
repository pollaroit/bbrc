import { notBannedProcedure, publicProcedure } from "../../procedures";
import {
	EditionCompareInputSchema,
	EditionCompareOutputSchema,
	EditionKeyInputSchema,
	EditionLookupSchema,
	EditionReadersOutputSchema,
	EditionViewerOutputSchema,
} from "./edition.schema";
import {
	compareEditions,
	getEdition,
	getEditionReaders,
	getEditionViewer,
} from "./edition.service";

export const editionRouter = {
	get: publicProcedure
		.input(EditionKeyInputSchema)
		.output(EditionLookupSchema)
		.handler(({ input, context }) =>
			getEdition(context.db, input.bookSlug, input.key),
		),
	readers: publicProcedure
		.input(EditionKeyInputSchema)
		.output(EditionReadersOutputSchema)
		.handler(({ input, context }) =>
			getEditionReaders(
				context.db,
				context.session?.user.id ?? null,
				input.bookSlug,
				input.key,
			),
		),
	viewer: notBannedProcedure
		.input(EditionKeyInputSchema)
		.output(EditionViewerOutputSchema)
		.handler(({ input, context }) =>
			getEditionViewer(
				context.db,
				{
					id: context.session.user.id,
					isAdmin: Boolean(context.session.user.isAdmin),
				},
				input.bookSlug,
				input.key,
			),
		),
	compare: publicProcedure
		.input(EditionCompareInputSchema)
		.output(EditionCompareOutputSchema)
		.handler(({ input, context }) =>
			compareEditions(context.db, input.bookSlug, input.keys),
		),
};
