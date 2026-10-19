const SCROLL_TOP_TOLERANCE_PX = 2;

export function getDocumentScrollTop(): number {
	const root = document.scrollingElement ?? document.documentElement;
	return root.scrollTop;
}

export function isDocumentScrollAtTop(): boolean {
	return getDocumentScrollTop() <= SCROLL_TOP_TOLERANCE_PX;
}

/** True when the touch target and its scrollable ancestors are at scroll top. */
export function isTouchChainAtScrollTop(target: EventTarget | null): boolean {
	if (!isDocumentScrollAtTop()) {
		return false;
	}

	if (!(target instanceof Element)) {
		return true;
	}

	let node: Element | null = target;

	while (node && node !== document.documentElement) {
		if (node instanceof HTMLElement) {
			const { overflowY } = getComputedStyle(node);
			const scrollable =
				overflowY === "auto" ||
				overflowY === "scroll" ||
				overflowY === "overlay";

			if (scrollable && node.scrollHeight > node.clientHeight + 1) {
				if (node.scrollTop > SCROLL_TOP_TOLERANCE_PX) {
					return false;
				}
			}
		}

		node = node.parentElement;
	}

	return true;
}
