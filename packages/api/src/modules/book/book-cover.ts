import type { Database, DatabaseTransaction } from "@bbrc/db";
import { loadR2ConfigFromEnv } from "@bbrc/storage";
import { appError } from "../../lib/app-error";

/**
 * Cover ids: a positive number is an Open Library cover; a NEGATIVE number is a
 * cover an admin uploaded (the file's URL is `Book.customCoverUrl`). This lets
 * every screen keep using `bookCoverUrl(coverId)`.
 */
export const isClubCoverId = (coverId: number | null | undefined) =>
	coverId != null && coverId < 0;

/** The cover must be a file we stored ourselves under `books/covers/`. */
export function assertOwnCoverUrl(url: string) {
	const config = loadR2ConfigFromEnv();
	const base = config?.publicBaseUrl.replace(/\/$/, "");
	const clean = url.split("?")[0] ?? "";
	if (
		!base ||
		!clean.startsWith(`${base}/`) ||
		!clean.includes("/books/covers/") ||
		!clean.endsWith(".webp")
	) {
		throw appError("BAD_REQUEST", "book.coverNotUploaded");
	}
}

/** A new negative id nobody uses yet (new upload, new id, so caches never go stale). */
export async function newClubCoverId(
	db: Database | DatabaseTransaction,
): Promise<number> {
	for (let attempt = 0; attempt < 5; attempt++) {
		const candidate = -(1 + Math.floor(Math.random() * 2_000_000_000));
		const taken = await db.book.findFirst({
			where: { coverId: candidate },
			select: { id: true },
		});
		if (!taken) return candidate;
	}
	throw appError("INTERNAL_SERVER_ERROR", "book.coverIdFailed");
}
