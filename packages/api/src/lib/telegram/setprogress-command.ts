import type { Database } from "@bbrc/db";
import type { ProgressSchema } from "@bbrc/schemas";
import { ORPCError } from "@orpc/server";
import type { z } from "zod";
import { activeParticipationWhere } from "../../modules/sitting/participation-active";
import { updateMyParticipationProgress } from "../../modules/sitting/sitting.service";
import { answerTelegramCallbackQuery, sendTelegramReply } from "./client";
import { escapeTelegramHtml } from "./escape-html";
import { resolvePublicAppOrigin } from "./public-app-origin";
import {
	buildLinkAccountReply,
	loadLinkedUserByTelegramId,
} from "./telegram-linked-user";

type Progress = z.infer<typeof ProgressSchema>;

const SETPROGRESS_CALLBACK_PREFIX = "sp:";
const MEMBER_PROGRESS_OPTIONS: {
	progress: Progress;
	label: string;
}[] = [
	{ progress: "not_started", label: "I have not started" },
	{ progress: "in_progress", label: "I am currently reading" },
	{ progress: "completed", label: "I have finished" },
];

const PROGRESS_VALUES: Progress[] = ["not_started", "in_progress", "completed"];

function memberProgressLabel(progress: Progress): string {
	return (
		MEMBER_PROGRESS_OPTIONS.find((option) => option.progress === progress)
			?.label ?? progress.replaceAll("_", " ")
	);
}

function compactUuid(uuid: string): string {
	return uuid.replaceAll("-", "");
}

function expandCompactUuid(compact: string): string | null {
	if (compact.length !== 32) {
		return null;
	}
	return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

export function parseSetprogressCallbackData(data: string): {
	sittingId?: string;
	progress: Progress;
} | null {
	if (!data.startsWith(SETPROGRESS_CALLBACK_PREFIX)) {
		return null;
	}

	const rest = data.slice(SETPROGRESS_CALLBACK_PREFIX.length);

	for (const progress of PROGRESS_VALUES) {
		if (rest === progress) {
			return { progress };
		}
	}

	for (const progress of PROGRESS_VALUES) {
		const suffix = `:${progress}`;
		if (!rest.endsWith(suffix)) {
			continue;
		}
		const compact = rest.slice(0, -suffix.length);
		const sittingId = expandCompactUuid(compact);
		if (sittingId) {
			return { sittingId, progress };
		}
	}

	return null;
}

function buildSetprogressCallbackData(
	progress: Progress,
	sittingId?: string,
): string {
	if (!sittingId) {
		return `${SETPROGRESS_CALLBACK_PREFIX}${progress}`;
	}
	return `${SETPROGRESS_CALLBACK_PREFIX}${compactUuid(sittingId)}:${progress}`;
}

async function loadReadingParticipationForUser(
	db: Database,
	userId: string,
	sittingId?: string,
) {
	if (sittingId) {
		return db.sitting.findFirst({
			where: { id: sittingId, status: "reading" },
			select: {
				id: true,
				slug: true,
				selectedBook: { select: { title: true } },
				participants: {
					where: { userId, ...activeParticipationWhere },
					select: { progress: true },
					take: 1,
				},
			},
		});
	}

	return db.sitting.findFirst({
		where: { status: "reading" },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			slug: true,
			selectedBook: { select: { title: true } },
			participants: {
				where: { userId, ...activeParticipationWhere },
				select: { progress: true },
				take: 1,
			},
		},
	});
}

function buildSetprogressKeyboard(sittingId?: string) {
	return {
		inline_keyboard: MEMBER_PROGRESS_OPTIONS.map((option) => [
			{
				text: option.label,
				callback_data: buildSetprogressCallbackData(option.progress, sittingId),
			},
		]),
	};
}

export function buildSetprogressKeyboardForSitting(sittingId: string) {
	return buildSetprogressKeyboard(sittingId);
}

