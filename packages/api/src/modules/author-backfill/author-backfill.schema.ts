import zod from "zod";

/** 0 or missing means no daily cap. */
const dailyCap = zod.number().int().min(0).max(5000).optional();

export const BackfillPlanInputSchema = zod.object({
	dailyCap,
	/** Kept for older callers; the estimate no longer depends on it. */
	limit: zod.number().int().min(1).max(500).optional(),
	/** Read a few authors from Open Library / Wikidata to project how many need the AI. */
	probe: zod.boolean().optional(),
	sampleSize: zod.number().int().min(1).max(25).optional(),
});

export const BackfillRunInputSchema = zod.object({
	/** Most authors to process in this run (default 500); a run also stops at its time budget. */
	limit: zod.number().int().min(1).max(500).optional(),
	/** Optional cap on authors processed per day; 0 or missing = no cap (the default). */
	dailyCap,
});

export const BackfillStatusInputSchema = zod.object({ dailyCap });

export const BackfillRetryInputSchema = zod.object({
	limit: zod.number().int().min(1).max(100).optional(),
});
