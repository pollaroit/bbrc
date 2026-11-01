import { createHash } from "node:crypto";
import { RecordViewsRequestSchema } from "@bbrc/api/modules/view/view.schema";
import {
	countBotRequest,
	recordViews,
} from "@bbrc/api/modules/view/view.service";
import { loadViewer } from "@bbrc/api/modules/visibility/viewer";
import { isBotUserAgent } from "@bbrc/shared";
import { NextResponse } from "next/server";
import { auth, db } from "@/services";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const MAX_BODY_BYTES = 8 * 1024;

function clientIp(request: Request): string | null {
	const forwarded = request.headers
		.get("x-forwarded-for")
		?.split(",")[0]
		?.trim();
	return forwarded || request.headers.get("x-real-ip") || null;
}

/** Tracking must never break a page, so every outcome is a quiet success. */
const quiet = () => new NextResponse(null, { status: 204 });

/**
 * Receives the batched view beacons from the browser. The request is what tells
 * us who looked (session, IP, user agent, country), which is why this is a route
 * and not an RPC call.
 */
export async function POST(request: Request) {
	const origin = request.headers.get("origin");
	if (origin && new URL(origin).host !== new URL(request.url).host) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const text = await request.text();
	if (text.length > MAX_BODY_BYTES) {
		return NextResponse.json({ error: "Too large" }, { status: 413 });
	}
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = RecordViewsRequestSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid views" }, { status: 400 });
	}

	const userAgent = request.headers.get("user-agent");
	if (isBotUserAgent(userAgent)) {
		await countBotRequest(db);
		return quiet();
	}

	try {
		const session = await auth.api.getSession({ headers: request.headers });
		const ip = clientIp(request);
		// The browser's own random id; without one, a hash of what the request shows.
		const visitorId =
			parsed.data.visitorId ??
			`h:${createHash("sha256")
				.update(
					`${ip ?? ""}|${userAgent ?? ""}|${request.headers.get("accept-language") ?? ""}`,
				)
				.digest("hex")
				.slice(0, 32)}`;
		const country = request.headers.get("x-vercel-ip-country");

		await recordViews(
			db,
			{
				userId: session?.user.id ?? null,
				visitorId,
				ip,
				userAgent,
				country:
					country && /^[A-Za-z]{2}$/.test(country)
						? country.toUpperCase()
						: null,
				referrerHost: parsed.data.referrerHost ?? null,
			},
			parsed.data.items,
			await loadViewer(db, session),
		);
	} catch (error) {
		console.error("recording views failed", error);
	}
	return quiet();
}
