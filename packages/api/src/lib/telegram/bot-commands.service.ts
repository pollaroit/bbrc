import type { Database } from "@bbrc/db";
import { getBookListFields } from "../../modules/book/book.schema";
import type { TelegramUpdate } from "./bot-commands.schema";
import { sendTelegramReply } from "./client";
import { escapeTelegramHtml } from "./escape-html";
import { formatReadingDeadlineTelegramLine } from "./format-reading-deadline-line";
import { resolvePublicAppOrigin } from "./public-app-origin";

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

function parseBotCommand(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed.startsWith("/")) {
		return null;
	}
	const firstToken = trimmed.split(/\s+/)[0] ?? "";
	const command = firstToken.split("@")[0]?.toLowerCase();
	return command && command.length > 1 ? command : null;
}

async function loadCurrentReadingSitting(db: Database) {
	return db.sitting.findFirst({
		where: { status: "reading" },
		orderBy: { createdAt: "desc" },
		select: {
			slug: true,
			deadline: true,
			selectedBook: {
				select: getBookListFields,
			},
		},
	});
}

async function buildDeadlineReplyFromDb(db: Database): Promise<string> {
	const sitting = await loadCurrentReadingSitting(db);
	if (!sitting) {
		return "No reading session currently.";
	}
	return formatReadingDeadlineTelegramLine(sitting.deadline);
}

async function buildBookReply(db: Database): Promise<string> {
	const sitting = await loadCurrentReadingSitting(db);
	if (!sitting?.selectedBook) {
		return "No reading session currently.";
	}

	const book = sitting.selectedBook;
	const title = escapeTelegramHtml(book.title);
	const authors = escapeTelegramHtml(formatAuthors(book.authors));
	const pages = book.pages;
	const url = `${resolvePublicAppOrigin()}/books/${book.slug}`;

	return [
		`<b>${title}</b>`,
		authors,
		`${pages} pages`,
		`<a href="${url}">Open on BBRC</a>`,
	].join("\n");
}

export type TelegramBotCommandResult = {
	handled: boolean;
	command?: string;
};

export async function handleTelegramBotUpdate(
	db: Database,
	update: TelegramUpdate,
): Promise<TelegramBotCommandResult> {
	const message = update.message;
	if (!message?.text) {
		return { handled: false };
	}

	const command = parseBotCommand(message.text);
	if (!command) {
		return { handled: false };
	}

	let replyText: string;

	switch (command) {
		case "/deadline":
			replyText = await buildDeadlineReplyFromDb(db);
			break;
		case "/book":
			replyText = await buildBookReply(db);
			break;
		default:
			return { handled: false, command };
	}

	await sendTelegramReply({
		chatId: message.chat.id,
		text: replyText,
		replyToMessageId: message.message_id,
	});

	return { handled: true, command };
}
