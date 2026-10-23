import {
	DEFAULT_PREFERENCES,
	normalizePreferences,
	PREFERENCES_DEVICE_ONLY_KEY,
	PREFERENCES_STORAGE_KEY,
	preferenceAttributes,
	type UserPreferences,
} from "@bbrc/shared";

/**
 * Preferences live in localStorage so they apply instantly and work for
 * visitors; signed-in members also sync them to their account (see
 * `PreferencesSync`). Components read them with `useSyncExternalStore`, which
 * keeps server and first client render identical (the defaults).
 */

let current: UserPreferences | null = null;
let deviceOnly: boolean | null = null;
const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

function readStored(): UserPreferences {
	try {
		const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
		return raw ? normalizePreferences(JSON.parse(raw)) : DEFAULT_PREFERENCES;
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

export function getPreferencesSnapshot(): UserPreferences {
	if (typeof window === "undefined") {
		return DEFAULT_PREFERENCES;
	}
	current ??= readStored();
	return current;
}

export function getServerPreferences(): UserPreferences {
	return DEFAULT_PREFERENCES;
}

/**
 * React wipes unknown attributes on `<html>` when the page hydrates, so the
 * boot script's work is repeated from the store right after hydration
 * (see `PreferencesSync`, which calls this in a layout effect, before paint).
 */
export function applyPreferencesToDocument() {
	applyToDocument(getPreferencesSnapshot());
}

function applyToDocument(preferences: UserPreferences) {
	for (const [name, value] of Object.entries(
		preferenceAttributes(preferences),
	)) {
		document.documentElement.setAttribute(name, value);
	}
}

export function subscribePreferences(listener: () => void): () => void {
	listeners.add(listener);

	let onStorage: ((event: StorageEvent) => void) | null = null;
	if (listeners.size === 1 && typeof window !== "undefined") {
		onStorage = (event) => {
			if (
				event.key === PREFERENCES_STORAGE_KEY ||
				event.key === PREFERENCES_DEVICE_ONLY_KEY
			) {
				current = readStored();
				deviceOnly = null;
				applyToDocument(current);
				notify();
			}
		};
		window.addEventListener("storage", onStorage);
	}

	return () => {
		listeners.delete(listener);
		if (onStorage) {
			window.removeEventListener("storage", onStorage);
		}
	};
}

/** Saves a full preference set, applies it to the page and tells subscribers. */
export function writePreferences(next: UserPreferences) {
	const normalized = normalizePreferences(next);
	if (JSON.stringify(normalized) === JSON.stringify(getPreferencesSnapshot())) {
		return;
	}

	current = normalized;
	try {
		localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
	} catch {
		// Private mode or full storage: the choice still applies for this visit.
	}
	applyToDocument(normalized);
	notify();
}

export function getDeviceOnlySnapshot(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	if (deviceOnly == null) {
		try {
			deviceOnly = localStorage.getItem(PREFERENCES_DEVICE_ONLY_KEY) === "1";
		} catch {
			deviceOnly = false;
		}
	}
	return deviceOnly;
}

export function getServerDeviceOnly(): boolean {
	return false;
}

export function writeDeviceOnly(value: boolean) {
	deviceOnly = value;
	try {
		if (value) {
			localStorage.setItem(PREFERENCES_DEVICE_ONLY_KEY, "1");
		} else {
			localStorage.removeItem(PREFERENCES_DEVICE_ONLY_KEY);
		}
	} catch {
		// ignore
	}
	notify();
}
