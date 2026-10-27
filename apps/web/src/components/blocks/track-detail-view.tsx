"use client";

import type { ViewResourceKind } from "@bbrc/shared";
import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { trackDetailView } from "@/lib/views/tracker";

type TrackDetailViewProps = {
	resource: ViewResourceKind;
	/** Slug, username, or `username/slug` for a shelf. */
	itemRef: string;
	/** Skip views on paths that start with one of these (for example a shelf under a profile). */
	skipPathPrefixes?: string[];
};

/**
 * Counts one view of the page's item. Renders nothing. The tracker remembers
 * what was already sent, so putting this in a layout is safe: switching tabs
 * under it sends nothing.
 */
export function TrackDetailView({
	resource,
	itemRef,
	skipPathPrefixes,
}: TrackDetailViewProps) {
	const pathname = usePathname();
	const skip = skipPathPrefixes?.some((prefix) => pathname.startsWith(prefix));

	useEffect(() => {
		if (skip) return;
		return trackDetailView(resource, itemRef);
	}, [resource, itemRef, skip]);

	return null;
}
