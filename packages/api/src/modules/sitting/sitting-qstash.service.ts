import type { Database } from "@bbrc/db";
import {
	addCalendarDays,
	calculateSittingReadingDeadline,
	computeMidtermAt,
	computeReadingEndWarningAt,
	getZonedParts,
	resolveClubTimeZone,
	zonedTimeToUtc,
} from "@bbrc/shared";
import {
	deleteQStashMessage,
	publishQStashJson,
} from "../../lib/qstash/client";
import { resolvePublicAppOrigin } from "../../lib/telegram/public-app-origin";
import type { SittingTelegramCronJob } from "./sitting-telegram-cron.schema";

function telegramCronDestination(): string {
	return `${resolvePublicAppOrigin()}/api/cron/telegram`;
}

const READING_START_MATCH_TOLERANCE_MS = 60_000;

/** Best-effort start instant for sittings that entered reading before we stored `readingStartedAt`. */
function inferReadingStartedAt(
	pageCount: number,
	readingDeadline: Date,
	timeZone: string,
): Date | null {
	if (pageCount <= 0) {
		return null;
	}

	const deadlineMs = readingDeadline.getTime();
	const endParts = getZonedParts(readingDeadline, timeZone);

	for (let dayOffset = 0; dayOffset <= 400; dayOffset += 1) {
		const ymd = addCalendarDays(
			endParts.year,
			endParts.month,
			endParts.day,
			-dayOffset,
		);
		const dayStart = zonedTimeToUtc(
			ymd.year,
			ymd.month,
			ymd.day,
			0,
			0,
			timeZone,
		);

		try {
			const computedEnd = calculateSittingReadingDeadline(pageCount, dayStart);
			if (
				Math.abs(computedEnd.getTime() - deadlineMs) <=
				READING_START_MATCH_TOLERANCE_MS
			) {
				return dayStart;
			}
		} catch {
			// try an earlier calendar day
		}
	}

	return null;
}

async function cancelStoredQStashJobs(
	db: Database,
	sittingId: string,
	messageIds: { midterm: string | null; warning: string | null },
): Promise<void> {
	if (messageIds.midterm) {
		await deleteQStashMessage(messageIds.midterm);
	}
	if (messageIds.warning) {
		await deleteQStashMessage(messageIds.warning);
	}

	await db.sitting.update({
		where: { id: sittingId },
		data: {
			qstashMidtermMessageId: null,
			qstashReadingWarningMessageId: null,
		},
	});
}

/** Schedule (or reschedule) midterm poll + 24h reading warning via QStash. */
export async function syncSittingReadingTelegramJobs(
	db: Database,
	sittingSlug: string,
): Promise<void> {
	const sitting = await db.sitting.findUnique({
		where: { slug: sittingSlug },
		select: {
			id: true,
			slug: true,
			status: true,
			deadline: true,
			readingStartedAt: true,
			midtermAt: true,
			qstashMidtermMessageId: true,
			qstashReadingWarningMessageId: true,
			selectedBook: { select: { pages: true } },
		},
	});

	if (sitting?.status !== "reading") {
		return;
	}

	const timeZone = resolveClubTimeZone();
	let readingStartedAt = sitting.readingStartedAt;

	if (!readingStartedAt) {
		const pages = sitting.selectedBook?.pages ?? 0;
		readingStartedAt = inferReadingStartedAt(pages, sitting.deadline, timeZone);

		if (!readingStartedAt) {
			return;
		}

		const midtermAt = computeMidtermAt(
			readingStartedAt,
			sitting.deadline,
			timeZone,
		);

		await db.sitting.update({
			where: { id: sitting.id },
			data: { readingStartedAt, midtermAt },
		});
	}

	const midtermAt =
		sitting.midtermAt ??
		computeMidtermAt(readingStartedAt, sitting.deadline, timeZone);
	const warningAt = computeReadingEndWarningAt(sitting.deadline);
	const now = Date.now();

	await cancelStoredQStashJobs(db, sitting.id, {
		midterm: sitting.qstashMidtermMessageId,
		warning: sitting.qstashReadingWarningMessageId,
	});

	const destination = telegramCronDestination();
	let midtermMessageId: string | null = null;
	let warningMessageId: string | null = null;

	if (midtermAt.getTime() > now) {
		const body: SittingTelegramCronJob = {
			type: "midterm_progress_poll",
			sittingSlug: sitting.slug,
		};
		midtermMessageId = await publishQStashJson({
			destinationUrl: destination,
			body,
			notBefore: midtermAt,
			deduplicationId: `sitting:${sitting.id}:midterm`,
		});
	}

	if (warningAt.getTime() > now) {
		const body: SittingTelegramCronJob = {
			type: "reading_24h_warning",
			sittingSlug: sitting.slug,
		};
		warningMessageId = await publishQStashJson({
			destinationUrl: destination,
			body,
			notBefore: warningAt,
			deduplicationId: `sitting:${sitting.id}:reading-24h`,
		});
	}

	await db.sitting.update({
		where: { id: sitting.id },
		data: {
			midtermAt,
			qstashMidtermMessageId: midtermMessageId,
			qstashReadingWarningMessageId: warningMessageId,
		},
	});
}

/** Cancel pending QStash Telegram jobs (e.g. when sitting finishes early). */
export async function cancelSittingReadingTelegramJobs(
	db: Database,
	sittingSlug: string,
): Promise<void> {
	const sitting = await db.sitting.findUnique({
		where: { slug: sittingSlug },
		select: {
			id: true,
			qstashMidtermMessageId: true,
			qstashReadingWarningMessageId: true,
		},
	});

	if (!sitting) {
		return;
	}

	await cancelStoredQStashJobs(db, sitting.id, {
		midterm: sitting.qstashMidtermMessageId,
		warning: sitting.qstashReadingWarningMessageId,
	});
}
