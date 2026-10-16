export type SpoilerContentKind = "post" | "comment" | "feedback";

const STORAGE_KEY = "revealed_spoiler";
/** Oldest entries drop first when the list grows past this size. */
export const SPOILER_REVEAL_STORAGE_MAX_ITEMS = 50;

export function spoilerRevealStorageKey(
	username: string,
	kind: SpoilerContentKind,
	identifier: string,
): string {
	return `${username}:${kind}:${identifier}`;
}

function readRevealedKeys(): string[] {
	if (typeof localStorage === "undefined") {
		return [];
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return [];
		}
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}
		return parsed.filter((item): item is string => typeof item === "string");
	} catch {
		return [];
	}
}

function writeRevealedKeys(keys: string[]) {
	if (typeof localStorage === "undefined") {
		return;
	}
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
	} catch {
		// private browsing / quota
	}
}

export function isSpoilerRevealed(
	username: string | null | undefined,
	kind: SpoilerContentKind,
	identifier: string,
): boolean {
	if (!username) {
		return false;
	}
	const key = spoilerRevealStorageKey(username, kind, identifier);
	return readRevealedKeys().includes(key);
}

export function markSpoilerRevealed(
	username: string,
	kind: SpoilerContentKind,
	identifier: string,
): void {
	const key = spoilerRevealStorageKey(username, kind, identifier);
	const keys = readRevealedKeys();
	if (keys.includes(key)) {
		return;
	}
	const next = [...keys, key];
	if (next.length > SPOILER_REVEAL_STORAGE_MAX_ITEMS) {
		writeRevealedKeys(next.slice(-SPOILER_REVEAL_STORAGE_MAX_ITEMS));
		return;
	}
	writeRevealedKeys(next);
}
