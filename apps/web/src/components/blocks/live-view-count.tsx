"use client";

import { ViewCountLabel } from "@/components/blocks/view-count-label";
import { useViewCounts } from "@/lib/views/use-view-counts";

/** The public view count of one post or book, for server-rendered pages. */
export function LiveViewCount({
	resource,
	itemRef,
	className,
}: {
	resource: "post" | "book";
	itemRef: string;
	className?: string;
}) {
	const counts = useViewCounts(resource, [itemRef]);
	return <ViewCountLabel count={counts[itemRef]} className={className} />;
}
