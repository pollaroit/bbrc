import type { Database } from "@bbrc/db";
import {
	isClubLocalHour,
	resolveClubTimeZone,
	SITTING_READING_DM_REMINDER_CLUB_HOUR,
} from "@bbrc/shared";
import {
	loadReadingSittingReminderContext,
	sendReadingDmReminderToParticipant,
} from "../../lib/telegram/reading-dm-reminder";
import { activeParticipationWhere } from "./participation-active";

export type SittingReadingDmReminderResult =
	| { skipped: true; reason: "not_club_hour" | "no_reading_sitting" }
	| {
			skipped: false;
			sittingSlug: string;
			targeted: number;
			sent: number;
			skippedNoTelegramLink: number;
			skippedPreferenceOff: number;
			skippedWrongProgress: number;
			failed: number;
	  };

export async function runSittingReadingDmReminders(
	db: Database,
	now = new Date(),
): Promise<SittingReadingDmReminderResult> {
	if (
		!isClubLocalHour(
			now,
			SITTING_READING_DM_REMINDER_CLUB_HOUR,
			resolveClubTimeZone(),
		)
	) {
		return { skipped: true, reason: "not_club_hour" };
	}

	const context = await loadReadingSittingReminderContext(db);
	if (!context) {
		return { skipped: true, reason: "no_reading_sitting" };
	}

	const participants = await db.participation.findMany({
		where: {
			sitting: { slug: context.slug },
			...activeParticipationWhere,
			progress: { in: ["not_started", "in_progress"] },
		},
		select: {
			progress: true,
			user: {
				select: {
					telegramUserId: true,
					telegramSittingReadingReminderEnabled: true,
				},
			},
		},
	});

	let targeted = 0;
	let sent = 0;
	let skippedNoTelegramLink = 0;
	let skippedPreferenceOff = 0;
	let skippedWrongProgress = 0;
	let failed = 0;

	for (const row of participants) {
		if (row.progress !== "not_started" && row.progress !== "in_progress") {
			skippedWrongProgress += 1;
			continue;
		}

		if (!row.user.telegramSittingReadingReminderEnabled) {
			skippedPreferenceOff += 1;
			continue;
		}

		if (!row.user.telegramUserId) {
			skippedNoTelegramLink += 1;
			continue;
		}

		targeted += 1;

		const ok = await sendReadingDmReminderToParticipant({
			sittingId: context.id,
			sittingSlug: context.slug,
			deadline: context.deadline,
			book: context.book,
			participantProgress: row.progress,
			completedCount: context.completedCount,
			activeParticipantCount: context.activeParticipantCount,
			telegramUserId: row.user.telegramUserId,
			now,
		});

		if (ok) {
			sent += 1;
		} else {
			failed += 1;
		}
	}

	return {
		skipped: false,
		sittingSlug: context.slug,
		targeted,
		sent,
		skippedNoTelegramLink,
		skippedPreferenceOff,
		skippedWrongProgress,
		failed,
	};
}