export async function buildSetprogressPromptReply(
	db: Database,
	telegramUserId: number,
): Promise<{
	text: string;
	replyMarkup?: ReturnType<typeof buildSetprogressKeyboard>;
}> {
	const user = await loadLinkedUserByTelegramId(db, telegramUserId);
	if (!user) {
		return { text: buildLinkAccountReply() };
	}

	const sitting = await loadReadingParticipationForUser(db, user.id);
	if (!sitting) {
		return { text: "No reading session right now." };
	}

	const participation = sitting.participants[0];
	if (!participation) {
		return {
			text: "You are not a participant on the current reading sitting.",
		};
	}

	const bookTitle = sitting.selectedBook?.title?.trim();
	const bookLine = bookTitle
		? `<i>${escapeTelegramHtml(bookTitle)}</i>`
		: "the current book";
	const current = memberProgressLabel(participation.progress);

	return {
		text: [
			"<b>Update your reading progress</b>",
			`Book: ${bookLine}`,
			`Current on BBRC: ${escapeTelegramHtml(current)}`,
			"Choose a status:",
		].join("\n"),
		replyMarkup: buildSetprogressKeyboard(sitting.id),
	};
}

export async function handleSetprogressCallback(
	db: Database,
	input: {
		callbackQueryId: string;
		telegramUserId: number;
		chatId: number;
		messageId?: number;
		data: string;
	},
): Promise<boolean> {
	const parsed = parseSetprogressCallbackData(input.data);
	if (!parsed) {
		await answerTelegramCallbackQuery({
			callbackQueryId: input.callbackQueryId,
			text: "Unknown action.",
			showAlert: true,
		});
		return true;
	}

	const user = await loadLinkedUserByTelegramId(db, input.telegramUserId);
	if (!user) {
		await answerTelegramCallbackQuery({
			callbackQueryId: input.callbackQueryId,
			text: "Link your BBRC account first.",
			showAlert: true,
		});
		return true;
	}

	const sitting = await loadReadingParticipationForUser(
		db,
		user.id,
		parsed.sittingId,
	);
	if (!sitting) {
		await answerTelegramCallbackQuery({
			callbackQueryId: input.callbackQueryId,
			text: "No reading session right now.",
			showAlert: true,
		});
		return true;
	}

	if (!sitting.participants[0]) {
		await answerTelegramCallbackQuery({
			callbackQueryId: input.callbackQueryId,
			text: "You are not on this sitting.",
			showAlert: true,
		});
		return true;
	}

	try {
		await updateMyParticipationProgress(
			{ slug: sitting.slug, progress: parsed.progress },
			user.id,
			db,
		);
	} catch (error) {
		const message =
			error instanceof ORPCError
				? error.message
				: "Could not update progress. Try on BBRC.";
		await answerTelegramCallbackQuery({
			callbackQueryId: input.callbackQueryId,
			text: message,
			showAlert: true,
		});
		return true;
	}

	const label = memberProgressLabel(parsed.progress);
	await answerTelegramCallbackQuery({
		callbackQueryId: input.callbackQueryId,
		text: `Saved: ${label}`,
	});

	if (input.messageId != null) {
		const bookTitle = sitting.selectedBook?.title?.trim();
		const bookLine = bookTitle
			? `<i>${escapeTelegramHtml(bookTitle)}</i>`
			: "the current book";
		await sendTelegramReply({
			chatId: input.chatId,
			text: [
				"<b>Progress updated</b>",
				`Book: ${bookLine}`,
				`Status: ${escapeTelegramHtml(label)}`,
				`<a href="${resolvePublicAppOrigin()}/sittings/${sitting.slug}">Open sitting</a>`,
			].join("\n"),
			replyToMessageId: input.messageId,
		});
	}

	return true;
}

export async function handleSetprogressCommand(
	db: Database,
	input: {
		chatId: number;
		telegramUserId?: number;
		replyToMessageId: number;
	},
): Promise<boolean> {
	if (input.telegramUserId == null) {
		await sendTelegramReply({
			chatId: input.chatId,
			text: "Could not identify your Telegram account.",
			replyToMessageId: input.replyToMessageId,
		});
		return true;
	}

	const prompt = await buildSetprogressPromptReply(db, input.telegramUserId);
	await sendTelegramReply({
		chatId: input.chatId,
		text: prompt.text,
		replyToMessageId: input.replyToMessageId,
		replyMarkup: prompt.replyMarkup,
	});
	return true;
}
