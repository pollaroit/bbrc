import zod from "zod";

const dailyCap = zod.number().int().min(1).max(2000).optional();

export const BackfillPlanInputSchema = zod.object({
	dailyCap,
	/** Authors per run (only used to say how many runs it takes). */
	limit: zod.number().int().min(1).max(100).optional(),
	/** Read a few authors from Open Library / Wikidata to project how many need the AI. */
	probe: zod.boolean().optional(),
	sampleSize: zod.number().int().min(1).max(25).optional(),
});

export const BackfillRunInputSchema = zod.object({
	/** Authors to process in this run (default 25). */
	limit: zod.number().int().min(1).max(100).optional(),
	/** The most authors the backfill processes per day (default 100). */
	dailyCap,
});

export const BackfillStatusInputSchema = zod.object({ dailyCap });

export const BackfillRetryInputSchema = zod.object({
	limit: zod.number().int().min(1).max(100).optional(),
});
