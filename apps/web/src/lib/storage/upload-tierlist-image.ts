import { MAX_IMAGE_BYTES } from "@/lib/storage/image-upload-limits";

/**
 * Uploads a finished (cropped, WebP) tierlist picture and returns its public
 * URL. Any signed-in member; the picture is attached when the tierlist is
 * published with its post.
 */
export async function uploadTierlistImage(
	file: File,
): Promise<{ publicUrl: string }> {
	if (file.type !== "image/webp") {
		throw new Error("The picture must be a WebP image.");
	}
	if (file.size > MAX_IMAGE_BYTES) {
		throw new Error("Image must be 2 MB or smaller.");
	}

	const formData = new FormData();
	formData.append("file", file);
	formData.append("target", "tierlist-image");

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
