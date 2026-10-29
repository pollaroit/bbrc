import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("message", (event) => {
	if (event.data?.type === "SKIP_WAITING") {
		void self.skipWaiting();
	}
});

type PushData = {
	notification?: { title?: string; body?: string };
	data?: { id?: string; kind?: string; url?: string };
	web?: { tag?: string; icon?: string; badge?: string };
};

self.addEventListener("push", (event) => {
	let payload: PushData = {};
	try {
		payload = (event.data?.json() ?? {}) as PushData;
	} catch {
		// A push without a readable body still shows something below.
	}
	const title = payload.notification?.title || "BBRC";
	event.waitUntil(
		self.registration.showNotification(title, {
			body: payload.notification?.body,
			icon: payload.web?.icon ?? "/web-app-manifest-192x192.png",
			badge: payload.web?.badge,
			tag: payload.web?.tag ?? payload.data?.id,
			data: { url: payload.data?.url ?? "/notifications" },
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const path = (event.notification.data as { url?: string } | null)?.url;
	const target = new URL(
		path?.startsWith("/") && !path.startsWith("//") ? path : "/notifications",
		self.location.origin,
	).href;
	event.waitUntil(
		(async () => {
			const windows = await self.clients.matchAll({
				type: "window",
				includeUncontrolled: true,
			});
			for (const client of windows) {
				if (new URL(client.url).origin === self.location.origin) {
					await client.focus();
					if ("navigate" in client) await client.navigate(target);
					return;
				}
			}
			await self.clients.openWindow(target);
		})(),
	);
});

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	skipWaiting: false,
	clientsClaim: true,
	navigationPreload: true,
	runtimeCaching: defaultCache,
	fallbacks: {
		entries: [
			{
				url: "/~offline",
				matcher({ request }) {
					return request.destination === "document";
				},
			},
		],
	},
});

serwist.addEventListeners();
