import { randomBytes } from "node:crypto";
import type { Database } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { resolveTelegramBotUsername } from "../../lib/telegram/config";
import type {
	BeginTelegramLinkOutput,
	GetTelegramLinkStatusOutput,
	UnlinkTelegramOutput,
} from "./telegram-link.schema";

const TELEGRAM_PROVIDER_ID = "telegram";
const LINK_IDENTIFIER_PREFIX = "telegram-link:";
const LINK_TTL_MS = 15 * 60 * 1000;
const LINK_TOKEN_BYTES = 16;

function linkVerificationIdentifier(userId: string): string {
	return `${LINK_IDENTIFIER_PREFIX}${userId}`;
}

function mapLinkStatus(user: {
	telegramUserId: string | null;
	telegramUsername: string | null;
}): GetTelegramLinkStatusOutput {
	const linked = user.telegramUserId != null;
	return {
		linked,
		telegramUserId: user.telegramUserId,
		telegramUsername: user.telegramUsername,
	};
}

export async function getTelegramLinkStatus(
	userId: string,
	db: Database,
): Promise<GetTelegramLinkStatusOutput> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { telegramUserId: true, telegramUsername: true },
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	return mapLinkStatus(user);
}

async function applyTelegramLink(
	userId: string,
	telegramUserId: string,
	telegramUsername: string | null,
	db: Database,
): Promise<GetTelegramLinkStatusOutput> {
	const taken = await db.user.findFirst({
		where: {
			telegramUserId,
			NOT: { id: userId },
		},
		select: { id: true },
	});

	if (taken) {
		throw new ORPCError("CONFLICT", {
			message:
				"This Telegram account is already linked to another BBRC member.",
		});
	}

	await db.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: userId },
			data: { telegramUserId, telegramUsername },
		});

		const existingAccount = await tx.account.findFirst({
			where: { userId, providerId: TELEGRAM_PROVIDER_ID },
			select: { id: true },
		});

		if (existingAccount) {
			await tx.account.update({
				where: { id: existingAccount.id },
				data: { accountId: telegramUserId },
			});
			return;
		}

		await tx.account.create({
			data: {
				userId,
				providerId: TELEGRAM_PROVIDER_ID,
				accountId: telegramUserId,
			},
		});
	});

	return {
		linked: true,
		telegramUserId,
		telegramUsername,
	};
}

export async function beginTelegramLinkChallenge(
	userId: string,
	db: Database,
): Promise<BeginTelegramLinkOutput> {
	const botUsername = resolveTelegramBotUsername();
	if (!botUsername) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Telegram bot is not configured",
		});
	}

	const user = await db.user.findUnique({
		where: { id: userId },
		select: { telegramUserId: true },
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	if (user.telegramUserId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Telegram is already connected",
		});
	}

	const token = randomBytes(LINK_TOKEN_BYTES).toString("hex");
	const expiresAt = new Date(Date.now() + LINK_TTL_MS);
	const identifier = linkVerificationIdentifier(userId);

	await db.$transaction(async (tx) => {
		await tx.verification.deleteMany({ where: { identifier } });
		await tx.verification.create({
			data: {
				identifier,
				value: token,
				expiresAt,
			},
		});
	});

	return {
		url: `https://t.me/${botUsername}?start=link_${token}`,
		expiresAt: expiresAt.toISOString(),
	};
}

/** Called from the club bot webhook (private chat). Returns HTML reply text. */
export async function fulfillTelegramLinkChallenge(
	db: Database,
	token: string,
	telegramUserId: number,
	telegramUsername: string | null | undefined,
): Promise<string> {
	const normalized = token.trim().toLowerCase();
	if (!/^[a-f0-9]{32}$/.test(normalized)) {
		return "That link code is invalid. Start again from BBRC → Settings → Account connections.";
	}

	const challenge = await db.verification.findFirst({
		where: {
			value: normalized,
			identifier: { startsWith: LINK_IDENTIFIER_PREFIX },
		},
	});

	if (!challenge) {
		return "That link code is unknown or already used. Generate a new one on BBRC.";
	}

	if (challenge.expiresAt.getTime() < Date.now()) {
		await db.verification.delete({ where: { id: challenge.id } });
		return "That link code expired. Open BBRC and tap Connect Telegram again.";
	}

	const userId = challenge.identifier.slice(LINK_IDENTIFIER_PREFIX.length);
	const telegramId = String(telegramUserId);
	const username = telegramUsername?.trim() || null;

	try {
		await applyTelegramLink(userId, telegramId, username, db);
	} catch (error) {
		if (error instanceof ORPCError && error.code === "CONFLICT") {
			return "This Telegram account is already linked to another BBRC member.";
		}
		throw error;
	}

	await db.verification.delete({ where: { id: challenge.id } });

	const label = username ? `@${username}` : "your Telegram account";
	return `Done — ${label} is now linked to BBRC. You can return to the website.`;
}

export async function unlinkTelegramAccount(
	userId: string,
	db: Database,
): Promise<UnlinkTelegramOutput> {
	await db.$transaction(async (tx) => {
		await tx.account.deleteMany({
			where: { userId, providerId: TELEGRAM_PROVIDER_ID },
		});

		await tx.verification.deleteMany({
			where: { identifier: linkVerificationIdentifier(userId) },
		});

		await tx.user.update({
			where: { id: userId },
			data: {
				telegramUserId: null,
				telegramUsername: null,
			},
		});
	});

	return { linked: false };
}
