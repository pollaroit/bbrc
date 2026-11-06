import { isClubCoverId, newClubCoverId } from "./book-cover";
import type { BookDbClient } from "./book-reading-prerequisites";

/**
 * A manual book has no Open Library record to take its page count and cover from, so
 * its primary edition is the source of truth: `Book.pages` and the book's cover follow
 * it. Call this after anything that changes the primary edition or its pages or cover.
 * Open Library books keep editing both directly, so this leaves them alone.
 */
export async function syncBookFromPrimaryEdition(
	tx: BookDbClient,
	bookId: string,
): Promise<void> {
	const book = await tx.book.findUnique({
		where: { id: bookId },
		select: {
			source: true,
			coverId: true,
			customCoverUrl: true,
			primaryEdition: { select: { pages: true, coverUrl: true } },
		},
	});
	if (book?.source !== "manual" || !book.primaryEdition) return;

	const { pages, coverUrl } = book.primaryEdition;

	if (!coverUrl) {
		await tx.book.update({
			where: { id: bookId },
			data: { pages, customCoverUrl: null, coverId: null },
		});
		return;
	}

	// The same file keeps its id (cached forever); a new file gets a new one.
	const unchanged =
		book.customCoverUrl === coverUrl && isClubCoverId(book.coverId);
	await tx.book.update({
		where: { id: bookId },
		data: {
			pages,
			customCoverUrl: coverUrl,
			coverId: unchanged ? book.coverId : await newClubCoverId(tx),
		},
	});
}
