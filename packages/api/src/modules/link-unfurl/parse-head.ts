/*
 * Reads the few things a link preview needs from the start of an HTML page:
 * Open Graph and Twitter card tags, with the plain <title> and description as
 * fallbacks. Pure and forgiving: a page that is not tidy HTML still gives what it has.
 */

export type LinkMeta = {
	title: string | null;
	description: string | null;
	siteName: string | null;
	/** An absolute https address of the page's picture, if it names one. */
	imageUrl: string | null;
};

const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	ndash: "–",
	mdash: "—",
	hellip: "…",
	rsquo: "’",
	lsquo: "‘",
	rdquo: "”",
	ldquo: "“",
	copy: "©",
};

export function decodeEntities(text: string): string {
	return text.replace(
		/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
		(match, body: string) => {
			if (body.startsWith("#x") || body.startsWith("#X")) {
				const code = Number.parseInt(body.slice(2), 16);
				return validCodePoint(code) ? String.fromCodePoint(code) : match;
			}
			if (body.startsWith("#")) {
				const code = Number.parseInt(body.slice(1), 10);
				return validCodePoint(code) ? String.fromCodePoint(code) : match;
			}
			return ENTITIES[body.toLowerCase()] ?? match;
		},
	);
}

function validCodePoint(code: number) {
	return (
		Number.isInteger(code) &&
		code > 0 &&
		code <= 0x10ffff &&
		!(code >= 0xd800 && code <= 0xdfff)
	);
}

function clean(text: string | null | undefined, max: number): string | null {
	if (!text) return null;
	const value = decodeEntities(text).replace(/\s+/g, " ").trim();
	if (!value) return null;
	return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/** All `<meta ...>` tags of the head as attribute maps (names lower-cased). */
function metaTags(head: string): Record<string, string>[] {
	const tags: Record<string, string>[] = [];
	for (const match of head.matchAll(/<meta\b([^>]*)>/gi)) {
		const attrs: Record<string, string> = {};
		for (const attr of (match[1] ?? "").matchAll(
			/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g,
		)) {
			attrs[(attr[1] as string).toLowerCase()] =
				attr[2] ?? attr[3] ?? attr[4] ?? "";
		}
		tags.push(attrs);
	}
	return tags;
}

/** Makes an image address absolute against the page and keeps it only when it is https. */
export function resolveImageUrl(
	value: string | null | undefined,
	pageUrl: string,
): string | null {
	const raw = value ? decodeEntities(value).trim() : "";
	if (!raw || raw.startsWith("data:")) return null;
	try {
		const url = new URL(raw, pageUrl);
		if (
			url.protocol === "http:" &&
			url.hostname === new URL(pageUrl).hostname
		) {
			url.protocol = "https:";
		}
		return url.protocol === "https:" ? url.toString() : null;
	} catch {
		return null;
	}
}

export function parseLinkMeta(html: string, pageUrl: string): LinkMeta {
	// Everything useful is in <head>; stop at </head> (or a generous prefix) so
	// body scripts and giant pages cannot confuse the scan.
	const end = html.search(/<\/head\s*>/i);
	const head = html.slice(0, end === -1 ? 200_000 : end);

	const byKey = new Map<string, string>();
	for (const tag of metaTags(head)) {
		const key = (tag.property ?? tag.name ?? tag.itemprop ?? "").toLowerCase();
		const content = tag.content;
		if (!key || content === undefined || byKey.has(key)) continue;
		byKey.set(key, content);
	}
	const pick = (...keys: string[]) => {
		for (const key of keys) {
			const value = byKey.get(key);
			if (value?.trim()) return value;
		}
		return null;
	};

	const titleTag =
		/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head)?.[1] ?? null;

	return {
		title: clean(pick("og:title", "twitter:title") ?? titleTag, 200),
		description: clean(
			pick("og:description", "twitter:description", "description"),
			300,
		),
		siteName: clean(pick("og:site_name", "application-name"), 80),
		imageUrl: resolveImageUrl(
			pick(
				"og:image:secure_url",
				"og:image",
				"og:image:url",
				"twitter:image",
				"twitter:image:src",
			),
			pageUrl,
		),
	};
}
