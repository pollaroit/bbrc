import { createHash } from "node:crypto";

const TRACKING_PARAM =
	/^(utm_[a-z0-9_]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|yclid|_hsenc|_hsmi|ref_src|ref_url|spm)$/i;

/**
 * A stable form of an outside link so the same page always maps to the same cache
 * row: lower-case host, no fragment, no default port, no tracking parameters,
 * remaining parameters sorted. Returns null for anything that is not https.
 */
export function normalizeLinkUrl(input: string): string | null {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return null;
	}
	if (url.protocol !== "https:") return null;
	url.hash = "";
	url.username = "";
	url.password = "";
	if (url.port === "443") url.port = "";
	for (const key of [...url.searchParams.keys()]) {
		if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
	}
	url.searchParams.sort();
	if (url.pathname === "") url.pathname = "/";
	return url.toString();
}

/** sha256 of the normalised address: the cache key and the image file name. */
export function hashLinkUrl(normalized: string): string {
	return createHash("sha256").update(normalized).digest("hex");
}
