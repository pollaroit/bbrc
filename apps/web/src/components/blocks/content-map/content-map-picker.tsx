"use client";

import {
	CONTENT_MAP_DEFAULT_CENTER,
	type ContentMapSnapshot,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const ContentMapInteractive = dynamic(
	() => import("@/components/blocks/content-map/content-map-interactive"),
	{ ssr: false },
);

type Viewport = {
	center: [number, number];
	zoom: number;
	bearing: number;
	pitch: number;
};

function snapshotFromState(
	viewport: Viewport,
	marker: { lng: number; lat: number } | null,
): ContentMapSnapshot {
	return {
		centerLng: viewport.center[0],
		centerLat: viewport.center[1],
		zoom: Math.round(viewport.zoom),
		markerLng: marker?.lng ?? null,
		markerLat: marker?.lat ?? null,
	};
}

function seedFromValue(value: ContentMapSnapshot | null) {
	return (
		value ?? {
			centerLng: CONTENT_MAP_DEFAULT_CENTER.lng,
			centerLat: CONTENT_MAP_DEFAULT_CENTER.lat,
			zoom: CONTENT_MAP_DEFAULT_CENTER.zoom,
			markerLng: null,
			markerLat: null,
		}
	);
}

type ContentMapPickerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	value: ContentMapSnapshot | null;
	onChange: (value: ContentMapSnapshot | null) => void;
};

export function ContentMapPicker({
	open,
	onOpenChange,
	value,
	onChange,
}: ContentMapPickerProps) {
	const [viewport, setViewport] = useState<Viewport>(() => {
		const seed = seedFromValue(value);
		return {
			center: [seed.centerLng, seed.centerLat],
			zoom: seed.zoom,
			bearing: 0,
			pitch: 0,
		};
	});
	const [marker, setMarker] = useState<{ lng: number; lat: number } | null>(
		() =>
			value?.markerLng != null && value.markerLat != null
				? { lng: value.markerLng, lat: value.markerLat }
				: null,
	);

	useEffect(() => {
		if (!open) return;
		const seed = seedFromValue(value);
		setViewport({
			center: [seed.centerLng, seed.centerLat],
			zoom: seed.zoom,
			bearing: 0,
			pitch: 0,
		});
		setMarker(
			seed.markerLng != null && seed.markerLat != null
				? { lng: seed.markerLng, lat: seed.markerLat }
				: null,
		);
	}, [open, value]);

	const draft = useMemo(
		() => snapshotFromState(viewport, marker),
		[viewport, marker],
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="z-[60] flex h-[min(92dvh,720px)] max-h-[92dvh] flex-col gap-0 p-0 data-[side=bottom]:h-[min(92dvh,720px)] data-[side=bottom]:max-h-[92dvh] sm:max-w-none"
			>
				<SheetHeader className="shrink-0 border-border border-b px-4 py-3 text-start">
					<SheetTitle>Add a map</SheetTitle>
					<SheetDescription>
						Pan and zoom to frame the area. Tap the map to drop a pin, or save
						without one. Avoid posting a precise home address publicly.
					</SheetDescription>
				</SheetHeader>
				{open ? (
					<div className="relative min-h-0 flex-1 overflow-hidden">
						<ContentMapInteractive
							map={draft}
							className="size-full border-0"
							interactive
							resizeWhen
							placeMarkerOnClick
							onMarkerChange={setMarker}
							viewport={viewport}
							onViewportChange={setViewport}
						/>
						<div className="pointer-events-none absolute start-3 top-3 z-10 border border-border bg-background/90 px-2 py-1 text-2xs text-muted-foreground">
							{marker ? "Tap again to move the pin" : "Tap to add a pin"}
						</div>
					</div>
				) : null}
				<SheetFooter className="shrink-0 flex-row flex-wrap justify-end gap-2 border-border border-t px-4 py-3">
					{marker ? (
						<Button
							type="button"
							variant="ghost"
							className="me-auto"
							onClick={() => setMarker(null)}
						>
							Remove pin
						</Button>
					) : null}
					{value ? (
						<Button
							type="button"
							variant="ghost"
							onClick={() => {
								onChange(null);
								onOpenChange(false);
							}}
						>
							Remove map
						</Button>
					) : null}
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={() => {
							onChange(snapshotFromState(viewport, marker));
							onOpenChange(false);
						}}
					>
						Use this map
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
