import type { Database } from "@bbrc/db";
import { resolvePublicAppOrigin } from "./public-app-origin";

export type LinkedTelegramUser = {
	id: string;
	username: string;
	name: string;
	isAdmin: boolean;
	xp: number;
	rp: number;
	status: string;
	telegramUsername: string | null;
};

export async function loadLinkedUserByTelegramId(
	db: Database,
	telegramUserId: number,
): Promise<LinkedTelegramUser | null> {
	return db.user.findUnique({
		where: { telegramUserId: String(telegramUserId) },
		select: {
			id: true,
			username: true,
			name: true,
			isAdmin: true,
			xp: true,
			rp: true,
			status: true,
			telegramUsername: true,
		},
	});
}

export function buildLinkAccountReply(): string {
	const origin = resolvePublicAppOrigin();
	return [
		"Link your BBRC account first.",
		"On the site: Settings → Account connections, then open the bot in a private chat to finish linking.",
		`<a href="${origin}/settings/accounts">Account connections</a>`,
	].join("\n");
}
