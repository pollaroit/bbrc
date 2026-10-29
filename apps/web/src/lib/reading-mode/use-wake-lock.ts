"use client";

import { useEffect } from "react";

/**
 * Keeps the screen on while `active`. The browser drops the lock whenever the
 * page is hidden, so it is asked for again when the page comes back.
 */
export function useWakeLock(active: boolean) {
	useEffect(() => {
		if (!active || typeof navigator === "undefined" || !navigator.wakeLock) {
			return;
		}
		let sentinel: WakeLockSentinel | null = null;
		let cancelled = false;

		async function acquire() {
			if (cancelled || document.visibilityState !== "visible") return;
			try {
				sentinel = await navigator.wakeLock.request("screen");
			} catch {
				// Low battery or not allowed: the timer still works.
			}
		}

		void acquire();
		const onVisible = () => {
			if (document.visibilityState === "visible") void acquire();
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			cancelled = true;
			document.removeEventListener("visibilitychange", onVisible);
			void sentinel?.release().catch(() => undefined);
		};
	}, [active]);
}
