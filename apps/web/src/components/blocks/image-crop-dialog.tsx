"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Crop as CropIcon } from "lucide-react";
import {
	type SyntheticEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import { toast } from "sonner";
import type { OutputImageMime } from "@/lib/storage/compress-image";
import { compressImageForUpload } from "@/lib/storage/compress-image";
import {
	centerAspectCrop,
	cropImageToBlob,
	initialFreeCrop,
} from "@/lib/storage/crop-image";
import { MAX_IMAGE_BYTES } from "@/lib/storage/image-upload-limits";

import "react-image-crop/dist/ReactCrop.css";

export type ImageCropDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	file: File | null;
	aspect?: number;
	maxEdge: number;
	outputMimeTypes: readonly OutputImageMime[];
	title: string;
	description: string;
	onConfirm: (file: File) => void;
};

export function ImageCropDialog({
	open,
	onOpenChange,
	file,
	aspect,
	maxEdge,
	outputMimeTypes,
	title,
	description,
	onConfirm,
}: ImageCropDialogProps) {
	const imgRef = useRef<HTMLImageElement | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [crop, setCrop] = useState<Crop>();
	const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!file || !open) {
			setPreviewUrl(null);
			setCrop(undefined);
			setCompletedCrop(null);
			return;
		}

		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file, open]);

	const onImageLoad = useCallback(
		(event: SyntheticEvent<HTMLImageElement>) => {
			const { width, height } = event.currentTarget;
			setCrop(
				aspect
					? centerAspectCrop(width, height, aspect)
					: initialFreeCrop(width, height),
			);
		},
		[aspect],
	);

	async function handleConfirm() {
		if (
			!file ||
			!imgRef.current ||
			!completedCrop?.width ||
			!completedCrop.height
		) {
			toast.error("Choose a crop area first.");
			return;
		}

		setSubmitting(true);
		try {
			const cropped = await cropImageToBlob(imgRef.current, completedCrop);
			const compressed = await compressImageForUpload(cropped, {
				maxEdge,
				fileName: file.name,
				maxBytes: MAX_IMAGE_BYTES,
				outputMimeTypes,
			});

			if (compressed.size > MAX_IMAGE_BYTES) {
				toast.error("Image must be 2 MB or smaller.");
				return;
			}

			onConfirm(compressed);
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not prepare image.",
			);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(92vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
				<DialogHeader className="border-border border-b p-4">
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-auto p-4">
					{previewUrl ? (
						<ReactCrop
							className="max-h-[min(60vh,480px)] w-full"
							crop={crop}
							onChange={(_, percentCrop) => setCrop(percentCrop)}
							onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
							aspect={aspect}
							style={
								{
									"--rc-border-color": "var(--border)",
									"--rc-focus-color": "var(--primary)",
								} as React.CSSProperties
							}
						>
							{/** biome-ignore lint/performance/noImgElement: react-image-crop requires a native img ref */}
							<img
								ref={imgRef}
								src={previewUrl}
								alt=""
								className="max-h-[min(60vh,480px)] w-full object-contain"
								onLoad={onImageLoad}
							/>
						</ReactCrop>
					) : null}
				</div>

				<DialogFooter className="border-border border-t p-4">
					<Button
						type="button"
						variant="outline"
						disabled={submitting}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<LoadingButton
						type="button"
						loading={submitting}
						disabled={!previewUrl}
						onClick={() => void handleConfirm()}
					>
						<CropIcon data-icon="inline-start" aria-hidden />
						Use photo
					</LoadingButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
