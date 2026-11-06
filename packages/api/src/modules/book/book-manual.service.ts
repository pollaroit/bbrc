import type { Database } from "@bbrc/db";
import { newMemberEditionPublicId } from "@bbrc/shared";
import { scheduleAuthorEnrichment } from "../../lib/author-enrichment/schedule";
import { setBookAuthors } from "../author-admin/author-core";
import { isbnFields } from "../book-edition/book-edition.service";
import { assertOwnEditionCoverUrl } from "../book-edition/book-edition-cover";
import {
	notifyBookAddedToLibrary,
	notifyFollowersOfNewBook,
} from "../notification/notification-triggers";
import type { AddManualBookInput } from "./book.schema";
import { attachNewBookToSeries, resolveBookAuthors } from "./book.service";
import { syncBookFromPrimaryEdition } from "./book-primary-edition";
import { syncBookReadAfterPrerequisites } from "./book-reading-prerequisites";
import { generateBookSlug } from "./book-slug";

/**
 * Adds a book Open Library does not have, together with its first edition, in one
 * transaction: both exist or neither does. The edition is created verified (an admin
 * typed it in) and becomes the book's primary edition, which supplies the page count
 * and the cover.
 */
export async function addManualBook(
	input: AddManualBookInput,
	db: Database,
	adminUserId: string,
) {
	const {
		edition,
		authorIds: inputAuthorIds,
		authors: inputAuthorNames,
		readAfterBookSlugs,
		seriesSlug,
		newSeries,
		seriesPosition,
		shiftLater,
		notifyMembers,
		hidden,
		...work
	} = input;

	if (edition.coverUrl) assertOwnEditionCoverUrl(edition.coverUrl);
	const isbn = isbnFields(edition.isbn);

	let createdAuthorIds: string[] = [];
	const book = await db.$transaction(async (tx) => {
		const slug = await generateBookSlug(work.title, tx);
		const resolvedAuthors = await resolveBookAuthors(
			tx,
			{ authorIds: inputAuthorIds, authors: inputAuthorNames },
			adminUserId,
		);
		createdAuthorIds = resolvedAuthors.createdIds;

		const created = await tx.book.create({
			data: {
				...work,
				slug,
				source: "manual",
				olid: null,
				hidden: hidden ?? false,
				// The names copy; `setBookAuthors` below keeps it equal to the author records.
				authors: [],
				// Provisional: the primary edition's pages are copied in below.
				pages: edition.pages,
				subjects: work.subjects ?? [],
				countries: input.countries ?? [],
				approvedById: adminUserId,
			},
			select: { id: true, slug: true },
		});

		await setBookAuthors(tx, created.id, resolvedAuthors.authorIds);

		if (readAfterBookSlugs && readAfterBookSlugs.length > 0) {
			await syncBookReadAfterPrerequisites(created.id, readAfterBookSlugs, tx);
		}

		let publicId = newMemberEditionPublicId();
		for (let attempt = 0; attempt < 5; attempt++) {
			const taken = await tx.bookEdition.findUnique({
				where: { publicId },
				select: { id: true },
			});
			if (!taken) break;
			publicId = newMemberEditionPublicId();
		}

		const createdEdition = await tx.bookEdition.create({
			data: {
				publicId,
				bookId: created.id,
				createdById: adminUserId,
				status: "verified",
				verifiedById: adminUserId,
				verifiedAt: new Date(),
				title: edition.title ?? null,
				language: edition.language,
				pages: edition.pages,
				...isbn,
				publisher: edition.publisher ?? null,
				publishedYear: edition.publishedYear ?? null,
				format: edition.format ?? "paperback",
				translator: edition.translator ?? null,
				notes: edition.notes ?? null,
				coverUrl: edition.coverUrl ?? null,
			},
			select: { id: true },
		});

		await tx.book.update({
			where: { id: created.id },
			data: { primaryEditionId: createdEdition.id },
		});
		await syncBookFromPrimaryEdition(tx, created.id);

		const attachedSeriesSlug = await attachNewBookToSeries(tx, created.id, {
			seriesSlug,
			newSeries,
			seriesPosition,
			shiftLater,
		});

		return { ...created, seriesSlug: attachedSeriesSlug };
	});

	scheduleAuthorEnrichment(db, createdAuthorIds);

	void (async () => {
		await notifyBookAddedToLibrary(
			db,
			book.slug,
			notifyMembers === false ? { onlyUserIds: [] } : undefined,
		);
		if (notifyMembers !== false) {
			await notifyFollowersOfNewBook(db, book.slug, {
				excludeUserIds: [adminUserId],
			});
		}
	})().catch((error) => console.error("book added notices failed", error));

	return book;
}
