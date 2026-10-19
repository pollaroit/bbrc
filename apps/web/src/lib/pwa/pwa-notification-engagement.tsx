"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import { playNotificationChime } from "@/lib/pwa/play-notification-chime";
import { readPwaEngagementPreferences } from "@/lib/pwa/pwa-engagement-storage";
import { orpc } from "@/utils/orpc";

function showSystemAlert(unread: number) {
	if (!("Notification" in window) || Notification.permission !== "granted") {
		return;
	}

	const body =
		unread === 1
			? "You have a new alert in the bell menu."
			: `You have ${unread} unread alerts in the bell menu.`;

	try {
		const notification = new Notification("BBRC", {
			body,
			tag: "bbrc-unread",
		});
		notification.onclick = () => {
			window.focus();
			notification.close();
		};
	} catch {
		// unsupported in this context
	}
}

export function PwaNotificationEngagement() {
	const { data: session } = authClient.useSession();
	const previousUnread = useRef<number | null>(null);

	const unreadQuery = useQuery({
		...orpc.notification.getUnreadCount.queryOptions(),
		enabled: Boolean(session?.user),
		refetchInterval: 60_000,
	});

	useEffect(() => {
		const unread = unreadQuery.data?.count;
		if (unread === undefined) {
			return;
		}

		const previous = previousUnread.current;
		previousUnread.current = unread;

		if (previous === null || unread <= previous) {
			return;
		}

		const prefs = readPwaEngagementPreferences();
		const hidden = document.visibilityState !== "visible";

		if (prefs.soundsEnabled) {
			playNotificationChime();
		}

		if (prefs.systemAlertsEnabled && hidden) {
			showSystemAlert(unread);
		}
	}, [unreadQuery.data?.count]);

	return null;
}
