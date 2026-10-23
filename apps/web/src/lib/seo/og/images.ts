import { absoluteUrl } from "../site";

const FETCH_TIMEOUT_MS = 3500;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const SUPPORTED = new Set(["image/jpeg", "image/png", "image/gif"]);

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
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!response.ok) {
			return null;
		}

		const type = response.headers.get("content-type")?.split(";")[0]?.trim();
		if (!type || !SUPPORTED.has(type)) {
			return null;
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
			return null;
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
