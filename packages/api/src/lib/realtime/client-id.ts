import { createHmac } from "node:crypto";

const LABEL = "bbrc:realtime:client-id:v1";

/**
 * A member's identity on realtime channels: an opaque id made from their user id
 * with a key derived from the auth secret. Anyone watching a channel sees only
 * this, so they cannot tell who is who; only the server can turn it back into a
 * member (by computing the same id for the members it knows about). Stable for
 * the same member, different for everyone else, and it changes if the auth
 * secret ever does (harmless: presence is short-lived).
 */
export function realtimeClientId(
	userId: string,
	secret: string | undefined = process.env.BETTER_AUTH_SECRET,
): string | null {
	if (!secret) return null;
	const key = createHmac("sha256", secret).update(LABEL).digest();
	return createHmac("sha256", key)
		.update(userId)
		.digest("base64url")
		.slice(0, 22);
}
