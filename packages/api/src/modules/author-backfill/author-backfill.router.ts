import { superAdminProcedure } from "../../procedures";
import { revalidateBooksCatalogIsr } from "../../revalidate-isr";
import { audited } from "../audit/audit-middleware";
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
	plan: superAdminProcedure
		.input(BackfillPlanInputSchema)
		.handler(({ input, context }) => planBackfill(input, context.db)),

	/** One resumable batch (safe to run again and again until `done`). */
	run: superAdminProcedure
		.input(BackfillRunInputSchema)
		.use(
			audited("author.backfill_run", {
				target: () => ({ type: "system", label: "Author backfill" }),
				metadata: ({ output }) => ({ processed: output.processedAuthors }),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await runBackfill(input, context.db);
			if (result.booksLinked > 0) revalidateBooksCatalogIsr(context);
			return result;
		}),

	status: superAdminProcedure
		.input(BackfillStatusInputSchema)
		.handler(({ input, context }) => getBackfillStatus(input, context.db)),

	retryFailed: superAdminProcedure
		.input(BackfillRetryInputSchema)
		.use(
			audited("author.backfill_retried", {
				target: () => ({ type: "system", label: "Author backfill" }),
			}),
		)
		.handler(({ input, context }) => retryFailedAuthors(input, context.db)),
};
