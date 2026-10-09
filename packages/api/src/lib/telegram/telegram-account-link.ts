import type { Database } from "@bbrc/db";
import { fulfillTelegramLinkChallenge } from "../../modules/user/telegram-link.service";

const START_PAYLOAD_RE = /^\/start(?:@[\w]+)?\s+link_([a-f0-9]{32})$/i;
const LINK_COMMAND_RE = /^\/link(?:@[\w]+)?\s+([a-f0-9]{32})$/i;

function extractLinkToken(text: string): string | null {
	const trimmed = text.trim();
	const startMatch = trimmed.match(START_PAYLOAD_RE);
	if (startMatch?.[1]) {
		return startMatch[1];
	}
	const linkMatch = trimmed.match(LINK_COMMAND_RE);
	return linkMatch?.[1] ?? null;
}

type LinkMessage = {
	text: string;
	chat: { type: string; id: number };
	from?: { id: number; username?: string };
	message_id: number;
};

/** Private-chat deep link /start link_* or /link * — no oauth.telegram.org. */
export async function handleTelegramAccountLinkMessage(
	db: Database,
	message: LinkMessage,
	sendReply: (text: string) => Promise<void>,
): Promise<boolean> {
	if (message.chat.type !== "private" || !message.from) {
		return false;
	}

	const token = extractLinkToken(message.text);
	if (!token) {
		return false;
	}

	const replyText = await fulfillTelegramLinkChallenge(
		db,
		token,
		message.from.id,
		message.from.username,
	);
	await sendReply(replyText);
	return true;
}
