import { publicProcedure } from "../../procedures";
import { loadViewer } from "../visibility/viewer";
import {
	GetXpChartInputSchema,
	GetXpChartOutputSchema,
	GetXpEventListInputSchema,
	GetXpEventListOutputSchema,
} from "./xp.schema";
import { getXpChart, getXpEventList } from "./xp.service";

export const xpRouter = {
	getXpEventList: publicProcedure
		.input(GetXpEventListInputSchema)
		.output(GetXpEventListOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getXpEventList(
					input,
					context.db,
					await loadViewer(context.db, context.session),
				),
		),
	getXpChart: publicProcedure
		.input(GetXpChartInputSchema)
		.output(GetXpChartOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getXpChart(
					input,
					context.db,
					await loadViewer(context.db, context.session),
				),
		),
};
