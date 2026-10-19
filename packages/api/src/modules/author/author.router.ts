import { publicProcedure } from "../../procedures";
import {
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

export const authorRouter = {
	getPage: publicProcedure
		.input(GetAuthorPageInputSchema)
		.output(GetAuthorPageOutputSchema)
		.handler(async ({ input, context }) => getAuthorPage(input, context.db)),
	getList: publicProcedure
		.input(GetAuthorListInputSchema)
		.output(GetAuthorListOutputSchema)
		.handler(async ({ input, context }) => getAuthorList(input, context.db)),
	getCountryFacets: publicProcedure
		.input(GetAuthorListCountryFacetsInputSchema)
		.output(GetAuthorListCountryFacetsOutputSchema)
		.handler(async ({ input, context }) =>
			getAuthorListCountryFacets(input, context.db),
		),
};
