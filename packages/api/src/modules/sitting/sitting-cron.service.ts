import type { Database } from "@bbrc/db";
import { transitionSitting } from "./sitting.service";
import { pickPollWinningOptionId } from "./sitting-poll-winner";
import {
	runSittingReadingDmReminders,
	type SittingReadingDmReminderResult,
} from "./sitting-reading-dm-reminder.service";

export type SittingDeadlineCronResult = {
	pollsClosed: string[];
	sittingsFinished: string[];
	errors: { slug: string; step: "poll" | "finish"; message: string }[];
	readingDmReminders: SittingReadingDmReminderResult;
};

export async function runSittingDeadlineCron(
	db: Database,
	now = new Date(),
): Promise<SittingDeadlineCronResult> {
	const result: SittingDeadlineCronResult = {
		pollsClosed: [],
		sittingsFinished: [],
		errors: [],
		readingDmReminders: { skipped: true, reason: "not_club_hour" },
	};

	const duePolls = await db.sitting.findMany({
		where: {
			status: "voting",
			poll: { deadline: { lte: now } },
		},
		select: {
			slug: true,
			poll: { select: { id: true } },
		},
		orderBy: { createdAt: "asc" },
	});

	for (const sitting of duePolls) {
		if (!sitting.poll) {
			continue;
		}

		try {
			const selectedPollOptionId = await pickPollWinningOptionId(
				sitting.poll.id,
				db,
			);

			await transitionSitting(
				{
					slug: sitting.slug,
					transition: "start_reading",
					selectedPollOptionId,
				},
				db,
			);

			result.pollsClosed.push(sitting.slug);
		} catch (error) {
			result.errors.push({
				slug: sitting.slug,
				step: "poll",
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	const dueReading = await db.sitting.findMany({
		where: {
			status: "reading",
			deadline: { lte: now },
		},
		select: { slug: true },
		orderBy: { createdAt: "asc" },
	});

	for (const sitting of dueReading) {
		try {
			await transitionSitting({ slug: sitting.slug, transition: "finish" }, db);
			result.sittingsFinished.push(sitting.slug);
		} catch (error) {
			result.errors.push({
				slug: sitting.slug,
				step: "finish",
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	result.readingDmReminders = await runSittingReadingDmReminders(db, now);

	return result;
}
