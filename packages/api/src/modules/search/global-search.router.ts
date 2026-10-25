import { publicProcedure } from "../../procedures";
import {
	GlobalSearchInputSchema,
	GlobalSearchOutputSchema,
} from "./global-search.schema";
import { globalSearch } from "./global-search.service";

export const globalSearchRouter = {
	search: publicProcedure
		.input(GlobalSearchInputSchema)
		.output(GlobalSearchOutputSchema)
		.handler(async ({ input, context }) => {
			const isAdmin = context.session?.user?.isAdmin === true;
			return globalSearch(
				input,
				context.db,
				isAdmin,
				context.session?.user?.id,
			);
		}),
};
