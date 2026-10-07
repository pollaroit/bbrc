import type { Database } from "@bbrc/db";
import {
	telegramSendReading24hWarning,
	telegramSendReadingProgressPoll,
} from "../../lib/telegram/sitting-announcements";
import { SittingTelegramCronJobSchema } from "./sitting-telegram-cron.schema";

export type SittingTelegramCronResult = {
	ok: true;
	type: string;
	sittingSlug: string;
	sent: boolean;
};

export async function runSittingTelegramCronJob(
	db: Database,
	rawBody: unknown,
): Promise<SittingTelegramCronResult> {
	const job = SittingTelegramCronJobSchema.parse(rawBody);

	const sitting = await db.sitting.findUnique({
		where: { slug: job.sittingSlug },
		select: { status: true },
	});

	if (sitting?.status !== "reading") {
		return {
			ok: true,
			type: job.type,
			sittingSlug: job.sittingSlug,
			sent: false,
		};
	}

	let sent = false;
	if (job.type === "midterm_progress_poll") {
		sent = await telegramSendReadingProgressPoll(db, job.sittingSlug);
	} else {
		sent = await telegramSendReading24hWarning(db, job.sittingSlug);
	}

	return {
		ok: true,
		type: job.type,
		sittingSlug: job.sittingSlug,
		sent,
	};
}
