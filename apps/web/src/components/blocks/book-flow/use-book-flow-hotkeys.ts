"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Keyboard shortcuts for the add / request / edit book flow.
 *
 * One typed list drives everything: the key listener, the hint bar, the `?`
 * cheat sheet and the little key chips on buttons.
 *
 * Collision rules (so nothing steals a key from the browser or from the rest of
 * the app, which already uses `D` for the theme, `Ctrl/⌘ K` for search and a few
 * Ctrl/⌘ keys inside the rich text editor):
 * - Single keys (`/`, `[`, `]`, `?`, arrows, Enter) only act when you are not
 *   typing in a field, no dialog or menu is open, and no Ctrl/⌘/Alt is held.
 * - The only Ctrl/⌘ combos are Enter and Shift+Enter, which no browser uses.
 * - Held-down keys (auto repeat) and IME composition are ignored.
 */

export type BookFlowHotkeyId =
	| "focusSearch"
	| "moveDown"
	| "moveUp"
	| "pick"
	| "previousBook"
	| "nextBook"
	| "back"
	| "save"
	| "saveNext"
	| "help";

/** Where a shortcut is useful. `anywhere` shortcuts work in both. */
export type BookFlowStage = "finder" | "form";

type KeyToken = "Mod" | "Shift" | "Enter" | "Esc" | "Up" | "Down" | string;

export type BookFlowHotkey = {
	id: BookFlowHotkeyId;
	/** Key chips in order. `Mod` shows as ⌘ on Mac and Ctrl elsewhere. */
	keys: KeyToken[];
	label: string;
	description: string;
	stage: BookFlowStage | "anywhere";
};

export const BOOK_FLOW_HOTKEYS: readonly BookFlowHotkey[] = [
	{
		id: "focusSearch",
		keys: ["/"],
		label: "Search",
		description: "Jump to the search box",
		stage: "anywhere",
	},
	{
		id: "moveDown",
		keys: ["Down"],
		label: "Next result",
		description: "Move down the search results",
		stage: "finder",
	},
	{
		id: "moveUp",
		keys: ["Up"],
		label: "Previous result",
		description: "Move up the search results",
		stage: "finder",
	},
	{
		id: "pick",
		keys: ["Enter"],
		label: "Pick",
		description: "Choose the highlighted book",
		stage: "finder",
	},
	{
		id: "previousBook",
		keys: ["["],
		label: "Previous book",
		description: "Switch to the previous search result",
		stage: "form",
	},
	{
		id: "nextBook",
		keys: ["]"],
		label: "Next book",
		description: "Switch to the next search result",
		stage: "form",
	},
	{
		id: "save",
		keys: ["Mod", "Enter"],
		label: "Save",
		description: "Save this book",
		stage: "form",
	},
	{
		id: "saveNext",
		keys: ["Mod", "Shift", "Enter"],
		label: "Save and next",
		description: "Save this book and move on to the next one",
		stage: "form",
	},
	{
		id: "back",
		keys: ["Esc"],
		label: "Back to search",
		description: "Leave the form (closes a dialog first)",
		stage: "anywhere",
	},
	{
		id: "help",
		keys: ["?"],
		label: "Shortcuts",
		description: "Show this list",
		stage: "anywhere",
	},
] as const;

const HOTKEY_BY_ID = new Map(
	BOOK_FLOW_HOTKEYS.map((hotkey) => [hotkey.id, hotkey]),
);

export function getBookFlowHotkey(id: BookFlowHotkeyId): BookFlowHotkey {
	return HOTKEY_BY_ID.get(id) as BookFlowHotkey;
}

/** The key chips for one shortcut, with the right symbols for the platform. */
export function formatBookFlowHotkey(
	id: BookFlowHotkeyId,
	isMac: boolean,
): string[] {
	return getBookFlowHotkey(id).keys.map((token) => {
		switch (token) {
			case "Mod":
				return isMac ? "⌘" : "Ctrl";
			case "Shift":
				return isMac ? "⇧" : "Shift";
			case "Enter":
				return isMac ? "↵" : "Enter";
			case "Up":
				return "↑";
			case "Down":
				return "↓";
			default:
				return token;
		}
	});
}

export function hotkeysForStage(stage: BookFlowStage): BookFlowHotkey[] {
	return BOOK_FLOW_HOTKEYS.filter(
		(hotkey) => hotkey.stage === stage || hotkey.stage === "anywhere",
	);
}

// ── Platform checks (client only, no hydration mismatch) ───────────────────

const noopSubscribe = () => () => {};

