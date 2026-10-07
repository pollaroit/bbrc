export type TelegramConfig = {
	botToken: string;
	groupChatId: string;
};

export function resolveTelegramConfig(): TelegramConfig | null {
	if (process.env.TELEGRAM_BOT_ENABLED?.trim().toLowerCase() !== "true") {
		return null;
	}

	const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
	const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID?.trim();

	if (!botToken || !groupChatId) {
		return null;
	}

	return { botToken, groupChatId };
}
