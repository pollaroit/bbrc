import { publicProcedure } from "../../procedures";
import { HealthOutputSchema } from "./health.schema";
import { check } from "./health.service";

export const healthRouter = {
	check: publicProcedure
		.output(HealthOutputSchema)
		.handler(async ({ context }) => check(context.db)),
};