export function useIsMac(): boolean {
	return useSyncExternalStore(
		noopSubscribe,
		() =>
			/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent),
		() => false,
	);
}

/** True on devices with a hovering pointer, i.e. a mouse (hints are pointless on touch). */
export function useHasKeyboard(): boolean {
	return useSyncExternalStore(
		noopSubscribe,
		() => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
		() => false,
	);
}

// ── The listener ───────────────────────────────────────────────────────────

export type BookFlowHotkeyHandlers = Partial<
	Record<BookFlowHotkeyId, () => void>
>;

type UseBookFlowHotkeysOptions = {
	stage: BookFlowStage;
	/** Turn every shortcut off (for example while a blocking dialog is open). */
	enabled?: boolean;
};

const TYPING_SELECTOR =
	'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
/** Natively activated by Enter/Space; let the browser do that. */
const INTERACTIVE_SELECTOR =
	'button, a[href], summary, [role="button"], [role="tab"], [role="menuitem"]';
/** Anything that is open on top of the page. Listboxes are not counted: the search box uses one. */
const OVERLAY_SELECTOR =
	'[role="dialog"], [role="alertdialog"], [role="menu"], [data-slot="popover-content"]';
/** The search box (and the list under it) opt in to arrows and Enter. */
const SEARCH_SELECTOR = "[data-book-flow-search]";

function asElement(target: EventTarget | null): Element | null {
	return target instanceof Element ? target : null;
}

export function isTypingTarget(target: EventTarget | null): boolean {
	const element = asElement(target);
	return element?.closest(TYPING_SELECTOR) != null;
}

function isOverlayOpen(): boolean {
	return document.querySelector(OVERLAY_SELECTOR) != null;
}

/**
 * Listens for the book-flow shortcuts and calls the matching handler. Handlers
 * are read through a ref, so passing new functions on every render is fine.
 */
export function useBookFlowHotkeys(
	handlers: BookFlowHotkeyHandlers,
	{ stage, enabled = true }: UseBookFlowHotkeysOptions,
) {
	const handlersRef = useRef(handlers);
	handlersRef.current = handlers;

	useEffect(() => {
		if (!enabled) return;

		function run(id: BookFlowHotkeyId, event: KeyboardEvent): boolean {
			const handler = handlersRef.current[id];
			if (!handler) return false;
			event.preventDefault();
			handler();
			return true;
		}

		function onKeyDown(event: KeyboardEvent) {
			if (
				event.defaultPrevented ||
				event.isComposing ||
				event.keyCode === 229
			) {
				return;
			}

			const target = asElement(event.target);
			const typing = isTypingTarget(event.target);
			const inSearch = target?.closest(SEARCH_SELECTOR) != null;
			const overlay = isOverlayOpen();
			// ⌘ on Mac, Ctrl elsewhere (never both, never the other one).
			const mod = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || "")
				? event.metaKey && !event.ctrlKey
				: event.ctrlKey && !event.metaKey;

			// Save / save and next: work from inside fields, never while a dialog is open.
			if (event.key === "Enter" && mod && !event.altKey) {
				if (overlay || event.repeat || stage !== "form") return;
				run(event.shiftKey ? "saveNext" : "save", event);
				return;
			}

			// Esc: dialogs and menus close themselves first.
			if (event.key === "Escape") {
				if (overlay) return;
				run("back", event);
				return;
			}

			// Everything below is a plain key.
			if (event.ctrlKey || event.metaKey || event.altKey || overlay) return;

			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				if (stage !== "finder" || (typing && !inSearch)) return;
				if (!typing && target?.closest(INTERACTIVE_SELECTOR)) {
					// Arrow keys on a focused result button still move the highlight.
					if (!target.closest("[data-book-flow-results]")) return;
				}
				run(event.key === "ArrowDown" ? "moveDown" : "moveUp", event);
				return;
			}

			if (event.key === "Enter") {
				if (stage !== "finder" || event.repeat || event.shiftKey) return;
				// A focused button or link handles Enter itself.
				if (target?.closest(INTERACTIVE_SELECTOR)) return;
				if (typing && !inSearch) return;
				run("pick", event);
				return;
			}

			if (typing) return;
			if (event.repeat) return;

			if (event.key === "/") {
				run("focusSearch", event);
			} else if (event.key === "?") {
				run("help", event);
			} else if (event.key === "[" && stage === "form") {
				run("previousBook", event);
			} else if (event.key === "]" && stage === "form") {
				run("nextBook", event);
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [enabled, stage]);
}
