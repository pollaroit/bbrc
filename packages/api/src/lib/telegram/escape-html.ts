/** Escape for Telegram `parse_mode: HTML`. */
export function escapeTelegramHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

/** Mention a member in a group (notify) when their Telegram id is linked on BBRC. */
export function formatTelegramMemberMention(
	displayName: string,
	telegramUserId: string | null | undefined,
): string {
	const label = escapeTelegramHtml(displayName);
	const id = telegramUserId?.trim();
	if (id && /^\d+$/.test(id)) {
		return `<a href="tg://user?id=${id}">${label}</a>`;
	}
	return label;
}
