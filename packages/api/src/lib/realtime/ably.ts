import * as Ably from "ably";

let rest: Ably.Rest | null = null;

/** Realtime is off until `ABLY_API_KEY` is set; nothing else needs to change. */
export function ablyConfigured(): boolean {
	return Boolean(process.env.ABLY_API_KEY?.trim());
}

/** The server's Ably client. It holds the key, so it never leaves the server. */
export function getAblyRest(): Ably.Rest | null {
	const key = process.env.ABLY_API_KEY?.trim();
	if (!key) return null;
	rest ??= new Ably.Rest({ key });
	return rest;
}
