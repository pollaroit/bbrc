import type { Database } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { resolveTelegramBotToken } from "../../lib/telegram/config";
import { verifyTelegramLoginWidget } from "../../lib/telegram/verify-login-widget";
import type {
	GetTelegramLinkStatusOutput,
	LinkTelegramOutput,
	TelegramLoginWidgetInput,
	UnlinkTelegramOutput,
} from "./telegram-link.schema";

const TELEGRAM_PROVIDER_ID = "telegram";

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

export async function linkTelegramAccount(
	userId: string,
	input: TelegramLoginWidgetInput,
	db: Database,
): Promise<LinkTelegramOutput> {
	const botToken = resolveTelegramBotToken();
	if (!botToken) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Telegram bot is not configured",
		});
	}

	if (!verifyTelegramLoginWidget(input, botToken)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Telegram authorization could not be verified. Try again.",
		});
	}

	const telegramUserId = String(input.id);
	const telegramUsername = input.username?.trim() || null;

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

export async function unlinkTelegramAccount(
	userId: string,
	db: Database,
): Promise<UnlinkTelegramOutput> {
	await db.$transaction(async (tx) => {
		await tx.account.deleteMany({
			where: { userId, providerId: TELEGRAM_PROVIDER_ID },
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
