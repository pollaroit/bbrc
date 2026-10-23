"use client";

import type { UserPreferences } from "@bbrc/shared";
import { useSyncExternalStore } from "react";
import {
	getDeviceOnlySnapshot,
	getPreferencesSnapshot,
	getServerDeviceOnly,
	getServerPreferences,
	subscribePreferences,
	writeDeviceOnly,
	writePreferences,
} from "@/lib/preferences/store";

export function usePreferences(): UserPreferences {
	return useSyncExternalStore(
		subscribePreferences,
		getPreferencesSnapshot,
		getServerPreferences,
	);
}

export function useDeviceOnly(): [boolean, (value: boolean) => void] {
	const value = useSyncExternalStore(
		subscribePreferences,
		getDeviceOnlySnapshot,
		getServerDeviceOnly,
	);
	return [value, writeDeviceOnly];
}

type Section = keyof UserPreferences;

/** Changes one setting, keeping the rest. */
export function updatePreference<
	S extends Section,
	K extends keyof UserPreferences[S],
>(section: S, key: K, value: UserPreferences[S][K]) {
	const snapshot = getPreferencesSnapshot();
	writePreferences({
		...snapshot,
		[section]: { ...snapshot[section], [key]: value },
	});
}
