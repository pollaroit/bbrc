/** Relative in-app paths allowed in rich-text links. */
export function isAllowedRichLinkHref(href: string): boolean {
	const trimmed = href.trim();
	if (!trimmed) {
		return false;
	}
	if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
		return true;
	}
	return normalizeHttpsUrl(trimmed) != null;
}

export function normalizeHttpsUrl(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) {
		return null;
	}
	try {
		const url = new URL(trimmed);
		if (url.protocol !== "https:") {
			return null;
		}
		return url.href;
	} catch {
		return null;
	}
}
