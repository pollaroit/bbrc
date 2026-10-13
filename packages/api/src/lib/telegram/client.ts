import { resolveTelegramBotToken, resolveTelegramConfig } from "./config";

export type SendTelegramMessageInput = {
	text: string;
	parseMode?: "HTML" | "MarkdownV2";
	disableWebPagePreview?: boolean;
};

export type SendTelegramPollInput = {
	question: string;
	options: string[];
	isAnonymous?: boolean;
	allowsMultipleAnswers?: boolean;
	explanation?: string;
};

export type TelegramInlineKeyboardMarkup = {
	inline_keyboard: { text: string; callback_data: string }[][];
};

async function postTelegramSendMessage(
	botToken: string,
	chatId: string | number,
	input: SendTelegramMessageInput,
	options?: {
		replyToMessageId?: number;
		replyMarkup?: TelegramInlineKeyboardMarkup;
	},
): Promise<boolean> {
	const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				text: input.text,
				parse_mode: input.parseMode ?? "HTML",
				disable_web_page_preview: input.disableWebPagePreview ?? false,
				...(options?.replyToMessageId != null
					? { reply_parameters: { message_id: options.replyToMessageId } }
					: {}),
				...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
			}),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			console.error(
				`telegram sendMessage failed (${response.status}): ${body.slice(0, 200)}`,
			);
			return false;
		}

		return true;
	} catch (error) {
		console.error("telegram sendMessage error", error);
		return false;
	}
}

export async function sendTelegramMessage(
	input: SendTelegramMessageInput,
): Promise<boolean> {
	const config = resolveTelegramConfig();
	if (!config) {
		return false;
	}

	return postTelegramSendMessage(config.botToken, config.groupChatId, input);
}

export type SendTelegramReplyInput = SendTelegramMessageInput & {
	chatId: string | number;
	replyToMessageId?: number;
	replyMarkup?: TelegramInlineKeyboardMarkup;
};

/** Reply in any chat (group DMs, supergroup) — only requires bot token. */
export async function sendTelegramReply(
	input: SendTelegramReplyInput,
): Promise<boolean> {
	const botToken = resolveTelegramBotToken();
	if (!botToken) {
		return false;
	}

	return postTelegramSendMessage(botToken, input.chatId, input, {
		replyToMessageId: input.replyToMessageId,
		replyMarkup: input.replyMarkup,
	});
}

export type AnswerTelegramCallbackQueryInput = {
	callbackQueryId: string;
	text?: string;
	showAlert?: boolean;
};

export async function answerTelegramCallbackQuery(
	input: AnswerTelegramCallbackQueryInput,
): Promise<boolean> {
	const botToken = resolveTelegramBotToken();
	if (!botToken) {
		return false;
	}

	const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				callback_query_id: input.callbackQueryId,
				...(input.text ? { text: input.text } : {}),
				...(input.showAlert ? { show_alert: true } : {}),
			}),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			console.error(
				`telegram answerCallbackQuery failed (${response.status}): ${body.slice(0, 200)}`,
			);
			return false;
		}

		return true;
	} catch (error) {
		console.error("telegram answerCallbackQuery error", error);
		return false;
	}
}

export async function sendTelegramPoll(
	input: SendTelegramPollInput,
): Promise<boolean> {
	const config = resolveTelegramConfig();
	if (!config) {
		return false;
	}

	if (input.options.length < 2 || input.options.length > 10) {
		console.error("telegram sendPoll: options must be between 2 and 10");
		return false;
	}

	const url = `https://api.telegram.org/bot${config.botToken}/sendPoll`;

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: config.groupChatId,
				question: input.question,
				options: input.options,
				is_anonymous: input.isAnonymous ?? false,
				allows_multiple_answers: input.allowsMultipleAnswers ?? false,
				...(input.explanation ? { explanation: input.explanation } : {}),
			}),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			console.error(
				`telegram sendPoll failed (${response.status}): ${body.slice(0, 200)}`,
			);
			return false;
		}

		return true;
	} catch (error) {
		console.error("telegram sendPoll error", error);
		return false;
	}
}
