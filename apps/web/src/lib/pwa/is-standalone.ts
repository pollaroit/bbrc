/** True when the app runs as an installed PWA (standalone / iOS home screen). */
export function isStandalonePwa(): boolean {
	if (typeof window === "undefined") {
		return false;
	}

	if (window.matchMedia("(display-mode: standalone)").matches) {
		return true;
	}

	const navigatorWithStandalone = window.navigator as Navigator & {
		standalone?: boolean;
	};

	return navigatorWithStandalone.standalone === true;
}
