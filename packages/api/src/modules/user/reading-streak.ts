import type { Database } from "@bbrc/db";
import type { ProgressSchema } from "@bbrc/schemas";
import { computeReadingStreak, formatSittingDisplayName } from "@bbrc/shared";
import type { z } from "zod";
import type { ReadingStreakSchema } from "./user.schema";

type ReadingStreakOutput = z.infer<typeof ReadingStreakSchema>;

export async function loadReadingStreakForUser(
	userId: string,
	db: Database,
): Promise<ReadingStreakOutput> {
	const rows = await db.participation.findMany({
		where: {
			userId,
			removedAt: null,
			sitting: { status: "finished" },
		},
		select: {
			progress: true,
			sitting: {
				select: {
					slug: true,
					status: true,
					deadline: true,
					selectedBook: { select: { title: true } },
				},
			},
		},
		orderBy: { sitting: { deadline: "desc" } },
	});

	const participations = rows.map((row) => ({
		progress: row.progress,
		sittingSlug: row.sitting.slug,
		finishedAtMs: row.sitting.deadline.getTime(),
	}));

	const streak = computeReadingStreak(participations);
	const currentSet = new Set(streak.currentSittingSlugs);
	const bestSet = new Set(streak.bestSittingSlugs);

	const sittings = rows
		.map((row) => ({
			slug: row.sitting.slug,
			displayName: formatSittingDisplayName(
				row.sitting.slug,
				row.sitting.status,
				row.sitting.selectedBook?.title,
			),
			deadline: row.sitting.deadline,
			progress: row.progress as z.infer<typeof ProgressSchema>,
			inCurrentStreak: currentSet.has(row.sitting.slug),
			inBestStreak: bestSet.has(row.sitting.slug),
			finishedAtMs: row.sitting.deadline.getTime(),
		}))
		.toSorted((a, b) => b.finishedAtMs - a.finishedAtMs)
		.map(({ finishedAtMs: _finishedAtMs, ...sitting }) => sitting);

	return {
		current: streak.current,
		best: streak.best,
		asOfSittingSlug: streak.asOfSittingSlug,
		sittings,
	};
}
