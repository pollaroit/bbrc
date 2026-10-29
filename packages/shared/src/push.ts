/*
 * Push notifications: what a push looks like. Pure, so the server that sends it,
 * the service worker that shows it and the tests agree.
 */

export const PUSH_TITLE_MAX = 80;
export const PUSH_BODY_MAX = 180;

/** The page a push opens when its notification has no link of its own. */
export const PUSH_FALLBACK_HREF = "/notifications";

export type PushPayloadInput = {
	/** The notification's id, so a repeat replaces the earlier one and the app can find it. */
	notificationId: string;
	kind: string;
	title: string;
	body: string;
	/** A path on the site (`/sittings/x`) or a full address; empty means the notifications page. */
	href?: string | null;
};

function clip(text: string, max: number): string {
	const clean = text.replace(/\s+/g, " ").trim();
	return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** A link that stays on this site: a path, or an address on the same origin. Anything else becomes the notifications page. */
export function safePushHref(
	href: string | null | undefined,
	origin: string,
): string {
	const value = href?.trim();
	if (!value) return PUSH_FALLBACK_HREF;
	if (value.startsWith("/") && !value.startsWith("//")) return value;
	try {
		const url = new URL(value);
		if (url.origin === origin) return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		// Not an address: fall through.
	}
	return PUSH_FALLBACK_HREF;
}

/**
 * The payload sent to Ably for one member. `data.url` is a path on this site;
 * the service worker opens it when the notification is tapped.
 */
export function buildPushPayload(input: PushPayloadInput, origin: string) {
	return {
		notification: {
			title: clip(input.title, PUSH_TITLE_MAX),
			body: clip(input.body, PUSH_BODY_MAX),
		},
		data: {
			id: input.notificationId,
			kind: input.kind,
			url: safePushHref(input.href, origin),
		},
		web: {
			// One notification per id: a retry never shows twice.
			tag: input.notificationId,
			icon: "/web-app-manifest-192x192.png",
			badge: "/web-app-manifest-192x192.png",
		},
	};
}

export type PushPayload = ReturnType<typeof buildPushPayload>;

/** A short, honest name for a device, from its user agent, for the settings list. */
export function describeDevice(userAgent: string): string {
	const ua = userAgent || "";
	const browser = /Edg\//.test(ua)
		? "Edge"
		: /OPR\/|Opera/.test(ua)
			? "Opera"
			: /Firefox\//.test(ua)
				? "Firefox"
				: /Chrome\/|CriOS\//.test(ua)
					? "Chrome"
					: /Safari\//.test(ua)
						? "Safari"
						: "Browser";
	const system = /iPhone|iPad|iPod/.test(ua)
		? "iPhone or iPad"
		: /Android/.test(ua)
			? "Android"
			: /Windows/.test(ua)
				? "Windows"
				: /Mac OS X|Macintosh/.test(ua)
					? "macOS"
					: /Linux|X11/.test(ua)
						? "Linux"
						: "";
	return system ? `${browser} on ${system}` : browser;
}
