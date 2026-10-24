import { VIEW_IMPRESSION_MS, VIEW_IMPRESSION_RATIO } from "@bbrc/shared";

type Watch = {
	onSeen: () => void;
	timer: ReturnType<typeof setTimeout> | null;
};

const watches = new Map<Element, Watch>();
let observer: IntersectionObserver | null = null;

const THRESHOLDS = Array.from({ length: 11 }, (_, step) => step / 10);

/** Tall cards may never reach half their own height, so half the screen counts too. */
function isSeen(entry: IntersectionObserverEntry) {
	if (!entry.isIntersecting) return false;
	if (entry.intersectionRatio >= VIEW_IMPRESSION_RATIO) return true;
	return (
		entry.intersectionRect.height >= window.innerHeight * VIEW_IMPRESSION_RATIO
	);
}

function sharedObserver() {
	if (observer) return observer;
	observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const watch = watches.get(entry.target);
				if (!watch) continue;
				if (isSeen(entry)) {
					if (watch.timer) continue;
					watch.timer = setTimeout(() => {
						watches.delete(entry.target);
						observer?.unobserve(entry.target);
						watch.onSeen();
					}, VIEW_IMPRESSION_MS);
				} else if (watch.timer) {
					clearTimeout(watch.timer);
					watch.timer = null;
				}
			}
		},
		{ threshold: THRESHOLDS },
	);
	return observer;
}

/**
 * Calls `onSeen` once when the element has been mostly on screen for a second.
 * One observer is shared by every card. Returns a cleanup function.
 */
export function observeImpression(element: Element, onSeen: () => void) {
	if (typeof IntersectionObserver === "undefined") return () => {};
	watches.set(element, { onSeen, timer: null });
	sharedObserver().observe(element);
	return () => {
		const watch = watches.get(element);
		if (watch?.timer) clearTimeout(watch.timer);
		watches.delete(element);
		observer?.unobserve(element);
	};
}
