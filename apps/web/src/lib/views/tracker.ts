import { stripLocalePrefix } from "@bbrc/i18n";
import {
	VIEW_BATCH_MAX,
	VIEW_DEDUPE_MS,
	type ViewKindName,
	type ViewResourceKind,
	type ViewSourceName,
	viewSourceFrom,
} from "@bbrc/shared";

/**
 * Browser side of view tracking. Views are queued, de-duplicated for the whole
 * browser session (so moving between tabs of a book or profile sends nothing),
 * and sent in small batches to `POST /api/views`. Nothing here may ever throw.
 */

type QueuedView = {
	resource: ViewResourceKind;
	ref: string;
	kind: ViewKindName;
	source: ViewSourceName;
};

const VISITOR_KEY = "bbrc_vid";
const SENT_KEY = "bbrc_views_sent";
const FLUSH_DELAY_MS = 2000;

let queue: QueuedView[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let memoryVisitorId: string | null = null;
let sent: Map<string, number> | null = null;
let listenersAttached = false;

// ── Navigation state (set by ViewsProvider) ────────────────────────────────

const navigation: {
	currentPath: string | null;
	previousPath: string | null;
	referrerHost: string | null;
	started: boolean;
} = {
	currentPath: null,
	previousPath: null,
	referrerHost: null,
	started: false,
};

/** Called on every in-app route change. The first call is the page load. */
export function noteNavigation(rawPathname: string) {
	if (typeof window === "undefined") return;
	// A page in another language is the same page: `/az/books/x` counts as `/books/x`.
	const pathname = stripLocalePrefix(rawPathname);
	if (!navigation.started) {
		navigation.started = true;
		navigation.currentPath = pathname;
		navigation.previousPath = null;
		try {
			const host = document.referrer ? new URL(document.referrer).host : "";
			navigation.referrerHost = host && host !== location.host ? host : null;
		} catch {
			navigation.referrerHost = null;
		}
		return;
	}
	if (pathname === navigation.currentPath) return;
	navigation.previousPath = navigation.currentPath;
	navigation.currentPath = pathname;
	navigation.referrerHost = null;
}

function currentSource(): ViewSourceName {
	return viewSourceFrom({
		previousPath: navigation.previousPath,
		referrerHost: navigation.referrerHost,
	});
}

// ── Visitor id and session memory ──────────────────────────────────────────

function randomId() {
	try {
		return crypto.randomUUID();
	} catch {
		return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}0000000000000000`.slice(
			0,
			32,
		);
	}
}

function visitorId(): string {
	try {
		const stored = localStorage.getItem(VISITOR_KEY);
		if (stored && /^[A-Za-z0-9-]{16,64}$/.test(stored)) return stored;
		const created = randomId();
		localStorage.setItem(VISITOR_KEY, created);
		return created;
	} catch {
		memoryVisitorId ??= randomId();
		return memoryVisitorId;
	}
}

function sentMap(): Map<string, number> {
	if (sent) return sent;
	sent = new Map();
	try {
		const raw = sessionStorage.getItem(SENT_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Record<string, number>;
			const now = Date.now();
			for (const [key, at] of Object.entries(parsed)) {
				if (typeof at === "number" && now - at < VIEW_DEDUPE_MS) {
					sent.set(key, at);
				}
			}
		}
	} catch {
		// Storage can be blocked; the in-memory map still works.
	}
	return sent;
}

function persistSent() {
	try {
		sessionStorage.setItem(
			SENT_KEY,
			JSON.stringify(Object.fromEntries(sentMap())),
		);
	} catch {
		// Ignore: the in-memory map is enough for this page load.
	}
}

// ── Sending ────────────────────────────────────────────────────────────────

function canTrack() {
	if (typeof window === "undefined") return false;
	return navigator.webdriver !== true;
}

function send(items: QueuedView[], useBeacon: boolean) {
	const body = JSON.stringify({
		items,
		visitorId: visitorId(),
		...(navigation.referrerHost
			? { referrerHost: navigation.referrerHost }
			: {}),
	});
	try {
		if (useBeacon && typeof navigator.sendBeacon === "function") {
			const ok = navigator.sendBeacon(
				"/api/views",
				new Blob([body], { type: "application/json" }),
			);
			if (ok) return;
		}
		void fetch("/api/views", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body,
			keepalive: true,
		}).catch(() => {});
	} catch {
		// Tracking never breaks a page.
	}
}

/** Sends everything queued, in batches. `beacon` is for when the page is going away. */
export function flushViews(beacon = false) {
	if (flushTimer) {
		clearTimeout(flushTimer);
		flushTimer = null;
	}
	if (queue.length === 0) return;
	const pending = queue;
	queue = [];
	persistSent();
	for (let index = 0; index < pending.length; index += VIEW_BATCH_MAX) {
		send(pending.slice(index, index + VIEW_BATCH_MAX), beacon);
	}
}

function attachListeners() {
	if (listenersAttached) return;
	listenersAttached = true;
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") flushViews(true);
	});
	window.addEventListener("pagehide", () => flushViews(true));
}

function enqueue(view: QueuedView) {
	if (!canTrack()) return;
	attachListeners();
	const key = `${view.kind}|${view.resource}|${view.ref}`;
	const map = sentMap();
	const last = map.get(key);
	const now = Date.now();
	if (last != null && now - last < VIEW_DEDUPE_MS) return;
	map.set(key, now);
	queue.push(view);
	if (queue.length >= VIEW_BATCH_MAX) {
		flushViews();
		return;
	}
	if (!flushTimer) flushTimer = setTimeout(() => flushViews(), FLUSH_DELAY_MS);
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Opening an item's own page. Waits until the tab is actually visible. */
export function trackDetailView(resource: ViewResourceKind, ref: string) {
	try {
		if (!ref || !canTrack()) return () => {};
		if (document.visibilityState === "visible") {
			enqueue({ resource, ref, kind: "detail", source: currentSource() });
			return () => {};
		}
		const onVisible = () => {
			if (document.visibilityState !== "visible") return;
			document.removeEventListener("visibilitychange", onVisible);
			enqueue({ resource, ref, kind: "detail", source: currentSource() });
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	} catch {
		return () => {};
	}
}

/** An item that scrolled into view inside a list. */
export function trackListImpression(
	resource: ViewResourceKind,
	ref: string,
	source: ViewSourceName,
) {
	try {
		if (!ref) return;
		enqueue({ resource, ref, kind: "list", source });
	} catch {
		// Ignore.
	}
}
