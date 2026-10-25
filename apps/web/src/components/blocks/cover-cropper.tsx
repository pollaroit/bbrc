"use client";

/**
 * Crops a picked image to the fixed book cover shape (2:3) and returns a WebP
 * file of exactly BOOK_COVER_UPLOAD_SIZE (600 x 900).
 *
 * Props
 * - `file`      the image the person picked (JPEG, PNG or WebP).
 * - `onCancel`  closed without a result.
 * - `onDone`    receives the finished `File` (type image/webp, under 2 MB).
 *
 * Drag to move, the slider (or + / -) to zoom, arrow keys to nudge.
 */

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Slider } from "@bbrc/ui/components/slider";
import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOOK_COVER_UPLOAD_SIZE } from "@/lib/book-cover";
import { MAX_IMAGE_BYTES } from "@/lib/storage/image-upload-limits";

/** On-screen size of the crop frame (px); the output is scaled up from it. */
const FRAME_W = 240;
const FRAME_H = 360;
const MAX_ZOOM = 4;
const NUDGE_PX = 8;

type Point = { x: number; y: number };

export type CoverCropperProps = {
	file: File;
	onCancel: () => void;
	onDone: (file: File) => void;
};

async function encodeWebp(canvas: HTMLCanvasElement): Promise<Blob> {
	// Lower the quality until the file fits the upload limit.
	for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5]) {
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, "image/webp", quality),
		);
		if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
	}
	throw new Error(
		"This image is too detailed to save under 2 MB. Try a smaller one.",
	);
}

