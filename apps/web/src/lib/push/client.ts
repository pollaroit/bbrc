import * as Ably from "ably";
import Push from "ably/push";

/*
 * Web push for this browser, through Ably Push.
 *
 * A separate Ably client that never opens a realtime connection (`autoConnect:
 * false`): it only registers this browser with Ably, which then delivers the
 * pushes our server sends to this member. It reuses the app's service worker
 * (`/serwist/sw.js`) instead of registering a second one with the same scope.
 */

const SERVICE_WORKER_URL = "/serwist/sw.js";

let pushClient: Ably.Realtime | null = null;

async function authCallback(
	_params: Ably.TokenParams,
	callback: (
		error: Ably.ErrorInfo | string | null,
		token: Ably.TokenRequest | null,
	) => void,
) {
	try {
		const response = await fetch("/api/realtime/auth", {
			method: "POST",
			credentials: "same-origin",
			cache: "no-store",
		});
		if (!response.ok) {
			callback(`Push is not available (${response.status}).`, null);
			return;
		}
		callback(null, (await response.json()) as Ably.TokenRequest);
	} catch (error) {
		callback(error instanceof Error ? error.message : String(error), null);
	}
}

function getPushClient(): Ably.Realtime {
	if (!pushClient) {
		pushClient = new Ably.Realtime({
			authCallback,
			autoConnect: false,
			plugins: { Push },
			pushServiceWorkerUrl: SERVICE_WORKER_URL,
		});
	}
	return pushClient;
}

/** Whether this browser can receive web push at all. */
export function pushSupported(): boolean {
	return (
		typeof window !== "undefined" &&
		"serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window
	);
}

/** On iPhone and iPad, web push works only for an app added to the Home Screen. */
export function needsHomeScreenForPush(): boolean {
	if (typeof navigator === "undefined") return false;
	const ios =
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
	const standalone =
		window.matchMedia("(display-mode: standalone)").matches ||
		(navigator as Navigator & { standalone?: boolean }).standalone === true;
	return ios && !standalone;
}

export type PushPermission = "granted" | "denied" | "default" | "unsupported";

export function pushPermission(): PushPermission {
	if (!pushSupported()) return "unsupported";
	return Notification.permission;
}

/** The id Ably gave this browser when it was activated, or null. */
export function localPushDeviceId(): string | null {
	if (!pushSupported()) return null;
	try {
		return getPushClient().device().id ?? null;
	} catch {
		return null;
	}
}

/** The secret that proves to our server that this browser owns its device registration. */
export function localPushDeviceSecret(): string | null {
	if (!pushSupported()) return null;
	try {
		return getPushClient().device().deviceSecret ?? null;
	} catch {
		return null;
	}
}

/**
 * Asks the browser for permission and registers this browser with Ably.
 * Resolves with the device id; rejects with a readable message.
 */
export async function activatePush(): Promise<string> {
	if (!pushSupported()) throw new Error("This browser cannot receive push.");
	if (needsHomeScreenForPush()) {
		throw new Error("Add BBRC to your Home Screen first, then turn push on.");
	}
	const permission =
		Notification.permission === "default"
			? await Notification.requestPermission()
			: Notification.permission;
	if (permission !== "granted") {
		throw new Error(
			"Notifications are blocked for this site. Allow them in your browser settings.",
		);
	}
	const client = getPushClient();
	// This client never connects, so it only learns the member's id by fetching a
	// token. Without it the device is registered with no owner and the server refuses it.
	await client.auth.authorize();
	// Drop any earlier half-finished registration (made before the id was known).
	await client.push.deactivate().catch(() => {});
	if (!client.auth.clientId)
		throw new Error("Could not identify you for push.");
	await client.push.activate();
	const id = client.device().id;
	if (!id) throw new Error("Could not register this device.");
	return id;
}

/** Removes this browser's registration with Ably. */
export async function deactivatePush(): Promise<void> {
	if (!pushSupported()) return;
	try {
		await getPushClient().push.deactivate();
	} catch {
		// Not activated, or already gone: nothing to undo.
	}
}
