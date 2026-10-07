import { resolveTelegramConfig } from "./config";

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

export async function sendTelegramMessage(
	input: SendTelegramMessageInput,
): Promise<boolean> {
	const config = resolveTelegramConfig();
	if (!config) {
		return false;
	}

	const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: config.groupChatId,
				text: input.text,
				parse_mode: input.parseMode ?? "HTML",
				disable_web_page_preview: input.disableWebPagePreview ?? false,
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
