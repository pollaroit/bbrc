"use client";

import type { ViewResourceKind, ViewSourceName } from "@bbrc/shared";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { observeImpression } from "@/lib/views/impression-observer";
import { trackListImpression } from "@/lib/views/tracker";

/**
 * Ref callback for the root element of a card in a list: counts one view once
 * the card has been mostly on screen for a second. Pass `null` for `itemRef` to
 * turn it off (for example while a post is still being sent).
 */
export function useImpressionRef(
	resource: ViewResourceKind,
	itemRef: string | null,
	source: ViewSourceName,
) {
	return useCallback(
		(element: HTMLElement | null) => {
			if (!element || !itemRef) return;
			return observeImpression(element, () =>
				trackListImpression(resource, itemRef, source),
			);
		},
		[resource, itemRef, source],
	);
}

type TrackImpressionProps = {
	resource: ViewResourceKind;
	itemRef: string;
	source: ViewSourceName;
	className?: string;
	children: React.ReactNode;
};

/** A plain wrapper for cards whose root element is out of reach. */
export function TrackImpression({
	resource,
	itemRef,
	source,
	className,
	children,
}: TrackImpressionProps) {
	const attach = useImpressionRef(resource, itemRef, source);
	return (
		<div ref={attach} className={cn(className)}>
			{children}
		</div>
	);
}
