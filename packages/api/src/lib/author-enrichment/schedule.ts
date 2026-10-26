import type { Database } from "@bbrc/db";
import { enrichAuthor, MAX_ENRICHMENT_ATTEMPTS } from "./enrich";

/**
 * Enriches new authors in the background: the request that created them is not held up.
 * Failures are saved on the author (never thrown); `sweepAuthorEnrichment` retries whatever
 * a lost process left behind, so nothing depends on this promise finishing.
 */
export function scheduleAuthorEnrichment(
	db: Database,
	authorIds: readonly string[],
): void {
	if (authorIds.length === 0) return;
	const ids = [...new Set(authorIds)];
	void (async () => {
		for (const id of ids) {
			try {
				await enrichAuthor(db, id);
			} catch (error) {
				console.error("author enrichment failed", id, error);
			}
		}
	})();
}

const SWEEP_BATCH = 10;

/**
 * Daily (cron): enriches authors that were never enriched or failed (up to 3 tries), and
 * ones a crashed run left "running". Returns how many it attempted.
 */
export async function sweepAuthorEnrichment(
	db: Database,
	limit = SWEEP_BATCH,
): Promise<number> {
	const rows = await db.author.findMany({
		where: {
			enrichmentAttempts: { lt: MAX_ENRICHMENT_ATTEMPTS },
			OR: [
				{ enrichmentStatus: { in: ["pending", "failed"] } },
				{
					enrichmentStatus: "running",
					updatedAt: { lt: new Date(Date.now() - 10 * 60_000) },
				},
			],
		},
		orderBy: { createdAt: "asc" },
		take: limit,
		select: { id: true },
	});
	let attempted = 0;
	for (const row of rows) {
		const result = await enrichAuthor(db, row.id);
		if (!result.skipped) attempted += 1;
	}
	return attempted;
}
