"use client";

import {
	arePreferencesDefault,
	lockedModeFor,
	normalizePreferences,
} from "@bbrc/shared";
import { useTheme } from "next-themes";
import { useEffect, useLayoutEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import {
	applyPreferencesToDocument,
	writePreferences,
} from "@/lib/preferences/store";
import {
	useDeviceOnly,
	usePreferences,
} from "@/lib/preferences/use-preferences";
import { client } from "@/utils/orpc";

const PUSH_DELAY_MS = 800;

/**
 * Keeps three things in step, and renders nothing:
 * 1. next-themes follows the light/dark choice (or the palette's locked mode);
 * 2. the account's saved preferences are applied once after sign-in;
 * 3. later changes are pushed to the account, unless "this device only" is on.
 */
export function PreferencesSync() {
	const { data: session } = authClient.useSession();
	const userId = session?.user.id ?? null;
	const preferences = usePreferences();
	const [deviceOnly] = useDeviceOnly();
	const { theme, setTheme } = useTheme();

	const serialized = JSON.stringify(preferences);
	/** What the account already has, so we do not echo it back. */
	const lastSynced = useRef<string | null>(null);
	const hydratedFor = useRef<string | null>(null);

	// Hydration clears the attributes the boot script set; put them back before paint.
	useLayoutEffect(() => {
		applyPreferencesToDocument();
	}, []);

	// 1. Light/dark follows the preference (a locked palette wins).
	useEffect(() => {
		const effective =
			lockedModeFor(preferences.appearance.palette) ??
			preferences.appearance.mode;
		if (theme !== effective) {
			setTheme(effective);
		}
	}, [
		preferences.appearance.palette,
		preferences.appearance.mode,
		theme,
		setTheme,
	]);

	// 2. Load the account's preferences once per sign-in.
	useEffect(() => {
		if (!userId || deviceOnly || hydratedFor.current === userId) {
			return;
		}
		hydratedFor.current = userId;

		let cancelled = false;
		void client.user
			.getMyPreferences()
			.then(({ preferences: saved }) => {
				if (cancelled) {
					return;
				}
				if (saved) {
					const normalized = normalizePreferences(saved);
					lastSynced.current = JSON.stringify(normalized);
					writePreferences(normalized);
				} else {
					// First time on this account: the device's choices become the account's.
					lastSynced.current = null;
				}
			})
			.catch(() => {
				hydratedFor.current = null;
			});

		return () => {
			cancelled = true;
		};
	}, [userId, deviceOnly]);

	useEffect(() => {
		if (!userId) {
			hydratedFor.current = null;
			lastSynced.current = null;
		}
	}, [userId]);

	// 3. Push changes, debounced.
	useEffect(() => {
		if (!userId || deviceOnly || hydratedFor.current !== userId) {
			return;
		}
		if (serialized === lastSynced.current) {
			return;
		}
		if (lastSynced.current == null && arePreferencesDefault(preferences)) {
			return;
		}

		const timer = setTimeout(() => {
			void client.user
				.updateMyPreferences({ preferences: JSON.parse(serialized) })
				.then(() => {
					lastSynced.current = serialized;
				})
				.catch(() => {
					// The device keeps the setting; it syncs on the next change.
				});
		}, PUSH_DELAY_MS);

		return () => clearTimeout(timer);
	}, [serialized, userId, deviceOnly, preferences]);

	return null;
}
