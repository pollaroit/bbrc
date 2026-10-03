"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FullWidthImagePreview } from "@/components/blocks/full-width-image-preview";
import {
	ACCEPT_IMAGE_MIME,
	MAX_IMAGE_BYTES,
	parseAllowedImageMime,
} from "@/lib/storage/image-upload-limits";

export type PendingImageAttachmentProps = {
	variant: "post" | "comment";
	file: File | null;
	onFileChange: (file: File | null) => void;
	disabled?: boolean;
	/** Ref to wire a compact trigger (comment toolbar). */
	inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function usePendingImageInput(
	onFileChange: (file: File | null) => void,
	disabled?: boolean,
) {
	const inputRef = useRef<HTMLInputElement>(null);

	function openPicker() {
		inputRef.current?.click();
	}

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const next = event.target.files?.[0];
		if (!next) {
			onFileChange(null);
			return;
		}
		if (!parseAllowedImageMime(next.type)) {
			toast.error("Use JPEG, PNG, or WebP.");
			event.target.value = "";
			return;
		}
		if (next.size > MAX_IMAGE_BYTES) {
			toast.error("Image must be 2 MB or smaller.");
			event.target.value = "";
			return;
		}
		onFileChange(next);
	}

	const input = (
		<input
			ref={inputRef}
			type="file"
			accept={ACCEPT_IMAGE_MIME}
			className="sr-only"
			disabled={disabled}
			onChange={handleChange}
		/>
	);

	return { inputRef, input, openPicker, clear: () => onFileChange(null) };
}

/** Post compose: optional photo with full-width preview when selected. */
export function PendingImageAttachment({
	variant,
	file,
	onFileChange,
	disabled,
	inputRef: externalInputRef,
}: PendingImageAttachmentProps) {
	const internal = usePendingImageInput(onFileChange, disabled);
	const inputRef = externalInputRef ?? internal.inputRef;
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

	const hiddenInput = externalInputRef ? null : internal.input;

	if (!file || !previewUrl) {
		return hiddenInput;
	}

	return (
		<div className="min-w-0 max-w-full">
			{hiddenInput}
			<FullWidthImagePreview
				src={previewUrl}
				alt={
					variant === "comment" ? "Comment image preview" : "Post image preview"
				}
				compact={variant === "comment"}
				bleed={variant === "post"}
				disabled={disabled}
				onReplace={openPicker}
				onRemove={clearFile}
			/>
		</div>
	);
}
