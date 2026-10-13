import type { Database } from "@bbrc/db";
import { formatSittingDisplayName } from "@bbrc/shared";
import { getBookListFields } from "../../modules/book/book.schema";
import { activeParticipationWhere } from "../../modules/sitting/participation-active";
import type { TelegramUpdate } from "./bot-commands.schema";
import { sendTelegramReply } from "./client";
import { escapeTelegramHtml } from "./escape-html";
import { formatReadingDeadlineTelegramLine } from "./format-reading-deadline-line";
import { resolvePublicAppOrigin } from "./public-app-origin";
import {
	handleSetprogressCallback,
	handleSetprogressCommand,
} from "./setprogress-command";
import { handleTelegramAccountLinkMessage } from "./telegram-account-link";

const PARTICIPANT_LIST_LIMIT = 40;
const WHO_LIST_LIMIT = 25;

const ongoingSittingSelect = {
	id: true,
	slug: true,
	status: true,
	deadline: true,
	selectedBook: {
		select: getBookListFields,
	},
	poll: {
		select: {
			deadline: true,
			_count: { select: { options: true } },
		},
	},
	participants: {
		where: activeParticipationWhere,
		select: {
			progress: true,
			user: { select: { name: true, username: true } },
		},
		orderBy: { user: { username: "asc" } },
	},
} as const;

type OngoingSittingRow = NonNullable<
	Awaited<ReturnType<typeof loadOngoingSitting>>
>;

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

function formatMemberLabel(name: string | null, username: string): string {
	const trimmed = name?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : username;
}

function formatProgressLabel(progress: string): string {
	switch (progress) {
		case "not_started":
			return "Not started";
		case "in_progress":
			return "In progress";
		case "completed":
			return "Completed";
		case "dnf":
			return "DNF";
		default:
			return progress.replaceAll("_", " ");
	}
}

