"use client";

import type { ContentMapSnapshot } from "@bbrc/shared";
import {
	Map as MapCanvas,
	MapControls,
	MapMarker,
	MarkerContent,
	useMap,
} from "@bbrc/ui/components/map";
import { useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

type ContentMapInteractiveProps = {
	map: ContentMapSnapshot;
	className?: string;
	/** Fixed height in px; omit to fill the parent (picker sheet). */
	height?: number;
	interactive?: boolean;
	resizeWhen?: boolean;
	/** Tap the map to place or move the pin (picker only). */
	placeMarkerOnClick?: boolean;
	onMarkerChange?: (marker: { lng: number; lat: number } | null) => void;
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

function MapResizeWhen({ active }: { active: boolean }) {
	const { map, isLoaded } = useMap();

	useEffect(() => {
		if (!active || !map || !isLoaded) return;

		const resize = () => map.resize();
		resize();
		const frame = requestAnimationFrame(resize);
		const timeout = window.setTimeout(resize, 200);

		return () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(timeout);
		};
	}, [active, map, isLoaded]);

	return null;
}

function MapClickPlaceMarker({
	onPick,
}: {
	onPick: (lng: number, lat: number) => void;
}) {
	const { map, isLoaded } = useMap();
	const stablePick = useCallback(onPick, [onPick]);

	useEffect(() => {
		if (!map || !isLoaded) return;

		const handler = (event: { lngLat: { lng: number; lat: number } }) => {
			stablePick(event.lngLat.lng, event.lngLat.lat);
		};

		map.on("click", handler);
		return () => {
			map.off("click", handler);
		};
	}, [map, isLoaded, stablePick]);

	return null;
}

export default function ContentMapInteractive({
	map,
	className,
	height,
	interactive = false,
	resizeWhen = false,
	placeMarkerOnClick = false,
	onMarkerChange,
	viewport,
	onViewportChange,
}: ContentMapInteractiveProps) {
	const controlled =
		viewport != null && onViewportChange != null
			? { viewport, onViewportChange }
			: {};
	const fillParent = height == null;
	const resolvedHeight = height ?? 220;
	const hasMarker = map.markerLng != null && map.markerLat != null;

	const handlePick = useCallback(
		(lng: number, lat: number) => {
			onMarkerChange?.({ lng, lat });
		},
		[onMarkerChange],
	);

	return (
		<div
			className={cn(
				"overflow-hidden border border-border bg-muted/20",
				fillParent ? "size-full min-h-[280px]" : "w-full",
				!interactive && "pointer-events-none",
				placeMarkerOnClick && "cursor-crosshair",
				className,
			)}
			style={fillParent ? undefined : { height: resolvedHeight }}
		>
			<MapCanvas
				className="size-full"
				center={[map.centerLng, map.centerLat]}
				zoom={map.zoom}
				minZoom={1}
				maxZoom={18}
				{...controlled}
			>
				<MapResizeWhen active={resizeWhen || interactive} />
				{interactive ? (
					<MapControls showZoom showCompass showLocate showFullscreen />
				) : null}
				{placeMarkerOnClick && onMarkerChange ? (
					<MapClickPlaceMarker onPick={handlePick} />
				) : null}
				{hasMarker ? (
					<MapMarker longitude={map.markerLng!} latitude={map.markerLat!}>
						<MarkerContent />
					</MapMarker>
				) : null}
			</MapCanvas>
		</div>
	);
}
