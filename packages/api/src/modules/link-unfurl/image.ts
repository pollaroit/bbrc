import {
	buildObjectKey,
	buildPublicObjectUrl,
	createR2Client,
	getStorageEnv,
	loadR2ConfigFromEnv,
	putObjectBuffer,
} from "@bbrc/storage";
import { isRasterImage, safeFetch } from "./safe-fetch";

/** Largest picture we will download from another site. */
export const PREVIEW_IMAGE_SOURCE_MAX_BYTES = 2 * 1024 * 1024;
/** What we keep: at most this wide and this heavy. */
export const PREVIEW_IMAGE_WIDTH = 600;
export const PREVIEW_IMAGE_MAX_BYTES = 300 * 1024;
const QUALITY_STEPS = [80, 68, 56, 44, 34] as const;
const MIN_SOURCE_WIDTH = 100;
const MAX_INPUT_PIXELS = 40_000_000;

/**
 * Makes the small WebP we keep from a downloaded picture: at most 600 px wide,
 * under 300 KB (quality is lowered step by step, then the width). Null when it
 * is not a usable picture (unreadable, too small to be a real picture, too heavy).
 */
export async function toPreviewWebp(input: Buffer): Promise<Buffer | null> {
	try {
		const { default: sharp } = await import("sharp");
		const meta = await sharp(input, {
			limitInputPixels: MAX_INPUT_PIXELS,
		}).metadata();
		if (!meta.width || !meta.height || meta.width < MIN_SOURCE_WIDTH)
			return null;
		for (const width of [PREVIEW_IMAGE_WIDTH, 480]) {
			for (const quality of QUALITY_STEPS) {
				const out = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
					.rotate()
					.resize({ width, withoutEnlargement: true })
					.webp({ quality })
					.toBuffer();
				if (out.length <= PREVIEW_IMAGE_MAX_BYTES) return out;
			}
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Copies a page's picture into our own storage and returns OUR public address.
 * Anything that goes wrong returns null: the preview just has no picture.
 */
export async function storePreviewImage(
	imageUrl: string,
	urlHash: string,
): Promise<string | null> {
	const config = loadR2ConfigFromEnv();
	if (!config) return null;
	try {
		const fetched = await safeFetch(imageUrl, {
			allowType: isRasterImage,
			maxBytes: PREVIEW_IMAGE_SOURCE_MAX_BYTES,
			onTooLarge: "fail",
			timeoutMs: 3000,
			accept: "image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.8",
		});
		if (!fetched) return null;
		const webp = await toPreviewWebp(fetched.body);
		if (!webp) return null;
		const key = buildObjectKey(getStorageEnv(), {
			kind: "link-preview",
			urlHash,
		});
		await putObjectBuffer(createR2Client(config), config, {
			key,
			body: webp,
			contentType: "image/webp",
		});
		return buildPublicObjectUrl(config, key);
	} catch {
		return null;
	}
}
