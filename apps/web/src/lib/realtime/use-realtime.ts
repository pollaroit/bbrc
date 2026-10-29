"use client";

import { readingChannel, uniquePresentIds } from "@bbrc/shared";
import type * as Ably from "ably";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
	acquireRealtime,
	getRealtimeClient,
	realtimeStateSnapshot,
	reauthorizeRealtime,
	subscribeRealtimeState,
} from "@/lib/realtime/client";

/** The connection's state: "idle", "connecting", "connected", "closed" or "unavailable". */
export function useRealtimeState(): string {
	return useSyncExternalStore(
		subscribeRealtimeState,
		realtimeStateSnapshot,
		() => "idle",
	);
}

/**
 * Who is on a book's reading channel right now, as opaque ids (the same member
 * on two devices counts once). `ids` is null while realtime is not live (not
 * connected yet, closed, or not available), so the caller falls back to asking
 * the server. `selfId` is this member's own id, to leave themselves out.
 */
export function useLivePresence(bookSlug: string, enabled: boolean) {
	const [ids, setIds] = useState<string[] | null>(null);
	const [selfId, setSelfId] = useState<string | null>(null);

	useEffect(() => {
		if (!enabled) {
			setIds(null);
			return;
		}
		const release = acquireRealtime();
		const client = getRealtimeClient();
		if (!client) {
			setIds(null);
			return release;
		}

		const channel = client.channels.get(readingChannel(bookSlug));
		let cancelled = false;

		async function sync() {
			try {
				const members = await channel.presence.get();
				if (cancelled) return;
				setIds(uniquePresentIds(members));
				setSelfId(client?.auth.clientId ?? null);
			} catch {
				if (!cancelled) setIds(null);
			}
		}

		const onPresence = () => void sync();
		channel.presence.subscribe(onPresence).catch(() => {
			if (!cancelled) setIds(null);
		});

		const onConnection = (change: Ably.ConnectionStateChange) => {
			if (change.current === "connected") {
				// After a closed connection the channel has to be attached again.
				void channel
					.attach()
					.then(sync)
					.catch(() => {
						if (!cancelled) setIds(null);
					});
			} else if (
				change.current === "closed" ||
				change.current === "failed" ||
				change.current === "suspended"
			) {
				if (!cancelled) setIds(null);
			}
		};
		client.connection.on(onConnection);
		if (client.connection.state === "connected") void sync();

		return () => {
			cancelled = true;
			channel.presence.unsubscribe(onPresence);
			client.connection.off(onConnection);
			release();
		};
	}, [bookSlug, enabled]);

	return { ids, selfId };
}

/**
 * Appears as "reading" on a book's channel while `active` (an open Reading Mode
 * session). The token is renewed first, so the server grants presence for this
 * book (it reads the open session from the database). If that is refused, or
 * realtime is off, nothing breaks: the page just is not shown live to others.
 */
export function useEnterReadingPresence(bookSlug: string, active: boolean) {
	useEffect(() => {
		if (!active) return;
		// A running session keeps the connection open even when the tab is hidden.
		const release = acquireRealtime({ keepAlive: true });
		const client = getRealtimeClient();
		if (!client) return release;

		const channel = client.channels.get(readingChannel(bookSlug));
		let cancelled = false;
		let entered = false;

		async function enter() {
			try {
				await reauthorizeRealtime();
				if (cancelled) return;
				await channel.presence.enter();
				entered = true;
			} catch {
				// Refused or offline: the page keeps working without being shown live.
			}
		}

		const onConnection = (change: Ably.ConnectionStateChange) => {
			if (change.current === "connected" && !cancelled) void enter();
		};
		client.connection.on(onConnection);
		if (client.connection.state === "connected") void enter();

		return () => {
			cancelled = true;
			client.connection.off(onConnection);
			if (entered && client.connection.state === "connected") {
				void channel.presence.leave().catch(() => undefined);
			}
			release();
		};
	}, [bookSlug, active]);
}
