import { absoluteUrl } from "../site";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const FETCH_TIMEOUT_MS_COLD = 6000;

/** Converts WebP/AVIF (anything sharp can read) to a JPEG data URI. */
async function reencodeAsJpeg(input: Buffer): Promise<string | null> {
	try {
		const { default: sharp } = await import("sharp");
		const jpeg = await sharp(input)
			.resize({ width: 960, withoutEnlargement: true })
			.flatten({ background: "#0b0b0c" })
			.jpeg({ quality: 84 })
			.toBuffer();
		return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
	} catch {
		return null;
	}
}

/** Content type from the first bytes, since storage often reports a generic one. */
function sniffImageType(bytes: Buffer): string | null {
	if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
		return "image/jpeg";
	}
	if (
		bytes.length > 7 &&
		bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
	) {
		return "image/png";
	}
	if (bytes.length > 5 && bytes.subarray(0, 3).toString("latin1") === "GIF") {
		return "image/gif";
	}
	return null;
}

/**
 * Downloads an image and returns it as a data URI the OG renderer can embed.
 * Returns null on any problem (timeout, 404, WebP, too large) so a missing
 * picture never breaks the card; the layout falls back gracefully.
 */
export async function ogImageData(
	url: string | null | undefined,
): Promise<string | null> {
	if (!url?.trim()) {
		return null;
	}

	const target = url.startsWith("/") ? absoluteUrl(url) : url;

	try {
		const response = await fetch(target, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS_COLD),
		});
		if (!response.ok) {
			return null;
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
			return null;
		}

		const type = sniffImageType(buffer);
		if (!type) {
			// Uploads are stored as WebP, which the renderer can't draw: re-encode.
			return await reencodeAsJpeg(buffer);
		}

		return `data:${type};base64,${buffer.toString("base64")}`;
	} catch {
		return null;
	}
}

/** Fetches several images at once; failed ones are dropped. */
export async function ogImagesData(
	urls: (string | null | undefined)[],
): Promise<string[]> {
	const loaded = await Promise.all(urls.map((url) => ogImageData(url)));
	return loaded.filter((entry): entry is string => entry != null);
}
