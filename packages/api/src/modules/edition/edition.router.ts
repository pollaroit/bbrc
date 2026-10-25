import { ORPCError } from "@orpc/server";
import { notBannedProcedure, publicProcedure } from "../../procedures";
import {
	EditionCompareInputSchema,
	EditionCompareOutputSchema,
	EditionKeyInputSchema,
	EditionLookupSchema,
	EditionReadersOutputSchema,
	EditionViewerOutputSchema,
} from "./edition.schema";

const notBuilt = () => {
	throw new ORPCError("NOT_IMPLEMENTED", {
		message: "The edition page is not built yet.",
	});
};

export const editionRouter = {
	get: publicProcedure
		.input(EditionKeyInputSchema)
		.output(EditionLookupSchema)
		.handler(notBuilt),
	readers: publicProcedure
		.input(EditionKeyInputSchema)
		.output(EditionReadersOutputSchema)
		.handler(notBuilt),
	viewer: notBannedProcedure
		.input(EditionKeyInputSchema)
		.output(EditionViewerOutputSchema)
		.handler(notBuilt),
	compare: publicProcedure
		.input(EditionCompareInputSchema)
		.output(EditionCompareOutputSchema)
		.handler(notBuilt),
};
