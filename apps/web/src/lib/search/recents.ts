import type { GlobalSearchHit } from "@bbrc/api/modules/search/global-search.schema";

const STORAGE_KEY = "bbrc:search-recents";
const MAX_RECENTS = 5;

export function readRecentHits(): GlobalSearchHit[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return [];
		}
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed)
			? (parsed as GlobalSearchHit[]).filter(
					(hit) =>
						typeof hit?.href === "string" && typeof hit?.title === "string",
				)
			: [];
	} catch {
		return [];
	}
}

export function rememberHit(hit: GlobalSearchHit): void {
	try {
		const next = [
			hit,
			...readRecentHits().filter((entry) => entry.href !== hit.href),
		].slice(0, MAX_RECENTS);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// Private mode or full storage: recents are a convenience only.
	}
}

export function clearRecentHits(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
}
