const STORAGE_KEY = "bbrc:fact-seen:v1";
const MAX_IDS = 400;

export function readGuestSeenFactIds(): string[] {
	if (typeof window === "undefined") {
		return [];
	}

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed.filter((id): id is string => typeof id === "string");
	} catch {
		return [];
	}
}

export function rememberGuestSeenFactId(factId: string): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		const current = readGuestSeenFactIds().filter((id) => id !== factId);
		current.push(factId);
		const trimmed =
			current.length > MAX_IDS
				? current.slice(current.length - MAX_IDS)
				: current;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
	} catch {
		// private mode / quota
	}
}
