"use client";

import { openLibraryWorkKeyToOlid, parseTitleList } from "@bbrc/shared";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";

/**
 * A short list of books to go through one by one (browser only: it lives in
 * sessionStorage, so it survives a refresh but not another device).
 *
 * An item is either a book picked from search results (`kind: "work"`, ready to
 * open) or a pasted title (`kind: "title"`), which the page looks up on Open
 * Library when its turn comes.
 *
 * `useBookQueue()` returns:
 * - `items`, `current` (the one being reviewed), `position` (1-based) and `count`
 * - `has(workKey)` / `toggle(work)` for the checkbox on search results
 * - `addTitles(text)` to paste one title per line (returns how many were added)
 * - `remove(id)`, `skip()` (moves the current one to the end), `finish()`
 *   (drops the current one after it was saved), `select(id)`, `clear()`
 */

export type QueueItem =
	| { id: string; kind: "work"; work: OpenLibrarySearchWork }
	| { id: string; kind: "title"; query: string };

type QueueState = { items: QueueItem[]; currentId: string | null };

const STORAGE_KEY = "bbrc:book-queue:v1";
const MAX_ITEMS = 50;
const EMPTY: QueueState = { items: [], currentId: null };

let state: QueueState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
	if (loaded || typeof window === "undefined") return;
	loaded = true;
	try {
		const raw = window.sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw) as Partial<QueueState>;
		if (Array.isArray(parsed.items)) {
			state = {
				items: parsed.items.filter(
					(item): item is QueueItem =>
						Boolean(item) &&
						typeof item.id === "string" &&
						(item.kind === "work" || item.kind === "title"),
				),
				currentId:
					typeof parsed.currentId === "string" ? parsed.currentId : null,
			};
		}
	} catch {
		// Blocked or corrupt storage: start with an empty queue.
	}
}

function commit(next: QueueState) {
	const currentOk = next.items.some((item) => item.id === next.currentId);
	state = {
		items: next.items,
		currentId: currentOk ? next.currentId : (next.items[0]?.id ?? null),
	};
	try {
		window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Storage can be full or blocked; the in-memory queue still works.
	}
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	load();
	listeners.add(listener);
	return () => listeners.delete(listener);
}

const getSnapshot = () => {
	load();
	return state;
};
const getServerSnapshot = () => EMPTY;

let counter = 0;
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function useBookQueue() {
	const snapshot = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot,
	);

	const workKeys = useMemo(() => {
		const keys = new Set<string>();
		for (const item of snapshot.items) {
			if (item.kind === "work") keys.add(item.work.workKey);
		}
		return keys;
	}, [snapshot.items]);

	const has = useCallback(
		(workKey: string) => workKeys.has(workKey),
		[workKeys],
	);

	const toggle = useCallback((work: OpenLibrarySearchWork) => {
		const existing = state.items.find(
			(item) => item.kind === "work" && item.work.workKey === work.workKey,
		);
		if (existing) {
			commit({
				...state,
				items: state.items.filter((item) => item.id !== existing.id),
			});
			return;
		}
		if (state.items.length >= MAX_ITEMS) return;
		commit({
			...state,
			items: [...state.items, { id: newId(), kind: "work", work }],
		});
	}, []);

	const addTitles = useCallback((text: string) => {
		const room = MAX_ITEMS - state.items.length;
		const known = new Set(
			state.items.map((item) =>
				item.kind === "title"
					? item.query.toLowerCase()
					: item.work.title.toLowerCase(),
			),
		);
		const added = parseTitleList(text, room)
			.filter((title) => !known.has(title.toLowerCase()))
			.map((query): QueueItem => ({ id: newId(), kind: "title", query }));
		if (added.length > 0) {
			commit({ ...state, items: [...state.items, ...added] });
		}
		return added.length;
	}, []);

	const remove = useCallback((id: string) => {
		commit({ ...state, items: state.items.filter((item) => item.id !== id) });
	}, []);

	const select = useCallback((id: string) => {
		if (state.items.some((item) => item.id === id)) {
			commit({ ...state, currentId: id });
		}
	}, []);

	/** Puts the current book at the end and moves on to the next one. */
	const skip = useCallback(() => {
		const index = state.items.findIndex((item) => item.id === state.currentId);
		if (index === -1 || state.items.length < 2) return;
		const [item] = state.items.slice(index, index + 1);
		const rest = state.items.filter((_, position) => position !== index);
		const next = rest[index] ?? rest[0];
		commit({
			items: [...rest, item as QueueItem],
			currentId: next?.id ?? null,
		});
	}, []);

	/** The current book is done (saved): drop it and move on. */
	const finish = useCallback(() => {
		const index = state.items.findIndex((item) => item.id === state.currentId);
		if (index === -1) return;
		const rest = state.items.filter((_, position) => position !== index);
		commit({ items: rest, currentId: rest[index]?.id ?? rest[0]?.id ?? null });
	}, []);

	const clear = useCallback(() => commit(EMPTY), []);

	const index = snapshot.items.findIndex(
		(item) => item.id === snapshot.currentId,
	);
	const current = index >= 0 ? (snapshot.items[index] ?? null) : null;

	return {
		items: snapshot.items,
		current,
		/** 1-based place of the current book, 0 when the queue is empty. */
		position: index >= 0 ? index + 1 : 0,
		count: snapshot.items.length,
		has,
		toggle,
		addTitles,
		remove,
		select,
		skip,
		finish,
		clear,
	};
}

export type BookQueue = ReturnType<typeof useBookQueue>;

/** The Open Library id of a queued book, when it is already a picked work. */
export function queueItemOlid(item: QueueItem): string | null {
	return item.kind === "work"
		? openLibraryWorkKeyToOlid(item.work.workKey)
		: null;
}
