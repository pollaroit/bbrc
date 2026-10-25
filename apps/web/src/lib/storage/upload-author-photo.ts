import {
	MAX_IMAGE_BYTES,
	parseAllowedImageMime,
} from "@/lib/storage/image-upload-limits";

/** Uploads a finished (cropped) author photo and returns its public URL. Admins only. */
export async function uploadAuthorPhoto(
	file: File,
): Promise<{ publicUrl: string }> {
	if (!parseAllowedImageMime(file.type)) {
		throw new Error("Use a JPEG, PNG or WebP photo.");
	}
	if (file.size > MAX_IMAGE_BYTES) {
		throw new Error("The photo must be 2 MB or smaller.");
	}

	const formData = new FormData();
	formData.append("file", file);
	formData.append("target", "author-photo");

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
		throw new Error("The upload did not return an address for the photo.");
	}
	return { publicUrl: body.publicUrl };
}
