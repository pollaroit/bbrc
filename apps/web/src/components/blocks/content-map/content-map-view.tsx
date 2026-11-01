"use client";

import type { ContentMapSnapshot } from "@bbrc/shared";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const ContentMapInteractive = dynamic(
	() => import("@/components/blocks/content-map/content-map-interactive"),
	{
		ssr: false,
		loading: () => (
			<Skeleton className="h-[220px] w-full border border-border" aria-hidden />
		),
	},
);

type ContentMapViewProps = {
	map: ContentMapSnapshot;
	className?: string;
	height?: number;
};

/** Read-only mapcn map (MapLibre + CARTO tiles from `@bbrc/ui/components/map`). */
export function ContentMapView({
	map,
	className,
	height = 220,
}: ContentMapViewProps) {
	return (
		<ContentMapInteractive
			map={map}
			className={cn(className)}
			height={height}
			interactive={false}
		/>
	);
}
