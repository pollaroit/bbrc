import { parseTimerState, type TimerState } from "@bbrc/shared";

/*
 * What Reading Mode keeps in this browser so a reload, a killed installed app
 * or a phone that slept can pick the session up again. It is only a
 * convenience: the server holds the saved reading time.
 */

export type SavedSession = {
	sessionId: string;
	timer: TimerState;
};

const key = (readingId: string) => `bbrc:reading-mode:${readingId}`;
const PREFS_KEY = "bbrc:reading-mode:prefs";

export function loadSavedSession(readingId: string): SavedSession | null {
	try {
		const raw = window.localStorage.getItem(key(readingId));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const timer = parseTimerState(parsed.timer);
		if (!timer || typeof parsed.sessionId !== "string") return null;
		return { sessionId: parsed.sessionId, timer };
	} catch {
		return null;
	}
}

export function saveSession(readingId: string, saved: SavedSession) {
	try {
		window.localStorage.setItem(key(readingId), JSON.stringify(saved));
	} catch {
		// Private windows or full storage: the server copy still has the time.
	}
}

export function clearSavedSession(readingId: string) {
	try {
		window.localStorage.removeItem(key(readingId));
	} catch {
		// Nothing to clear.
	}
}

export type ModePrefs = {
	mode: "free" | "countdown" | "pomodoro";
	countdownMinutes: number;
	workMinutes: number;
	breakMinutes: number;
	dim: boolean;
};

export const DEFAULT_MODE_PREFS: ModePrefs = {
	mode: "free",
	countdownMinutes: 30,
	workMinutes: 25,
	breakMinutes: 5,
	dim: false,
};

export function loadModePrefs(): ModePrefs {
	try {
		const raw = window.localStorage.getItem(PREFS_KEY);
		if (!raw) return DEFAULT_MODE_PREFS;
		return {
			...DEFAULT_MODE_PREFS,
			...(JSON.parse(raw) as Partial<ModePrefs>),
		};
	} catch {
		return DEFAULT_MODE_PREFS;
	}
}

export function saveModePrefs(prefs: ModePrefs) {
	try {
		window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
	} catch {
		// A convenience only.
	}
}
