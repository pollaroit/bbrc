"use client";

import { notifyChannel } from "@bbrc/shared";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { playNotificationChime } from "@/lib/pwa/play-notification-chime";
import { readPwaEngagementPreferences } from "@/lib/pwa/pwa-engagement-storage";
import { acquireRealtime, getRealtimeClient } from "@/lib/realtime/client";
import { useRealtimeState } from "@/lib/realtime/use-realtime";
import { orpc, queryClient } from "@/utils/orpc";

type LiveNotification = {
	notification: {
		id: string;
		kind: string;
		title: string;
		body: string;
		href: string | null;
	};
	unreadCount: number;
};

/** Polling is only the safety net: fast when realtime is down, rare when it is up. */
const POLL_WITHOUT_REALTIME_MS = 60_000;
const POLL_WITH_REALTIME_MS = 5 * 60_000;

/**
 * Keeps the bell and the notification list live for a signed-in member: a new
 * notification arrives on their private channel, shows as a toast and updates
 * the count; the count also follows reads made on another screen. If realtime
 * is unavailable the count is polled instead.
 */
export function PwaNotificationEngagement() {
	const { data: session } = authClient.useSession();
	const router = useRouter();
	const signedIn = Boolean(session?.user);
	const realtime = useRealtimeState();
	const live = realtime === "connected";

	useQuery({
		...orpc.notification.getUnreadCount.queryOptions(),
		enabled: signedIn,
		refetchInterval: live ? POLL_WITH_REALTIME_MS : POLL_WITHOUT_REALTIME_MS,
	});

	useEffect(() => {
		if (!signedIn) return;
		const release = acquireRealtime();
		const client = getRealtimeClient();
		if (!client) return release;

		const unreadKey = orpc.notification.getUnreadCount.queryKey();
		const listKey = orpc.notification.getNotificationList.key();
		let channel: ReturnType<typeof client.channels.get> | null = null;

		const onNotification = (message: { data?: unknown }) => {
			const data = message.data as LiveNotification | undefined;
			if (!data?.notification) return;
			queryClient.setQueryData(unreadKey, { count: data.unreadCount });
			void queryClient.invalidateQueries({ queryKey: listKey });

			const prefs = readPwaEngagementPreferences();
			if (prefs.soundsEnabled) playNotificationChime();

			const { id, title, body, href } = data.notification;
			toast(title, {
				id,
				description: body,
				action: href
					? { label: "Open", onClick: () => router.push(href as Route) }
					: undefined,
			});
		};

		const onUnread = (message: { data?: unknown }) => {
			const data = message.data as { count?: number } | undefined;
			if (typeof data?.count !== "number") return;
			queryClient.setQueryData(unreadKey, { count: data.count });
			void queryClient.invalidateQueries({ queryKey: listKey });
		};

		function subscribe() {
			const clientId = client?.auth.clientId;
			if (!client || !clientId || channel) return;
			channel = client.channels.get(notifyChannel(clientId));
			channel.subscribe("notification", onNotification).catch(() => {});
			channel.subscribe("unread", onUnread).catch(() => {});
		}

		// The member's id is known once the first token has been issued.
		if (client.connection.state === "connected") subscribe();
		const onConnection = (change: { current: string; previous: string }) => {
			if (change.current === "connected") {
				subscribe();
				// Anything missed while disconnected: ask once.
				if (change.previous !== "connected") {
					void queryClient.invalidateQueries({ queryKey: unreadKey });
				}
			}
		};
		client.connection.on(onConnection);

		return () => {
			client.connection.off(onConnection);
			channel?.unsubscribe("notification", onNotification);
			channel?.unsubscribe("unread", onUnread);
			release();
		};
	}, [signedIn, router]);

	return null;
}
