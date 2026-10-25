"use client";

import { Field, FieldDescription, FieldLabel } from "@bbrc/ui/components/field";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { ImagePlus } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { FullWidthImagePreview } from "@/components/blocks/full-width-image-preview";
import { refreshAuthSession } from "@/lib/refresh-auth-session";
import {
	ACCEPT_IMAGE_MIME,
	MAX_IMAGE_BYTES,
	parseAllowedImageMime,
} from "@/lib/storage/image-upload-limits";
import { imageUploadKindFromTarget } from "@/lib/storage/image-upload-profile";
import type { EntityImageUploadTarget } from "@/lib/storage/upload-entity-image";
import { uploadEntityImage } from "@/lib/storage/upload-entity-image";
import { useImageCropCompressFlow } from "@/lib/storage/use-image-crop-compress-flow";
import {
	broadcastAvatarCleared,
	broadcastAvatarUpdated,
} from "@/lib/user-avatar-broadcast";

export type SingleImageUploadFieldProps = {
	label: string;
	description?: string;
	currentUrl?: string | null;
	disabled?: boolean;
	uploadTarget: EntityImageUploadTarget;
	onRemove?: () => Promise<void>;
	onSuccess?: (publicUrl: string) => void;
};

export function SingleImageUploadField({
	label,
	description,
	currentUrl,
	disabled,
	uploadTarget,
	onRemove,
	onSuccess,
}: SingleImageUploadFieldProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
	const [savedUrl, setSavedUrl] = useState<string | null>(null);

	const displayUrl = localPreviewUrl ?? savedUrl ?? currentUrl ?? null;

	const previewSize =
		uploadTarget.target === "avatar"
			? "avatar"
			: uploadTarget.target === "shelf-cover"
				? "cover"
				: uploadTarget.target === "post-image" ||
						uploadTarget.target === "feedback-image"
					? "default"
					: "compact";

	const handleFile = useCallback(
		async (file: File) => {
			const contentType = parseAllowedImageMime(file.type);
			if (!contentType) {
				toast.error("Use JPEG, PNG, or WebP.");
				return;
			}
			if (file.size > MAX_IMAGE_BYTES) {
				toast.error("Image must be 2 MB or smaller.");
				return;
			}

			setUploading(true);
			const objectUrl = URL.createObjectURL(file);
			setLocalPreviewUrl(objectUrl);

			try {
				const { publicUrl } = await uploadEntityImage(file, uploadTarget);
				setLocalPreviewUrl(null);
				setSavedUrl(publicUrl);
				if (uploadTarget.target === "avatar") {
					broadcastAvatarUpdated(publicUrl);
					await refreshAuthSession({ imageUrl: publicUrl });
				}
				toast.success("Image saved.");
				onSuccess?.(publicUrl);
			} catch (error) {
				setLocalPreviewUrl(null);
				toast.error(
					error instanceof Error ? error.message : "Could not upload image.",
				);
			} finally {
				URL.revokeObjectURL(objectUrl);
				setUploading(false);
				if (inputRef.current) {
					inputRef.current.value = "";
				}
			}
		},
		[onSuccess, uploadTarget],
	);

	const { stageRawFile, cropDialog } = useImageCropCompressFlow({
		kind: imageUploadKindFromTarget(uploadTarget.target),
		onReady: handleFile,
	});

	async function handleRemove() {
		if (!onRemove) {
			return;
		}
		setRemoving(true);
		try {
			await onRemove();
			setSavedUrl(null);
			setLocalPreviewUrl(null);
			if (uploadTarget.target === "avatar") {
				broadcastAvatarCleared();
				await refreshAuthSession({ imageUrl: null });
			}
			toast.success("Image removed.");
			onSuccess?.("");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not remove image.",
			);
		} finally {
			setRemoving(false);
		}
	}

	return (
		<>
			{cropDialog}
			<Field>
				<FieldLabel>{label}</FieldLabel>
				{description ? (
					<FieldDescription className="mb-2">{description}</FieldDescription>
				) : null}

				<input
					ref={inputRef}
					type="file"
					accept={ACCEPT_IMAGE_MIME}
					className="sr-only"
					disabled={disabled || uploading || removing}
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file) {
							stageRawFile(file);
						}
						if (inputRef.current) {
							inputRef.current.value = "";
						}
					}}
				/>

				{displayUrl ? (
					<div className="flex w-full flex-col gap-2">
						<FullWidthImagePreview
							src={displayUrl}
							alt=""
							size={previewSize}
							onReplace={() => inputRef.current?.click()}
							onRemove={onRemove ? () => void handleRemove() : undefined}
						/>
						{uploading ? (
							<p className="text-muted-foreground text-xs">Uploading…</p>
						) : null}
					</div>
				) : (
					<LoadingButton
						type="button"
						variant="outline"
						size="sm"
						className="w-fit gap-1.5"
						loading={uploading}
						disabled={disabled || removing}
						onClick={() => inputRef.current?.click()}
					>
						<ImagePlus className="size-4" aria-hidden />
						Upload image
					</LoadingButton>
				)}
			</Field>
		</>
	);
}

/** Upload after the entity exists (e.g. right after create). */
export async function uploadImageForEntity(
	file: File,
	target: EntityImageUploadTarget,
): Promise<void> {
	await uploadEntityImage(file, target);
}
