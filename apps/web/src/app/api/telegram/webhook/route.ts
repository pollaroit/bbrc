import { TelegramUpdateSchema } from "@bbrc/api/lib/telegram/bot-commands.schema";
import { handleTelegramBotUpdate } from "@bbrc/api/lib/telegram/bot-commands.service";
import { resolveTelegramWebhookSecret } from "@bbrc/api/lib/telegram/config";
import { NextResponse } from "next/server";
import { db } from "@/services";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isWebhookAuthorized(request: Request): boolean {
	const secret = resolveTelegramWebhookSecret();
	if (!secret) {
		return false;
	}
	return request.headers.get("x-telegram-bot-api-secret-token") === secret;
}

export async function POST(request: Request) {
	if (!isWebhookAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const parsed = TelegramUpdateSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ ok: true, ignored: "unsupported_update" });
	}

	try {
		const result = await handleTelegramBotUpdate(db, parsed.data);
		return NextResponse.json({ ok: true, ...result });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Handler failed";
		console.error("telegram webhook error", message);
		return NextResponse.json({ ok: true, error: message });
	}
}
