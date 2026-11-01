"use client";

import type { ContentMapSnapshot } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ContentMapInteractive = dynamic(
	() => import("@/components/blocks/content-map/content-map-interactive"),
	{ ssr: false, loading: () => null },
);

type ContentMapViewProps = {
	map: ContentMapSnapshot;
	className?: string;
	height?: number;
};

/** Read-only map: placeholder first, interactive tiles after the member opts in. */
export function ContentMapView({
	map,
	className,
	height = 220,
}: ContentMapViewProps) {
	const [active, setActive] = useState(false);

	if (!active) {
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center gap-2 border border-border bg-muted/20 p-4 text-center",
					className,
				)}
				style={{ minHeight: height }}
			>
				<MapPin className="size-5 text-muted-foreground" aria-hidden />
				<p className="text-muted-foreground text-sm">Map attached</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="pointer-events-auto"
					onClick={() => setActive(true)}
				>
					Show map
				</Button>
			</div>
		);
	}

	return (
		<ContentMapInteractive
			map={map}
			className={className}
			height={height}
			interactive={false}
		/>
	);
}
