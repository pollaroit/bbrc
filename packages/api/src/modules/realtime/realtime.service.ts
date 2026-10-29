import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";
import { buildMemberCapability, REALTIME_TOKEN_TTL_MS } from "@bbrc/shared";
import type * as Ably from "ably";
import { getAblyRest } from "../../lib/realtime/ably";
import { realtimeClientId } from "../../lib/realtime/client-id";

/** The book of the member's open Reading Mode session, if they have one. */
async function openSessionBookSlug(
	db: Database,
	userId: string,
): Promise<string | null> {
	const row = await db.readingSession.findFirst({
		where: { userId, endedAt: null, reading: { finishedAt: null } },
		select: { reading: { select: { book: { select: { slug: true } } } } },
	});
	return row?.reading.book.slug ?? null;
}

export type RealtimeAuthResult =
	| { ok: true; tokenRequest: Ably.TokenRequest }
	| { ok: false; reason: "not_configured" | "banned" };

/**
 * A signed Ably token request for the browser. The server decides the member's
 * identity and what they may do (see `buildMemberCapability`); the browser
 * cannot ask for more. Asked again whenever the member's Reading Mode session
 * starts or ends, so what they may enter always matches the database.
 */
export async function createRealtimeTokenRequest(
	db: Database,
	session: Session,
): Promise<RealtimeAuthResult> {
	const rest = getAblyRest();
	const clientId = realtimeClientId(session.user.id);
	if (!rest || !clientId) return { ok: false, reason: "not_configured" };
	if (session.user.status === "banned") return { ok: false, reason: "banned" };

	const capability = buildMemberCapability({
		presenceBookSlug: await openSessionBookSlug(db, session.user.id),
		dev: process.env.NODE_ENV !== "production",
	});

	const tokenRequest = await rest.auth.createTokenRequest({
		clientId,
		capability: JSON.stringify(capability),
		ttl: REALTIME_TOKEN_TTL_MS,
	});
	return { ok: true, tokenRequest };
}
