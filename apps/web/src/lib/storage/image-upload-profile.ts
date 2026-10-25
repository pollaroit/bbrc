import type { OutputImageMime } from "@/lib/storage/compress-image";
import type { EntityImageUploadTarget } from "@/lib/storage/upload-entity-image";

export type ImageUploadKind =
	| "avatar"
	| "shelf-cover"
	| "post-image"
	| "comment-image"
	| "feedback-image";

export type ImageUploadProfile = {
	kind: ImageUploadKind;
	/** Fixed aspect ratio; omit for free-form crop. */
	aspect?: number;
	maxEdge: number;
	cropTitle: string;
	cropDescription: string;
	outputMimeTypes: readonly OutputImageMime[];
};

const profiles: Record<ImageUploadKind, ImageUploadProfile> = {
	avatar: {
		kind: "avatar",
		aspect: 1,
		maxEdge: 512,
		cropTitle: "Crop profile photo",
		cropDescription: "Square crop. We compress the image before upload.",
		outputMimeTypes: ["image/jpeg"],
	},
	"shelf-cover": {
		kind: "shelf-cover",
		aspect: 1,
		maxEdge: 1024,
		cropTitle: "Crop shelf cover",
		cropDescription: "Square crop. We compress the image before upload.",
		outputMimeTypes: ["image/jpeg"],
	},
	"post-image": {
		kind: "post-image",
		maxEdge: 1920,
		cropTitle: "Crop post photo",
		cropDescription: "Adjust the frame, then upload a compressed image.",
		outputMimeTypes: ["image/webp", "image/jpeg"],
	},
	"feedback-image": {
		kind: "feedback-image",
		maxEdge: 1600,
		cropTitle: "Crop review photo",
		cropDescription: "Adjust the frame, then upload a compressed image.",
		outputMimeTypes: ["image/webp", "image/jpeg"],
	},
	"comment-image": {
		kind: "comment-image",
		maxEdge: 1600,
		cropTitle: "Crop comment photo",
		cropDescription: "Adjust the frame, then upload a compressed image.",
		outputMimeTypes: ["image/webp", "image/jpeg"],
	},
};

export function imageUploadKindFromTarget(
	target: EntityImageUploadTarget["target"],
): ImageUploadKind {
	return target;
}

export function getImageUploadProfile(
	kind: ImageUploadKind,
): ImageUploadProfile {
	return profiles[kind];
}
