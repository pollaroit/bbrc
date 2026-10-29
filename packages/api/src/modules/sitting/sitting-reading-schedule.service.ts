import type { Database } from "@bbrc/db";
import {
	addCalendarDays,
	calculateSittingReadingDeadline,
	computeMidtermAt,
	getZonedParts,
	resolveClubTimeZone,
	zonedTimeToUtc,
} from "@bbrc/shared";

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

/**
 * Works out and stores when reading started and the midterm moment for a
 * sitting in reading (older sittings entered reading before these were stored).
 * The reminders themselves are sent by the sitting cron (`sitting-reminders`).
 *
 * `deadlineChanged` clears the "24 hours left" mark, so a moved deadline gets its
 * own notice.
 */
export async function syncSittingReadingSchedule(
	db: Database,
	sittingSlug: string,
	options: { deadlineChanged?: boolean } = {},
): Promise<void> {
	const sitting = await db.sitting.findUnique({
		where: { slug: sittingSlug },
		select: {
			id: true,
			status: true,
			deadline: true,
			readingStartedAt: true,
			midtermAt: true,
			selectedBook: { select: { pages: true } },
		},
	});

	if (sitting?.status !== "reading") {
		return;
	}

	const timeZone = resolveClubTimeZone();
	const readingStartedAt =
		sitting.readingStartedAt ??
		inferReadingStartedAt(
			sitting.selectedBook?.pages ?? 0,
			sitting.deadline,
			timeZone,
		);
	if (!readingStartedAt) {
		return;
	}

	await db.sitting.update({
		where: { id: sitting.id },
		data: {
			readingStartedAt,
			midtermAt: computeMidtermAt(readingStartedAt, sitting.deadline, timeZone),
			...(options.deadlineChanged ? { deadlineWarningNotifiedAt: null } : {}),
		},
	});
}
