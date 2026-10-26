import type { Database } from "@bbrc/db";
import {
	buildObjectKey,
	buildPublicObjectUrl,
	createR2Client,
	getStorageEnv,
	loadR2ConfigFromEnv,
	putObjectBuffer,
} from "@bbrc/storage";
import { ORPCError } from "@orpc/server";
import { isRasterImage, safeFetch } from "../../modules/link-unfurl/safe-fetch";
import type { PhotoSuggestion } from "./parse";
import { type AuthorSources, defaultAuthorSources } from "./sources";

const PHOTO_SOURCE_MAX_BYTES = 6 * 1024 * 1024;
const PHOTO_WIDTH = 800;
const PHOTO_MAX_BYTES = 400 * 1024;

/**
 * A Wikimedia Commons photo for the author (the image on their Wikidata record), with its
 * credit and licence. A suggestion only: nothing is stored until an admin applies it.
 */
export async function suggestAuthorPhoto(
	db: Database,
	authorId: string,
	sources: AuthorSources = defaultAuthorSources,
): Promise<PhotoSuggestion | null> {
	const author = await db.author.findUnique({
		where: { id: authorId },
		select: { wikidataId: true },
	});
	if (!author?.wikidataId) return null;
	const record = await sources.wikidataAuthor(author.wikidataId);
	if (!record?.imageFile) return null;
	return sources.commonsPhoto(record.imageFile);
}

async function toPhotoWebp(input: Buffer): Promise<Buffer | null> {
	try {
		const { default: sharp } = await import("sharp");
		for (const quality of [82, 70, 58, 46]) {
			const out = await sharp(input, { limitInputPixels: 60_000_000 })
				.rotate()
				.resize({ width: PHOTO_WIDTH, withoutEnlargement: true })
				.webp({ quality })
				.toBuffer();
			if (out.length <= PHOTO_MAX_BYTES) return out;
		}
		return null;
	} catch {
		return null;
	}
}

/** Copies a suggested photo into our storage (small WebP) and returns OUR public address. */
export async function storeSuggestedPhoto(
	suggestion: PhotoSuggestion,
): Promise<string> {
	const config = loadR2ConfigFromEnv();
	if (!config) {
		throw new ORPCError("PRECONDITION_FAILED", {
			message: "Object storage is not configured",
		});
	}
	const fetched = await safeFetch(suggestion.imageUrl, {
		allowType: isRasterImage,
		maxBytes: PHOTO_SOURCE_MAX_BYTES,
		onTooLarge: "fail",
		timeoutMs: 20_000,
		accept: "image/jpeg,image/png,image/webp",
	}).catch(() => null);
	if (!fetched) {
		throw new ORPCError("BAD_GATEWAY", {
			message: "Could not download that photo.",
		});
	}
	const webp = await toPhotoWebp(fetched.body);
	if (!webp) {
		throw new ORPCError("BAD_GATEWAY", {
			message: "That photo could not be prepared.",
		});
	}
	const key = buildObjectKey(getStorageEnv(), {
		kind: "author-photo",
		photoUid: crypto.randomUUID(),
	});
	await putObjectBuffer(createR2Client(config), config, {
		key,
		body: webp,
		contentType: "image/webp",
	});
	return buildPublicObjectUrl(config, key);
}

/** The photo must be a file we stored ourselves under `authors/`. */
export function assertOwnPhotoUrl(url: string): void {
	const config = loadR2ConfigFromEnv();
	const base = config?.publicBaseUrl.replace(/\/$/, "");
	const clean = url.split("?")[0] ?? "";
	if (
		!base ||
		!clean.startsWith(`${base}/`) ||
		!clean.includes("/authors/") ||
		!clean.endsWith(".webp")
	) {
		throw new ORPCError("BAD_REQUEST", {
			message: "That photo was not uploaded here. Upload it again.",
		});
	}
}
