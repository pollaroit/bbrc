import { publicProcedure } from "../../procedures";
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
			async ({ input, context }) => await getXpEventList(input, context.db),
		),
	getXpChart: publicProcedure
		.input(GetXpChartInputSchema)
		.output(GetXpChartOutputSchema)
		.handler(async ({ input, context }) => await getXpChart(input, context.db)),
};
