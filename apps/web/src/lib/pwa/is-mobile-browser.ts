export function isMobileBrowser(): boolean {
	if (typeof window === "undefined") {
		return false;
	}

	return window.matchMedia("(max-width: 767px)").matches;
}

export function isIosHomeScreenCapable(): boolean {
	if (typeof window === "undefined") {
		return false;
	}

	const ua = window.navigator.userAgent;
	return /iPad|iPhone|iPod/.test(ua);
}
