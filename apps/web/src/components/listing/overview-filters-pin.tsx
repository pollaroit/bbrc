"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { BodyPortal } from "@/components/blocks/body-portal";
import { cn } from "@/lib/utils";

const PINNED_CLASS =
	"fixed top-4 right-4 z-50 bg-background/95 p-0.5 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 md:top-[4.75rem] md:right-6";

type OverviewFiltersPinProps = {
	children: ReactNode;
};

function pinThresholdPx() {
	if (typeof window === "undefined") {
		return 16;
	}
	return window.matchMedia("(min-width: 768px)").matches ? 76 : 16;
}

/**
 * Keeps filter controls in document flow until the slot scrolls past the header,
 * then pins them to the top-right of the viewport (via body portal — fixed is
 * broken inside PwaPullToRefresh's transformed wrapper).
 */
export function OverviewFiltersPin({ children }: OverviewFiltersPinProps) {
	const sentinelRef = useRef<HTMLDivElement>(null);
	const [pinned, setPinned] = useState(false);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) {
			return;
		}

		const update = () => {
			const rect = sentinel.getBoundingClientRect();
			setPinned(rect.top < pinThresholdPx());
		};

		update();
		window.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);
		return () => {
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, []);

	return (
		<div className="w-full">
			<div ref={sentinelRef} className="h-px w-full" aria-hidden />
			<div className="flex w-full justify-end">
				{pinned ? (
					<>
						<div className="h-9 min-w-20 shrink-0" aria-hidden />
						<BodyPortal>
							<div className={PINNED_CLASS}>{children}</div>
						</BodyPortal>
					</>
				) : (
					<div className={cn("flex justify-end")}>{children}</div>
				)}
			</div>
		</div>
	);
}
