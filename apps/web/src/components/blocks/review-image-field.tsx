"use client";

import { Button } from "@bbrc/ui/components/button";
import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	PendingImageAttachment,
	usePendingImageInput,
} from "@/components/blocks/pending-image-attachment";
import { SingleImageUploadField } from "@/components/blocks/single-image-upload-field";
import { invalidateFeedbackQueries } from "@/lib/feedback/invalidate-feedback-queries";
import { uploadEntityImage } from "@/lib/storage/upload-entity-image";
import { orpc } from "@/utils/orpc";

/*
 * One image on a review, like a post.
 *
 * - Writing a new review: pick a photo (cropped and compressed); it is only
 *   uploaded after the review is saved (`uploadReviewImage`), because the image
 *   belongs to a review that does not exist yet.
 * - Editing a review: the review exists, so a photo is uploaded as soon as it is
 *   chosen, and can be replaced or removed on the spot.
 */

type CreateProps = {
	mode: "create";
	file: File | null;
	onFileChange: (file: File | null) => void;
	disabled?: boolean;
};

type EditProps = {
	mode: "edit";
	feedbackSlug: string | undefined;
	currentUrl: string | null | undefined;
	disabled?: boolean;
};

export type ReviewImageFieldProps = CreateProps | EditProps;

export function ReviewImageField(props: ReviewImageFieldProps) {
	return props.mode === "create" ? (
		<CreateReviewImage {...props} />
	) : (
		<EditReviewImage {...props} />
	);
}

function CreateReviewImage({ file, onFileChange, disabled }: CreateProps) {
	const { input, inputRef, openPicker, cropDialog } = usePendingImageInput(
		onFileChange,
		{ disabled, variant: "feedback" },
	);

	return (
		<div className="flex flex-col gap-2">
			{input}
			{cropDialog}
			<PendingImageAttachment
				variant="feedback"
				file={file}
				onFileChange={onFileChange}
				disabled={disabled}
				inputRef={inputRef}
				size="compact"
			/>
			{file ? null : (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-fit"
					disabled={disabled}
					onClick={openPicker}
				>
					<ImagePlus data-icon="inline-start" aria-hidden />
					Add a photo
				</Button>
			)}
		</div>
	);
}

function EditReviewImage({ feedbackSlug, currentUrl, disabled }: EditProps) {
	const router = useRouter();
	if (!feedbackSlug) return null;
	return (
		<SingleImageUploadField
			label="Photo"
			description="One image, JPEG, PNG or WebP up to 2 MB."
			currentUrl={currentUrl}
			disabled={disabled}
			uploadTarget={{ target: "feedback-image", feedbackSlug }}
			onSuccess={() => {
				void invalidateFeedbackQueries();
				router.refresh();
			}}
			onRemove={async () => {
				await orpc.storage.removeFeedbackImage.call({ feedbackSlug });
				void invalidateFeedbackQueries();
				router.refresh();
			}}
		/>
	);
}

/**
 * Uploads the photo picked while writing a new review. The review is already
 * saved by now, so a failure never loses it: the member is told to add the
 * photo again from the edit dialog.
 */
export async function uploadReviewImage(
	file: File,
	feedbackSlug: string,
): Promise<boolean> {
	try {
		await uploadEntityImage(file, { target: "feedback-image", feedbackSlug });
		void invalidateFeedbackQueries();
		return true;
	} catch (error) {
		toast.error(
			error instanceof Error
				? `Review saved, but the image upload failed: ${error.message}. Add it again by editing your review.`
				: "Review saved, but the image upload failed. Add it again by editing your review.",
		);
		return false;
	}
}
