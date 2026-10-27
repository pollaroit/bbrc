import { stripLocalePrefix } from "@bbrc/i18n";
import type { InternalLinkRef } from "./types";

/**
 * Map in-app paths to structured refs for rich link embeds. Only relative paths
 * count: a full URL could point at any site, so the client turns same-site
 * URLs into paths first (see `toSitePath` in the web app).
 */
export function internalLinkRefFromHref(href: string): InternalLinkRef | null {
	let path = href.trim();
	if (!path || path.startsWith("//")) {
		return null;
	}

	if (!path.startsWith("/")) {
		return null;
	}

	// A link written in another language (`/az/books/x`) points at the same thing.
	path = stripLocalePrefix(path);

	// Query strings and anchors do not change what the link points at.
	path = path.split(/[?#]/)[0] ?? path;

	const segments = path.split("/").filter(Boolean);
	if (segments.length === 0) {
		return null;
	}

	if (segments[0] === "books" && segments.length === 2) {
		return { kind: "book", slug: segments[1]! };
	}

	if (
		segments[0] === "books" &&
		segments[2] === "feedbacks" &&
		segments.length === 4
	) {
		return {
			kind: "feedback",
			bookSlug: segments[1]!,
			slug: segments[3]!,
		};
	}

	if (
		segments[0] === "books" &&
		segments[2] === "feedbacks" &&
		segments[4] === "comments" &&
		segments.length === 6
	) {
		return {
			kind: "comment_on_feedback",
			bookSlug: segments[1]!,
			feedbackSlug: segments[3]!,
			slug: segments[5]!,
		};
	}

	if (segments[0] === "posts" && segments.length === 2) {
		return { kind: "post", slug: segments[1]! };
	}

	if (
		segments[0] === "posts" &&
		segments[2] === "comments" &&
		segments.length === 4
	) {
		return {
			kind: "comment_on_post",
			postSlug: segments[1]!,
			slug: segments[3]!,
		};
	}

	if (segments[0] === "users" && segments.length === 2) {
		return { kind: "user", username: segments[1]! };
	}

	if (
		segments[0] === "users" &&
		segments[2] === "shelves" &&
		segments.length === 4
	) {
		return {
			kind: "shelf",
			username: segments[1]!,
			slug: segments[3]!,
		};
	}

	if (segments[0] === "sittings" && segments.length === 2) {
		return { kind: "sitting", slug: segments[1]! };
	}

	if (segments[0] === "authors" && segments.length === 2) {
		return { kind: "author", slug: segments[1]! };
	}

	return null;
}

export function hrefFromInternalLinkRef(ref: InternalLinkRef): string {
	switch (ref.kind) {
		case "book":
			return `/books/${ref.slug}`;
		case "post":
			return `/posts/${ref.slug}`;
		case "comment_on_post":
			return `/posts/${ref.postSlug}/comments/${ref.slug}`;
		case "comment_on_feedback":
			return `/books/${ref.bookSlug}/feedbacks/${ref.feedbackSlug}/comments/${ref.slug}`;
		case "feedback":
			return `/books/${ref.bookSlug}/feedbacks/${ref.slug}`;
		case "user":
			return `/users/${ref.username}`;
		case "shelf":
			return `/users/${ref.username}/shelves/${ref.slug}`;
		case "sitting":
			return `/sittings/${ref.slug}`;
		case "author":
			return `/authors/${ref.slug}`;
		default: {
			const _exhaustive: never = ref;
			return _exhaustive;
		}
	}
}
