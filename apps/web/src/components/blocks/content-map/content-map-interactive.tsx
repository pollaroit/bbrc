"use client";

import type { ContentMapSnapshot } from "@bbrc/shared";
import { contentMapMarkerPoint } from "@bbrc/shared";
import {
	Map as MapCanvas,
	MapControls,
	MapMarker,
	MarkerContent,
} from "@bbrc/ui/components/map";
import { cn } from "@/lib/utils";

type ContentMapInteractiveProps = {
	map: ContentMapSnapshot;
	className?: string;
	height?: number;
	/** When true, pan and zoom are allowed (composer picker). */
	interactive?: boolean;
	viewport?: {
		center: [number, number];
		zoom: number;
		bearing?: number;
		pitch?: number;
	};
	onViewportChange?: (viewport: {
		center: [number, number];
		zoom: number;
		bearing: number;
		pitch: number;
	}) => void;
};

export default function ContentMapInteractive({
	map,
	className,
	height = 220,
	interactive = false,
	viewport,
	onViewportChange,
}: ContentMapInteractiveProps) {
	const marker = contentMapMarkerPoint(map);
	const controlled =
		viewport != null && onViewportChange != null
			? { viewport, onViewportChange }
			: {};

	return (
		<div
			className={cn(
				"relative overflow-hidden border border-border bg-muted/20",
				!interactive && "pointer-events-none",
				className,
			)}
			style={{ height }}
		>
			<MapCanvas
				className="absolute inset-0 size-full"
				center={[map.centerLng, map.centerLat]}
				zoom={map.zoom}
				minZoom={1}
				maxZoom={18}
				{...controlled}
			>
				{interactive ? <MapControls showZoom showLocate /> : null}
				<MapMarker longitude={marker.lng} latitude={marker.lat}>
					<MarkerContent />
				</MapMarker>
			</MapCanvas>
			<p className="pointer-events-none absolute end-2 bottom-1 z-10 text-3xs text-muted-foreground">
				© OpenStreetMap · © CARTO
			</p>
		</div>
	);
}
