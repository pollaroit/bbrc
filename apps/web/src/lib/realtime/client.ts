import { REALTIME_IDLE_CLOSE_MS } from "@bbrc/shared";
import * as Ably from "ably";

/*
 * The browser's one Ably connection.
 *
 * - **One per tab, opened only when a screen needs it** (`acquireRealtime`), and
 *   closed shortly after the last screen lets go.
 * - **Closed 2 minutes after the tab is hidden**, unless a Reading Mode session
 *   is running (`keepAlive`): people reading in another app on the same phone
 *   still count as reading.
 * - **Never a hard dependency.** If the server says realtime is not set up, the
 *   member is not allowed, or Ably gives up (for example at its connection
 *   limit), `realtimeUnavailable()` turns true for this tab and every screen
 *   falls back to its normal polling.
 * - The browser never holds the Ably key: it asks `/api/realtime/auth` for a
 *   short-lived token, and what the token allows is decided on the server.
 */

type Listener = () => void;

let client: Ably.Realtime | null = null;
let unavailable = false;
let holds = 0;
let keepAliveHolds = 0;
let idleTimer: number | null = null;
let releaseTimer: number | null = null;
let watching = false;
const listeners = new Set<Listener>();
/** What this connection's token has already been renewed for (see `reauthorizeRealtime`). */
const authorizedFor = new Set<string>();
/** Times the browser asked the server for a token, newest last. */
const tokenRequests: number[] = [];

/** More than this many token requests in a minute means something is looping. */
const MAX_TOKEN_REQUESTS_PER_MINUTE = 6;

const RELEASE_DELAY_MS = 10_000;

function emit() {
	for (const listener of listeners) listener();
}

export function subscribeRealtimeState(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function realtimeUnavailable(): boolean {
	return unavailable;
}

/** "connected", "connecting", "closed", "unavailable" or "idle" (never opened). */
export function realtimeStateSnapshot(): string {
	if (unavailable) return "unavailable";
	return client?.connection.state ?? "idle";
}

export function getRealtimeClient(): Ably.Realtime | null {
	return client;
}

async function authCallback(
	_params: Ably.TokenParams,
	callback: (
		error: Ably.ErrorInfo | string | null,
		token: Ably.TokenRequest | null,
	) => void,
) {
	// A circuit breaker: a loop must never hammer the server and Ably. Stop and fall back.
	const now = Date.now();
	tokenRequests.push(now);
	while (tokenRequests.length > 0 && now - (tokenRequests[0] ?? now) > 60_000) {
		tokenRequests.shift();
	}
	if (tokenRequests.length > MAX_TOKEN_REQUESTS_PER_MINUTE) {
		console.warn(
			"Realtime asked for too many tokens in a minute and was switched off for this tab.",
		);
		unavailable = true;
		emit();
		callback("Too many token requests.", null);
		return;
	}
	try {
		const response = await fetch("/api/realtime/auth", {
			method: "POST",
			credentials: "same-origin",
			cache: "no-store",
		});
		if ([401, 403, 503].includes(response.status)) {
			// Signed out, not allowed, or not set up: stop trying in this tab.
			unavailable = true;
			emit();
			callback("Realtime is not available.", null);
			return;
		}
		if (!response.ok) throw new Error(`Auth failed (${response.status})`);
		callback(null, (await response.json()) as Ably.TokenRequest);
	} catch (error) {
		callback(error instanceof Error ? error.message : String(error), null);
	}
}

function cancelIdle() {
	if (idleTimer) window.clearTimeout(idleTimer);
	idleTimer = null;
}

function closeConnection() {
	cancelIdle();
	if (client && client.connection.state !== "closed") client.close();
	emit();
}

function watchVisibility() {
	if (watching || typeof document === "undefined") return;
	watching = true;
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") {
			cancelIdle();
			if (client && holds > 0 && keepAliveHolds === 0) {
				idleTimer = window.setTimeout(closeConnection, REALTIME_IDLE_CLOSE_MS);
			}
			return;
		}
		cancelIdle();
		if (holds > 0 && client?.connection.state === "closed" && !unavailable) {
			client.connect();
		}
	});
}

function ensureClient(): Ably.Realtime | null {
	if (typeof window === "undefined" || unavailable) return null;
	if (!client) {
		client = new Ably.Realtime({ authCallback, autoConnect: true });
		client.connection.on((change) => {
			// Ably gave up (its connection limit, a refused token): fall back for this tab.
			if (change.current === "failed") unavailable = true;
			// A new connection starts with a fresh token (read from the database just now).
			if (change.current === "connected" && change.previous !== "connected") {
				authorizedFor.clear();
			}
			emit();
		});
		watchVisibility();
	}
	if (client.connection.state === "closed") client.connect();
	return client;
}

/**
 * Says "this screen uses realtime" and opens the connection if needed. Call the
 * returned function when the screen is done. `keepAlive` keeps the connection
 * open while the tab is hidden (a running Reading Mode session).
 */
export function acquireRealtime(options?: { keepAlive?: boolean }): () => void {
	holds += 1;
	if (options?.keepAlive) keepAliveHolds += 1;
	if (releaseTimer) window.clearTimeout(releaseTimer);
	releaseTimer = null;
	cancelIdle();
	ensureClient();

	let released = false;
	return () => {
		if (released) return;
		released = true;
		holds -= 1;
		if (options?.keepAlive) keepAliveHolds -= 1;
		// Moving between two screens that both use realtime must not reconnect.
		if (holds === 0) {
			releaseTimer = window.setTimeout(closeConnection, RELEASE_DELAY_MS);
		}
	};
}

/**
 * Asks for a fresh token, so what the member may do matches the database again
 * (a session started or ended). With a `scope` it asks at most once per
 * connection for that scope; without one it always asks (and forgets the
 * scopes, because the new token reflects the database as it is now).
 */
export async function reauthorizeRealtime(scope?: string): Promise<void> {
	if (!client || unavailable) return;
	const state = client.connection.state;
	if (state !== "connected" && state !== "connecting") return;
	if (scope && authorizedFor.has(scope)) return;
	try {
		await client.auth.authorize();
		if (scope) authorizedFor.add(scope);
		else authorizedFor.clear();
	} catch {
		// The next connection will ask again; nothing to do now.
	}
}

/** How many token requests this tab has made in the last minute (for /dev/realtime). */
export function recentTokenRequests(): number {
	const now = Date.now();
	return tokenRequests.filter((at) => now - at <= 60_000).length;
}
