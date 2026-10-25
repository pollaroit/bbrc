import type { AllowedImageMime } from "@/lib/storage/image-upload-limits";
import {
	MAX_IMAGE_BYTES,
	parseAllowedImageMime,
} from "@/lib/storage/image-upload-limits";

export type EntityImageUploadTarget =
	| { target: "avatar" }
	| { target: "post-image"; postSlug: string }
	| { target: "comment-image"; commentSlug: string }
	| { target: "feedback-image"; feedbackSlug: string }
	| { target: "shelf-cover"; shelfSlug: string; ownerUsername?: string };

export type EntityImageUploadResult = {
	publicUrl: string;
};

function validateFile(file: File): AllowedImageMime {
	const contentType = parseAllowedImageMime(file.type);
	if (!contentType) {
		throw new Error("Use JPEG, PNG, or WebP.");
	}
	if (file.size > MAX_IMAGE_BYTES) {
		throw new Error("Image must be 2 MB or smaller.");
	}
	return contentType;
}

export async function uploadEntityImage(
	file: File,
	target: EntityImageUploadTarget,
): Promise<EntityImageUploadResult> {
	validateFile(file);

	const formData = new FormData();
	formData.append("file", file);
	formData.append("target", target.target);

	if (target.target === "post-image") {
		formData.append("postSlug", target.postSlug);
	} else if (target.target === "comment-image") {
		formData.append("commentSlug", target.commentSlug);
	} else if (target.target === "feedback-image") {
		formData.append("feedbackSlug", target.feedbackSlug);
	} else if (target.target === "shelf-cover") {
		formData.append("shelfSlug", target.shelfSlug);
		if (target.ownerUsername) {
			formData.append("ownerUsername", target.ownerUsername);
		}
	}

	const response = await fetch("/api/storage/upload", {
		method: "POST",
		body: formData,
	});

	const body = (await response.json().catch(() => null)) as {
		publicUrl?: string;
		error?: string;
	} | null;

	if (!response.ok) {
		throw new Error(body?.error ?? `Upload failed (${response.status})`);
	}

	if (!body?.publicUrl) {
		throw new Error("Upload did not return a public URL.");
	}

	return { publicUrl: body.publicUrl };
}