function sittingDisplayName(row: OngoingSittingRow): string {
	return formatSittingDisplayName(
		row.slug,
		row.status,
		row.selectedBook?.title,
	);
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

async function loadOngoingSitting(db: Database) {
	return db.sitting.findFirst({
		where: { status: { in: ["voting", "reading"] } },
		orderBy: { createdAt: "desc" },
		select: ongoingSittingSelect,
	});
}

async function loadCurrentReadingSitting(db: Database) {
	return db.sitting.findFirst({
		where: { status: "reading" },
		orderBy: { createdAt: "desc" },
		select: {
			slug: true,
			deadline: true,
			selectedBook: { select: getBookListFields },
		},
	});
}

function buildHelpReply(): string {
	const origin = resolvePublicAppOrigin();
	return [
		"<b>BBRC bot commands</b>",
		"/help — Command list",
		"/sitting — Current club sitting",
		"/poll — Open book poll",
		"/deadline — Reading deadline",
		"/book — Current book",
		"/who — Members not finished reading",
		"/participants — Sitting roster",
		"/setprogress — Update your progress on the current reading sitting",
		"Link BBRC account: Settings → Account connections on the site",
		`<a href="${origin}">Open BBRC</a>`,
	].join("\n");
}

async function buildSittingReply(db: Database): Promise<string> {
	const sitting = await loadOngoingSitting(db);
	if (!sitting) {
		return "No ongoing sitting right now.";
	}

	const label = escapeTelegramHtml(sittingDisplayName(sitting));
	const sittingUrl = `${resolvePublicAppOrigin()}/sittings/${sitting.slug}`;

	if (sitting.status === "voting") {
		if (!sitting.poll) {
			return "No ongoing sitting right now.";
		}
		const closes = formatReadingDeadlineTelegramLine(sitting.poll.deadline);
		const voteUrl = `${sittingUrl}/vote`;
		return [
			`<b>${label}</b>`,
			"Voting is open.",
			`Poll closes: ${closes}`,
			`${sitting.poll._count.options} options · ${sitting.participants.length} participants`,
			`<a href="${voteUrl}">Vote now</a>`,
		].join("\n");
	}

	const deadline = formatReadingDeadlineTelegramLine(sitting.deadline);
	const bookLine = sitting.selectedBook
		? escapeTelegramHtml(sitting.selectedBook.title)
		: null;

	return [
		`<b>${label}</b>`,
		"Reading phase.",
		bookLine ? `Book: <i>${bookLine}</i>` : null,
		`Deadline: ${deadline}`,
		`<a href="${sittingUrl}">Open sitting</a>`,
	]
		.filter((line) => line != null)
		.join("\n");
}

async function buildPollReply(db: Database): Promise<string> {
	const sitting = await loadOngoingSitting(db);
	if (!sitting || sitting.status !== "voting" || !sitting.poll) {
		return "No poll open right now.";
	}

	const label = escapeTelegramHtml(sittingDisplayName(sitting));
	const closes = formatReadingDeadlineTelegramLine(sitting.poll.deadline);
	const voteUrl = `${resolvePublicAppOrigin()}/sittings/${sitting.slug}/vote`;

	return [
		`<b>Poll</b> — ${label}`,
		`Closes: ${closes}`,
		`${sitting.poll._count.options} options · ${sitting.participants.length} participants`,
		`<a href="${voteUrl}">Vote on BBRC</a>`,
	].join("\n");
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

async function buildWhoReply(db: Database): Promise<string> {
	const sitting = await loadOngoingSitting(db);
	if (!sitting || sitting.status !== "reading") {
		return "No reading session currently.";
	}

	const behind = sitting.participants.filter(
		(row) => row.progress !== "completed",
	);

	if (behind.length === 0) {
		return "Everyone has marked completed on BBRC.";
	}

	const lines = behind.slice(0, WHO_LIST_LIMIT).map((row) => {
		const label = escapeTelegramHtml(
			formatMemberLabel(row.user.name, row.user.username),
		);
		const progress = formatProgressLabel(row.progress);
		return `· ${label} (${progress})`;
	});

	const overflow =
		behind.length > WHO_LIST_LIMIT
			? `\n…and ${behind.length - WHO_LIST_LIMIT} more`
			: "";

	const sittingUrl = `${resolvePublicAppOrigin()}/sittings/${sitting.slug}`;

	return [
		`<b>Not completed yet (${behind.length})</b>`,
		lines.join("\n") + overflow,
		`<a href="${sittingUrl}">Update on BBRC</a>`,
	].join("\n\n");
}

async function buildParticipantsReply(db: Database): Promise<string> {
	const sitting = await loadOngoingSitting(db);
	if (!sitting) {
		return "No ongoing sitting right now.";
	}

	const roster = sitting.participants;
	if (roster.length === 0) {
		return "No participants on this sitting yet.";
	}

	const lines = roster.slice(0, PARTICIPANT_LIST_LIMIT).map((row) => {
		const label = escapeTelegramHtml(
			formatMemberLabel(row.user.name, row.user.username),
		);
		const progress =
			sitting.status === "reading"
				? ` (${formatProgressLabel(row.progress)})`
				: "";
		return `· ${label}${progress}`;
	});

	const overflow =
		roster.length > PARTICIPANT_LIST_LIMIT
			? `\n…and ${roster.length - PARTICIPANT_LIST_LIMIT} more`
			: "";

	const sittingUrl = `${resolvePublicAppOrigin()}/sittings/${sitting.slug}`;

	return [
		`<b>Participants (${roster.length})</b>`,
		lines.join("\n") + overflow,
		`<a href="${sittingUrl}">Open sitting</a>`,
	].join("\n\n");
}

export type TelegramBotCommandResult = {
	handled: boolean;
	command?: string;
};

export async function handleTelegramBotUpdate(
	db: Database,
	update: TelegramUpdate,
): Promise<TelegramBotCommandResult> {
	const callbackQuery = update.callback_query;
	if (callbackQuery?.data?.startsWith("sp:")) {
		const chatId = callbackQuery.message?.chat.id;
		if (chatId != null) {
			await handleSetprogressCallback(db, {
				callbackQueryId: callbackQuery.id,
				telegramUserId: callbackQuery.from.id,
				chatId,
				messageId: callbackQuery.message?.message_id,
				data: callbackQuery.data,
			});
		}
		return { handled: true, command: "setprogress_callback" };
	}

	const message = update.message;
	if (!message?.text) {
		return { handled: false };
	}

	const linked = await handleTelegramAccountLinkMessage(
		db,
		{
			text: message.text,
			chat: message.chat,
			from: message.from,
			message_id: message.message_id,
		},
		async (text) => {
			await sendTelegramReply({
				chatId: message.chat.id,
				text,
				replyToMessageId: message.message_id,
			});
		},
	);
	if (linked) {
		return { handled: true, command: "link" };
	}

	const command = parseBotCommand(message.text);
	if (!command) {
		return { handled: false };
	}

	let replyText: string;

	switch (command) {
		case "/help":
			replyText = buildHelpReply();
			break;
		case "/sitting":
			replyText = await buildSittingReply(db);
			break;
		case "/poll":
			replyText = await buildPollReply(db);
			break;
		case "/deadline":
			replyText = await buildDeadlineReplyFromDb(db);
			break;
		case "/book":
			replyText = await buildBookReply(db);
			break;
		case "/who":
			replyText = await buildWhoReply(db);
			break;
		case "/participants":
			replyText = await buildParticipantsReply(db);
			break;
		case "/setprogress":
			await handleSetprogressCommand(db, {
				chatId: message.chat.id,
				telegramUserId: message.from?.id,
				replyToMessageId: message.message_id,
			});
			return { handled: true, command };
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
