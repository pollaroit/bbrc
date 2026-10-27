import { stripLocalePrefix } from "@bbrc/i18n";
import { type InternalLinkRef, internalLinkRefFromHref } from "@bbrc/shared";

/**
 * A link to this site written as a full URL becomes its path, so it counts as
 * an on-site link. Anything else is returned unchanged.
 */
export function toSitePath(href: string): string {
	const trimmed = href.trim();
	if (typeof window === "undefined" || !/^https?:\/\//i.test(trimmed)) {
		return trimmed;
	}
	try {
		const url = new URL(trimmed);
		if (url.origin === window.location.origin) {
			// Stored without a language prefix: a link is the same page in every language.
			return stripLocalePrefix(`${url.pathname}${url.search}${url.hash}`);
		}
	} catch {
		// not a URL; leave it
	}
	return trimmed;
}

/** What an href points at on this site, or null when it is an outside link. */
export function internalRefOf(
	href: string,
	known?: InternalLinkRef | null,
): InternalLinkRef | null {
	return known ?? internalLinkRefFromHref(toSitePath(href));
}

/** Host and a short path for showing an outside link. */
export function describeExternalUrl(href: string): {
	host: string;
	path: string;
} {
	try {
		const url = new URL(href);
		const path = `${url.pathname === "/" ? "" : url.pathname}${url.search}`;
		return {
			host: url.hostname.replace(/^www\./, ""),
			path: path.length > 48 ? `${path.slice(0, 47)}…` : path,
		};
	} catch {
		return { host: href, path: "" };
	}
}
