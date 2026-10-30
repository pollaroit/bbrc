import { publicProcedure } from "../../procedures";
import { loadViewer } from "../visibility/viewer";
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
			return globalSearch(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			);
		}),
};
