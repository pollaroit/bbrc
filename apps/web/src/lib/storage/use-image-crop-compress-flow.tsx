"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImageCropDialog } from "@/components/blocks/image-crop-dialog";
import {
	ACCEPT_IMAGE_MIME,
	parseAllowedImageMime,
} from "@/lib/storage/image-upload-limits";
import {
	getImageUploadProfile,
	type ImageUploadKind,
} from "@/lib/storage/image-upload-profile";

export function useImageCropCompressFlow({
	kind,
	onReady,
}: {
	kind: ImageUploadKind;
	onReady: (file: File) => void;
}) {
	const profile = getImageUploadProfile(kind);
	const [open, setOpen] = useState(false);
	const [sourceFile, setSourceFile] = useState<File | null>(null);

	function stageRawFile(file: File) {
		if (!parseAllowedImageMime(file.type)) {
			toast.error("Use JPEG, PNG, or WebP.");
			return;
		}
		setSourceFile(file);
		setOpen(true);
	}

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (!nextOpen) {
			setSourceFile(null);
		}
	}

	const cropDialog = (
		<ImageCropDialog
			open={open}
			onOpenChange={handleOpenChange}
			file={sourceFile}
			aspect={profile.aspect}
			maxEdge={profile.maxEdge}
			outputMimeTypes={profile.outputMimeTypes}
			title={profile.cropTitle}
			description={profile.cropDescription}
			onConfirm={onReady}
		/>
	);

	return { stageRawFile, cropDialog };
}

export { ACCEPT_IMAGE_MIME };
