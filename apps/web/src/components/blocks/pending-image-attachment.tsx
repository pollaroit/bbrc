"use client";

import { useEffect, useRef, useState } from "react";
import {
	FullWidthImagePreview,
	type ImagePreviewSize,
} from "@/components/blocks/full-width-image-preview";
import type { ImageUploadKind } from "@/lib/storage/image-upload-profile";
import { useImageCropCompressFlow } from "@/lib/storage/use-image-crop-compress-flow";

export type PendingImageAttachmentProps = {
	variant: "post" | "comment" | "feedback";
	file: File | null;
	onFileChange: (file: File | null) => void;
	disabled?: boolean;
	inputRef: React.RefObject<HTMLInputElement | null>;
	/** Bleed to the parent's edges (only for parents that have 1.5rem padding). */
	bleed?: boolean;
	size?: ImagePreviewSize;
};

function kindForVariant(
	variant: "post" | "comment" | "feedback",
): ImageUploadKind {
	if (variant === "feedback") return "feedback-image";
	return variant === "post" ? "post-image" : "comment-image";
}

export function usePendingImageInput(
	onFileChange: (file: File | null) => void,
	options?: {
		disabled?: boolean;
		variant?: "post" | "comment" | "feedback";
	},
) {
	const inputRef = useRef<HTMLInputElement>(null);
	const variant = options?.variant ?? "post";
	const { stageRawFile, cropDialog } = useImageCropCompressFlow({
		kind: kindForVariant(variant),
		onReady: onFileChange,
	});

	function openPicker() {
		inputRef.current?.click();
	}

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const next = event.target.files?.[0];
		if (!next) {
			return;
		}
		stageRawFile(next);
		if (inputRef.current) {
			inputRef.current.value = "";
		}
	}

	const input = (
		<input
			ref={inputRef}
			type="file"
			accept="image/jpeg,image/png,image/webp"
			className="sr-only"
			disabled={options?.disabled}
			onChange={handleChange}
		/>
	);

	return {
		inputRef,
		input,
		openPicker,
		clear: () => onFileChange(null),
		cropDialog,
	};
}

/** Preview for a post/comment photo already chosen (after crop). */
export function PendingImageAttachment({
	variant,
	file,
	onFileChange,
	disabled,
	inputRef,
	bleed,
	size,
}: PendingImageAttachmentProps) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!file) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	function openPicker() {
		inputRef.current?.click();
	}

	function clearFile() {
		onFileChange(null);
		if (inputRef.current) {
			inputRef.current.value = "";
		}
	}

	if (!file || !previewUrl) {
		return null;
	}

	return (
		<div className="w-full min-w-0 self-stretch">
			<FullWidthImagePreview
				src={previewUrl}
				alt={
					variant === "comment"
						? "Comment image preview"
						: variant === "feedback"
							? "Review image preview"
							: "Post image preview"
				}
				compact={size == null && variant !== "post"}
				size={size}
				bleed={bleed ?? variant === "post"}
				disabled={disabled}
				onReplace={openPicker}
				onRemove={clearFile}
			/>
		</div>
	);
}
