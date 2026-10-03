"use client";

import { useEffect, useState } from "react";

const AVATAR_UPDATED = "bbrc-avatar-updated";

export function broadcastAvatarUpdated(imageUrl: string) {
	if (typeof window === "undefined") {
		return;
	}
	window.dispatchEvent(
		new CustomEvent<string>(AVATAR_UPDATED, { detail: imageUrl }),
	);
}

export function broadcastAvatarCleared() {
	if (typeof window === "undefined") {
		return;
	}
	window.dispatchEvent(
		new CustomEvent<string | null>(AVATAR_UPDATED, { detail: null }),
	);
}

/** Client session can lag after avatar upload; merge broadcast updates into header UI. */
export function useLiveUserImage(sessionImage: string | null | undefined) {
	const [override, setOverride] = useState<string | null | undefined>(
		undefined,
	);

	useEffect(() => {
		setOverride(undefined);
	}, [sessionImage]);

	useEffect(() => {
		function onAvatarUpdated(event: Event) {
			const detail = (event as CustomEvent<string | null>).detail;
			setOverride(detail ?? null);
		}
		window.addEventListener(AVATAR_UPDATED, onAvatarUpdated);
		return () => window.removeEventListener(AVATAR_UPDATED, onAvatarUpdated);
	}, []);

	if (override !== undefined) {
		return override;
	}
	return sessionImage ?? null;
}
