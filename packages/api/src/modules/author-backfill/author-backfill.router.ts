import { adminProcedure } from "../../procedures";
import { revalidateBooksCatalogIsr } from "../../revalidate-isr";
import {
	BackfillPlanInputSchema,
	BackfillRetryInputSchema,
	BackfillRunInputSchema,
	BackfillStatusInputSchema,
} from "./author-backfill.schema";
import {
	getBackfillStatus,
	planBackfill,
	retryFailedAuthors,
	runBackfill,
} from "./author-backfill.service";

export const authorBackfillRouter = {
	/** A dry run: what a run would do. Writes nothing. */
	plan: adminProcedure
		.input(BackfillPlanInputSchema)
		.handler(({ input, context }) => planBackfill(input, context.db)),

	/** One resumable batch (safe to run again and again until `done`). */
	run: adminProcedure
		.input(BackfillRunInputSchema)
		.handler(async ({ input, context }) => {
			const result = await runBackfill(input, context.db);
			if (result.booksLinked > 0) revalidateBooksCatalogIsr(context);
			return result;
		}),

	status: adminProcedure
		.input(BackfillStatusInputSchema)
		.handler(({ input, context }) => getBackfillStatus(input, context.db)),

	retryFailed: adminProcedure
		.input(BackfillRetryInputSchema)
		.handler(({ input, context }) => retryFailedAuthors(input, context.db)),
};
