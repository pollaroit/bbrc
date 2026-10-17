import { publicProcedure } from "../../procedures";
import {
	GetAuthorPageInputSchema,
	GetAuthorPageOutputSchema,
} from "./author.schema";
import { getAuthorPage } from "./author.service";

export const authorRouter = {
	getPage: publicProcedure
		.input(GetAuthorPageInputSchema)
		.output(GetAuthorPageOutputSchema)
		.handler(async ({ input, context }) => getAuthorPage(input, context.db)),
};
