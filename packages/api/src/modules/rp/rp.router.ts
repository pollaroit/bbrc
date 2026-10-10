import { publicProcedure } from "../../procedures";
import {
	GetRpChartInputSchema,
	GetRpChartOutputSchema,
	GetRpEventListInputSchema,
	GetRpEventListOutputSchema,
} from "./rp.schema";
import { getRpChart, getRpEventList } from "./rp.service";

export const rpRouter = {
	getRpEventList: publicProcedure
		.input(GetRpEventListInputSchema)
		.output(GetRpEventListOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getRpEventList(input, context.db, context.session),
		),
	getRpChart: publicProcedure
		.input(GetRpChartInputSchema)
		.output(GetRpChartOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getRpChart(input, context.db, context.session),
		),
};
