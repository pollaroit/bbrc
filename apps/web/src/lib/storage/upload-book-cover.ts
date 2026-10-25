import { MAX_IMAGE_BYTES } from "@/lib/storage/image-upload-limits";

/**
 * Uploads a finished (cropped, WebP) book cover and returns its public URL.
 * Admins only; the book itself is updated when the book is saved.
 */
export async function uploadBookCover(
	file: File,
): Promise<{ publicUrl: string }> {
	if (file.type !== "image/webp") {
		throw new Error("The cover must be a WebP image.");
	}
	if (file.size > MAX_IMAGE_BYTES) {
		throw new Error("Image must be 2 MB or smaller.");
	}

	const formData = new FormData();
	formData.append("file", file);
	formData.append("target", "book-cover");

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
