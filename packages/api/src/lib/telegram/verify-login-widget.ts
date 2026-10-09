import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type TelegramLoginWidgetPayload = {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	photo_url?: string;
	auth_date: number;
	hash: string;
};

const MAX_AUTH_AGE_SECONDS = 86_400;

function buildDataCheckString(
	data: Omit<TelegramLoginWidgetPayload, "hash">,
): string {
	return Object.entries(data)
		.filter(([, value]) => value !== undefined)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");
}

function computeWidgetHash(dataCheckString: string, botToken: string): Buffer {
	const secretKey = createHash("sha256").update(botToken).digest();
	return createHmac("sha256", secretKey).update(dataCheckString).digest();
}

/** Validates Telegram Login Widget callback data. */
export function verifyTelegramLoginWidget(
	payload: TelegramLoginWidgetPayload,
	botToken: string,
	nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
	if (!Number.isFinite(payload.id) || payload.id <= 0) {
		return false;
	}

	const age = nowSeconds - payload.auth_date;
	if (age < 0 || age > MAX_AUTH_AGE_SECONDS) {
		return false;
	}

	const { hash, ...rest } = payload;
	const dataCheckString = buildDataCheckString(rest);
	const expected = computeWidgetHash(dataCheckString, botToken);

	let received: Buffer;
	try {
		received = Buffer.from(hash, "hex");
	} catch {
		return false;
	}

	if (received.length !== expected.length) {
		return false;
	}

	return timingSafeEqual(received, expected);
}
