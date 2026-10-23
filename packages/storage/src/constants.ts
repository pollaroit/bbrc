export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const ALLOWED_DOCUMENT_MIME_TYPES = [
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/epub+zip",
] as const;

export const DOCUMENT_FILE_EXTENSIONS = ["pdf", "docx", "epub"] as const;

export type DocumentFileExtension = (typeof DOCUMENT_FILE_EXTENSIONS)[number];

/** Matches a stored book-document key or URL by extension. */
export const DOCUMENT_KEY_EXTENSION_PATTERN = /\.(pdf|docx|epub)$/;

export type AllowedDocumentMimeType =
	(typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

/** Presigned PUT lifetime (seconds). */
export const DEFAULT_PRESIGN_EXPIRES_SECONDS = 10 * 60;
