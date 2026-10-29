import type { Database } from "@bbrc/db";
import {
	clubDayKey,
	computeReadingEndWarningAt,
	isClubLocalHour,
	resolveClubTimeZone,
	SITTING_READING_REMINDER_CLUB_HOUR,
} from "@bbrc/shared";
import {
	notifySittingDeadline24h,
	notifySittingMidtermCheckin,
	notifySittingReadingReminder,
} from "../notification/notification-triggers";

export type SittingRemindersResult = {
	midterm: string[];
	deadline24h: string[];
	daily: string[];
};

/**
 * The reminders for sittings being read, run by the sitting cron (club hours 14,
 * 17, 20 and 23, which are also where deadlines and midterm moments fall):
 *
 * - the **midterm check-in**, once, when the midterm moment has passed;
 * - **24 hours left**, once per deadline;
 * - a **daily reading reminder** at 14:00 club time (not on a day that already
 *   had one of the two above, so nobody gets two at once).
 *
 * Each is marked on the sitting when it is sent, by a compare-and-set, so two
 * overlapping runs never send twice.
 */
export async function runSittingReminders(
	db: Database,
	now = new Date(),
): Promise<SittingRemindersResult> {
	const result: SittingRemindersResult = {
		midterm: [],
		deadline24h: [],
		daily: [],
	};
	const timeZone = resolveClubTimeZone();
	const isReminderHour = isClubLocalHour(
		now,
		SITTING_READING_REMINDER_CLUB_HOUR,
		timeZone,
	);

	const sittings = await db.sitting.findMany({
		where: { status: "reading", deadline: { gt: now } },
		select: {
			id: true,
			slug: true,
			deadline: true,
			midtermAt: true,
			midtermNotifiedAt: true,
			deadlineWarningNotifiedAt: true,
			readingReminderSentAt: true,
			selectedBook: { select: { title: true } },
		},
		orderBy: { createdAt: "asc" },
	});

	for (const sitting of sittings) {
		const title = sitting.selectedBook?.title ?? "the sitting book";
		let sentOther = false;

		if (
			sitting.midtermAt &&
			sitting.midtermAt <= now &&
			!sitting.midtermNotifiedAt
		) {
			const claimed = await db.sitting.updateMany({
				where: { id: sitting.id, midtermNotifiedAt: null },
				data: { midtermNotifiedAt: now },
			});
			if (claimed.count === 1) {
				await notifySittingMidtermCheckin(db, sitting.slug, title);
				result.midterm.push(sitting.slug);
				sentOther = true;
			}
		}

		if (
			computeReadingEndWarningAt(sitting.deadline) <= now &&
			!sitting.deadlineWarningNotifiedAt
		) {
			const claimed = await db.sitting.updateMany({
				where: { id: sitting.id, deadlineWarningNotifiedAt: null },
				data: { deadlineWarningNotifiedAt: now },
			});
			if (claimed.count === 1) {
				await notifySittingDeadline24h(db, sitting.slug, title);
				result.deadline24h.push(sitting.slug);
				sentOther = true;
			}
		}

		const sentToday =
			sitting.readingReminderSentAt != null &&
			clubDayKey(sitting.readingReminderSentAt, timeZone) ===
				clubDayKey(now, timeZone);
		if (isReminderHour && !sentToday && !sentOther) {
			const claimed = await db.sitting.updateMany({
				where: {
					id: sitting.id,
					readingReminderSentAt: sitting.readingReminderSentAt,
				},
				data: { readingReminderSentAt: now },
			});
			if (claimed.count === 1) {
				await notifySittingReadingReminder(db, sitting.slug, title);
				result.daily.push(sitting.slug);
			}
		}
	}

	return result;
}
