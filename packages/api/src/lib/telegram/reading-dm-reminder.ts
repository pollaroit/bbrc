import type { Database } from "@bbrc/db";
import type { ProgressSchema } from "@bbrc/schemas";
import { formatSittingDisplayName } from "@bbrc/shared";
import type { z } from "zod";
import { activeParticipationWhere } from "../../modules/sitting/participation-active";
import { sendTelegramReply } from "./client";
import { escapeTelegramHtml } from "./escape-html";
import {
	formatPagesPerDayLine,
	formatReadingDeadlineTelegramLine,
	isWithinHoursOfDeadline,
} from "./format-reading-deadline-line";
import { resolvePublicAppOrigin } from "./public-app-origin";
import { buildSetprogressKeyboardForSitting } from "./setprogress-command";

type Progress = z.infer<typeof ProgressSchema>;

function formatAuthors(authors: string[]): string {
	if (authors.length === 0) {
		return "Unknown author";
	}
	if (authors.length === 1) {
		return authors[0] ?? "Unknown author";
	}
	if (authors.length === 2) {
		return `${authors[0]} & ${authors[1]}`;
	}
	return `${authors[0]} et al.`;
}

export function buildReadingDmReminderMessageForParticipant(input: {
	sittingSlug: string;
	deadline: Date;
	book: { title: string; authors: string[]; pages: number | null };
	participantProgress: Progress;
	completedCount: number;
	activeParticipantCount: number;
	now?: Date;
}): string {
	const now = input.now ?? new Date();
	const sittingTitle = escapeTelegramHtml(
		formatSittingDisplayName(input.sittingSlug, "reading", input.book.title),
	);
	const bookLine =
		"<i>" +
		escapeTelegramHtml(input.book.title) +
		"</i> by " +
		escapeTelegramHtml(formatAuthors(input.book.authors));
	const deadlineLine = escapeTelegramHtml(
		formatReadingDeadlineTelegramLine(input.deadline, now),
	);

	const lines: string[] = [];

	if (isWithinHoursOfDeadline(input.deadline, 48, now)) {
		lines.push("<b>Deadline soon</b>");
	}

	lines.push(`<b>${sittingTitle}</b>`, bookLine, `Deadline: ${deadlineLine}`);

	if (input.book.pages != null && input.book.pages > 0) {
		if (input.participantProgress === "not_started") {
			const pace = formatPagesPerDayLine(
				input.book.pages,
				input.deadline,
				"start_today",
				now,
			);
			if (pace) {
				lines.push(pace);
			}
		} else if (input.participantProgress === "in_progress") {
			const pace = formatPagesPerDayLine(
				input.book.pages,
				input.deadline,
				"stay_on_pace",
				now,
			);
			if (pace) {
				lines.push(pace);
			}
		}
	}

	lines.push(
		`${input.completedCount} out of ${input.activeParticipantCount} participants have finished reading.`,
		"",
		"Update your status with the buttons below, or open the sitting on BBRC.",
		'<a href="' +
			resolvePublicAppOrigin() +
			"/sittings/" +
			input.sittingSlug +
			'">Go to sitting</a>',
	);

	return lines.join("\n");
}

export async function sendReadingDmReminderToParticipant(input: {
	sittingId: string;
	sittingSlug: string;
	deadline: Date;
	book: { title: string; authors: string[]; pages: number | null };
	participantProgress: Progress;
	completedCount: number;
	activeParticipantCount: number;
	telegramUserId: string;
	now?: Date;
}): Promise<boolean> {
	const text = buildReadingDmReminderMessageForParticipant(input);
	const chatId = Number.parseInt(input.telegramUserId, 10);
	if (!Number.isFinite(chatId)) {
		return false;
	}

	return sendTelegramReply({
		chatId,
		text,
		replyMarkup: buildSetprogressKeyboardForSitting(input.sittingId),
	});
}

export async function loadReadingSittingReminderContext(db: Database) {
	const sitting = await db.sitting.findFirst({
		where: { status: "reading" },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			slug: true,
			deadline: true,
			selectedBook: {
				select: { title: true, authors: true, pages: true },
			},
			participants: {
				where: activeParticipationWhere,
				select: { progress: true },
			},
		},
	});

	if (!sitting?.selectedBook) {
		return null;
	}

	let completedCount = 0;
	for (const row of sitting.participants) {
		if (row.progress === "completed") {
			completedCount += 1;
		}
	}

	return {
		id: sitting.id,
		slug: sitting.slug,
		deadline: sitting.deadline,
		book: sitting.selectedBook,
		activeParticipantCount: sitting.participants.length,
		completedCount,
	};
}
