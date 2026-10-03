/** Keep in sync with @bbrc/storage MAX_IMAGE_SIZE (avoid importing AWS SDK on client). */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const ACCEPT_IMAGE_MIME = "image/jpeg,image/png,image/webp" as const;

export type AllowedImageMime = "image/jpeg" | "image/png" | "image/webp";

export function parseAllowedImageMime(type: string): AllowedImageMime | null {
	if (type === "image/jpeg" || type === "image/png" || type === "image/webp") {
		return type;
	}
	return null;
}
