"use client";

import {
	CONTENT_MAP_DEFAULT_CENTER,
	type ContentMapSnapshot,
	contentMapMarkerPoint,
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
import { useEffect, useState } from "react";

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

function snapshotFromViewport(viewport: Viewport): ContentMapSnapshot {
	return {
		centerLng: viewport.center[0],
		centerLat: viewport.center[1],
		zoom: Math.round(viewport.zoom),
		markerLng: viewport.center[0],
		markerLat: viewport.center[1],
	};
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
		const seed = value ?? {
			centerLng: CONTENT_MAP_DEFAULT_CENTER.lng,
			centerLat: CONTENT_MAP_DEFAULT_CENTER.lat,
			zoom: CONTENT_MAP_DEFAULT_CENTER.zoom,
		};
		return {
			center: [seed.centerLng, seed.centerLat],
			zoom: seed.zoom,
			bearing: 0,
			pitch: 0,
		};
	});

	useEffect(() => {
		if (!open) return;
		const seed = value ?? {
			centerLng: CONTENT_MAP_DEFAULT_CENTER.lng,
			centerLat: CONTENT_MAP_DEFAULT_CENTER.lat,
			zoom: CONTENT_MAP_DEFAULT_CENTER.zoom,
		};
		setViewport({
			center: [seed.centerLng, seed.centerLat],
			zoom: seed.zoom,
			bearing: 0,
			pitch: 0,
		});
	}, [open, value]);

	const draft = snapshotFromViewport(viewport);
	const marker = contentMapMarkerPoint(draft);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="flex h-[min(92vh,640px)] flex-col gap-0 p-0 sm:max-w-none"
			>
				<SheetHeader className="border-border border-b px-4 py-3 text-start">
					<SheetTitle>Add a map</SheetTitle>
					<SheetDescription>
						Pan and zoom to choose the place. Avoid posting a precise home
						address publicly.
					</SheetDescription>
				</SheetHeader>
				<div className="relative min-h-0 flex-1">
					<ContentMapInteractive
						map={{
							...draft,
							markerLng: marker.lng,
							markerLat: marker.lat,
						}}
						height={undefined}
						className="absolute inset-0 size-full border-0"
						interactive
						viewport={viewport}
						onViewportChange={setViewport}
					/>
				</div>
				<SheetFooter className="flex-row justify-end gap-2 border-border border-t px-4 py-3">
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
							onChange(
								snapshotFromViewport({
									...viewport,
									center: [marker.lng, marker.lat],
								}),
							);
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
