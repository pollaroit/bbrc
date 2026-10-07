export type TelegramConfig = {
	botToken: string;
	groupChatId: string;
};

export function resolveTelegramBotToken(): string | null {
	const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
	return token || null;
}

export function resolveTelegramWebhookSecret(): string | null {
	const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
	return secret || null;
}

export function resolveTelegramConfig(): TelegramConfig | null {
	if (process.env.TELEGRAM_BOT_ENABLED?.trim().toLowerCase() !== "true") {
		return null;
	}

	const botToken = resolveTelegramBotToken();
	const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID?.trim();

	if (!botToken || !groupChatId) {
		return null;
	}

	return { botToken, groupChatId };
}