export function CoverCropper({ file, onCancel, onDone }: CoverCropperProps) {
	const [image, setImage] = useState<HTMLImageElement | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [zoom, setZoom] = useState(1);
	const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const drag = useRef<{ pointer: Point; start: Point } | null>(null);

	useEffect(() => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => setImage(img);
		img.onerror = () =>
			setLoadError("That file could not be read as an image.");
		img.src = url;
		return () => URL.revokeObjectURL(url);
	}, [file]);

	// How big the image is drawn (frame px) at the current zoom, covering the frame.
	const drawn = useMemo(() => {
		if (!image) return null;
		const base = Math.max(
			FRAME_W / image.naturalWidth,
			FRAME_H / image.naturalHeight,
		);
		const scale = base * zoom;
		return {
			scale,
			width: image.naturalWidth * scale,
			height: image.naturalHeight * scale,
		};
	}, [image, zoom]);

	const clamp = useCallback(
		(point: Point, width: number, height: number): Point => ({
			x: Math.min(0, Math.max(FRAME_W - width, point.x)),
			y: Math.min(0, Math.max(FRAME_H - height, point.y)),
		}),
		[],
	);

	// Centre the picture once, when it has loaded.
	useEffect(() => {
		if (!image) return;
		const base = Math.max(
			FRAME_W / image.naturalWidth,
			FRAME_H / image.naturalHeight,
		);
		setOffset({
			x: (FRAME_W - image.naturalWidth * base) / 2,
			y: (FRAME_H - image.naturalHeight * base) / 2,
		});
	}, [image]);

	function changeZoom(next: number) {
		if (!image || !drawn) return;
		const value = Math.min(MAX_ZOOM, Math.max(1, next));
		const base = drawn.scale / zoom;
		const nextScale = base * value;
		// Zoom around the centre of the frame.
		const centreX = (FRAME_W / 2 - offset.x) / drawn.scale;
		const centreY = (FRAME_H / 2 - offset.y) / drawn.scale;
		const nextWidth = image.naturalWidth * nextScale;
		const nextHeight = image.naturalHeight * nextScale;
		setZoom(value);
		setOffset(
			clamp(
				{
					x: FRAME_W / 2 - centreX * nextScale,
					y: FRAME_H / 2 - centreY * nextScale,
				},
				nextWidth,
				nextHeight,
			),
		);
	}

	function move(dx: number, dy: number) {
		if (!drawn) return;
		setOffset((current) =>
			clamp(
				{ x: current.x + dx, y: current.y + dy },
				drawn.width,
				drawn.height,
			),
		);
	}

	async function save() {
		if (!image || !drawn) return;
		setSaving(true);
		setSaveError(null);
		try {
			const { width, height } = BOOK_COVER_UPLOAD_SIZE;
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Your browser cannot edit images.");
			// A white backing so transparent PNGs do not turn black.
			context.fillStyle = "#ffffff";
			context.fillRect(0, 0, width, height);
			const ratio = width / FRAME_W;
			context.imageSmoothingQuality = "high";
			context.drawImage(
				image,
				offset.x * ratio,
				offset.y * ratio,
				drawn.width * ratio,
				drawn.height * ratio,
			);
			const blob = await encodeWebp(canvas);
			onDone(new File([blob], "cover.webp", { type: "image/webp" }));
		} catch (error) {
			setSaveError(
				error instanceof Error ? error.message : "Could not crop the image.",
			);
			setSaving(false);
		}
	}

	return (
		<Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Crop the cover</DialogTitle>
					<DialogDescription>
						Every cover has the same 2:3 shape. Drag the picture to place it and
						zoom to fit.
					</DialogDescription>
				</DialogHeader>

				{loadError ? (
					<p className="text-destructive text-sm" role="alert">
						{loadError}
					</p>
				) : (
					<div className="flex flex-col items-center gap-4">
						<div
							role="application"
							aria-label="Cover crop frame. Use the arrow keys to move the picture and plus or minus to zoom."
							// biome-ignore lint/a11y/noNoninteractiveTabindex: a keyboard-operable crop frame
							tabIndex={0}
							className="relative touch-none overflow-hidden bg-muted outline-none ring-1 ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
							style={{ width: FRAME_W, height: FRAME_H, cursor: "grab" }}
							onPointerDown={(event) => {
								event.currentTarget.setPointerCapture(event.pointerId);
								drag.current = {
									pointer: { x: event.clientX, y: event.clientY },
									start: offset,
								};
							}}
							onPointerMove={(event) => {
								if (!drag.current || !drawn) return;
								setOffset(
									clamp(
										{
											x:
												drag.current.start.x +
												event.clientX -
												drag.current.pointer.x,
											y:
												drag.current.start.y +
												event.clientY -
												drag.current.pointer.y,
										},
										drawn.width,
										drawn.height,
									),
								);
							}}
							onPointerUp={() => {
								drag.current = null;
							}}
							onKeyDown={(event) => {
								const keys: Record<string, [number, number]> = {
									ArrowLeft: [NUDGE_PX, 0],
									ArrowRight: [-NUDGE_PX, 0],
									ArrowUp: [0, NUDGE_PX],
									ArrowDown: [0, -NUDGE_PX],
								};
								const step = keys[event.key];
								if (step) {
									event.preventDefault();
									move(step[0], step[1]);
								} else if (event.key === "+" || event.key === "=") {
									event.preventDefault();
									changeZoom(zoom + 0.2);
								} else if (event.key === "-") {
									event.preventDefault();
									changeZoom(zoom - 0.2);
								}
							}}
						>
							{image && drawn ? (
								// biome-ignore lint/performance/noImgElement: a local blob preview
								<img
									src={image.src}
									alt=""
									draggable={false}
									className="pointer-events-none absolute max-w-none select-none"
									style={{
										width: drawn.width,
										height: drawn.height,
										left: offset.x,
										top: offset.y,
									}}
								/>
							) : null}
						</div>

						<div className="flex w-full max-w-xs items-center gap-3">
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								aria-label="Zoom out"
								onClick={() => changeZoom(zoom - 0.2)}
							>
								<Minus aria-hidden />
							</Button>
							<Slider
								aria-label="Zoom"
								min={1}
								max={MAX_ZOOM}
								step={0.05}
								value={[zoom]}
								onValueChange={(next) => {
									const value = Array.isArray(next) ? next[0] : next;
									if (typeof value === "number") changeZoom(value);
								}}
							/>
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								aria-label="Zoom in"
								onClick={() => changeZoom(zoom + 0.2)}
							>
								<Plus aria-hidden />
							</Button>
						</div>
						<p className="text-muted-foreground text-xs">
							Saved as {BOOK_COVER_UPLOAD_SIZE.width} ×{" "}
							{BOOK_COVER_UPLOAD_SIZE.height}.
						</p>
					</div>
				)}

				{saveError ? (
					<p className="text-destructive text-sm" role="alert">
						{saveError}
					</p>
				) : null}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={saving}
						onClick={onCancel}
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={!image || saving}
						onClick={() => void save()}
					>
						{saving ? "Saving…" : "Use this crop"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
