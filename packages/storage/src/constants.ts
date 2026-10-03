export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf"] as const;

export type AllowedDocumentMimeType =
	(typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

/** Presigned PUT lifetime (seconds). */
export const DEFAULT_PRESIGN_EXPIRES_SECONDS = 10 * 60;
