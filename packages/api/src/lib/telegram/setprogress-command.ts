import type { Database } from "@bbrc/db";
import type { ProgressSchema } from "@bbrc/schemas";
import { ORPCError } from "@orpc/server";
import type { z } from "zod";
import { activeParticipationWhere } from "../../modules/sitting/participation-active";
import { updateMyParticipationProgress } from "../../modules/sitting/sitting.service";
import { answerTelegramCallbackQuery, sendTelegramReply } from "./client";
import { escapeTelegramHtml } from "./escape-html";
import { resolvePublicAppOrigin } from "./public-app-origin";

type Progress = z.infer<typeof ProgressSchema>;

const SETPROGRESS_CALLBACK_PREFIX = "sp:";
const MEMBER_PROGRESS_OPTIONS: {
	progress: Progress;
	label: string;
}[] = [
	{ progress: "not_started", label: "Not started yet" },
	{ progress: "in_progress", label: "Currently reading" },
	{ progress: "completed", label: "Completed the book" },
];

function memberProgressLabel(progress: Progress): string {
	return (
		MEMBER_PROGRESS_OPTIONS.find((option) => option.progress === progress)
			?.label ?? progress.replaceAll("_", " ")
	);
}

function parseSetprogressCallbackData(data: string): Progress | null {
	if (!data.startsWith(SETPROGRESS_CALLBACK_PREFIX)) {
		return null;
	}
	const progress = data.slice(SETPROGRESS_CALLBACK_PREFIX.length);
	if (
		progress === "not_started" ||
		progress === "in_progress" ||
		progress === "completed"
	) {
		return progress;
	}
	return null;
}

function buildSetprogressCallbackData(progress: Progress): string {
	return `${SETPROGRESS_CALLBACK_PREFIX}${progress}`;
}

async function loadLinkedUserByTelegramId(
	db: Database,
	telegramUserId: number,
) {
	return db.user.findUnique({
		where: { telegramUserId: String(telegramUserId) },
		select: { id: true, username: true, name: true },
	});
}

async function loadReadingParticipation(db: Database, userId: string) {
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

function buildLinkAccountReply(): string {
	const origin = resolvePublicAppOrigin();
	return [
		"Link your BBRC account first.",
		"On the site: Settings → Account connections, then open the bot in a private chat to finish linking.",
		`<a href="${origin}/settings/accounts">Account connections</a>`,
	].join("\n");
}

function buildSetprogressKeyboard() {
	return {
		inline_keyboard: MEMBER_PROGRESS_OPTIONS.map((option) => [
			{
				text: option.label,
				callback_data: buildSetprogressCallbackData(option.progress),
			},
		]),
	};
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

	const sitting = await loadReadingParticipation(db, user.id);
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
		replyMarkup: buildSetprogressKeyboard(),
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
	const progress = parseSetprogressCallbackData(input.data);
	if (!progress) {
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

	const sitting = await loadReadingParticipation(db, user.id);
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
			{ slug: sitting.slug, progress },
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

	const label = memberProgressLabel(progress);
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
