export function siteRelativePath(path: string): string {
	return path.startsWith("/") ? path : `/${path}`;
}

export function absoluteShareUrl(path: string): string {
	const normalized = siteRelativePath(path);
	if (typeof window === "undefined") {
		return normalized;
	}
	return `${window.location.origin}${normalized}`;
}

export function buildWhatsAppShareUrl(url: string, text?: string): string {
	const message = text?.trim() ? `${text.trim()}\n${url}` : url;
	return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildTwitterShareUrl(url: string, text?: string): string {
	const params = new URLSearchParams({ url });
	if (text?.trim()) {
		params.set("text", text.trim());
	}
	return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function buildFacebookShareUrl(url: string): string {
	return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function buildTelegramShareUrl(url: string, text?: string): string {
	const params = new URLSearchParams({ url });
	if (text?.trim()) {
		params.set("text", text.trim());
	}
	return `https://t.me/share/url?${params.toString()}`;
}

export function openShareWindow(url: string) {
	window.open(url, "_blank", "noopener,noreferrer");
}
