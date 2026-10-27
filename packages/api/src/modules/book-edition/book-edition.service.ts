import type { Database } from "@bbrc/db";
import {
	isbnPair,
	isValidIsbn,
	newMemberEditionPublicId,
	normalizeIsbn,
	openLibraryEditionKey,
} from "@bbrc/shared";
import { appError } from "../../lib/app-error";
import {
	fetchOpenLibraryEditionFull,
	resolveOpenLibraryEditionByIsbn,
} from "../../lib/open-library/edition-full";
import {
	canonicalKeyOfMember,
	editionLabelOf,
} from "../edition/edition-support";
import { tryDeleteR2PublicUrl } from "../storage/storage-r2-cleanup";
import {
	type BookEditionItem,
	MAX_EDITIONS_PER_MEMBER_PER_DAY,
} from "./book-edition.schema";
import { assertOwnEditionCoverUrl } from "./book-edition-cover";

type Actor = { id: string; isAdmin: boolean };

const editionSelect = {
	id: true,
	publicId: true,
	openLibraryOlid: true,
	bookId: true,
	title: true,
	language: true,
	pages: true,
	isbn13: true,
	isbn10: true,
	publisher: true,
	publishedYear: true,
	format: true,
	translator: true,
	coverUrl: true,
	notes: true,
	status: true,
	createdAt: true,
	verifiedAt: true,
	createdById: true,
	createdBy: { select: { username: true, name: true, image: true } },
	_count: {
		select: {
			reads: true,
			readings: { where: { finishedAt: null } },
		},
	},
} as const;

type EditionRow = {
	id: string;
	publicId: string;
	openLibraryOlid: string | null;
	bookId: string;
	title: string | null;
	language: string;
	pages: number;
	isbn13: string | null;
	isbn10: string | null;
	publisher: string | null;
	publishedYear: number | null;
	format: BookEditionItem["format"];
	translator: string | null;
	coverUrl: string | null;
	notes: string | null;
	status: "member" | "verified";
	createdAt: Date;
	verifiedAt: Date | null;
	createdById: string | null;
	createdBy: { username: string; name: string; image: string | null } | null;
	_count: { reads: number; readings: number };
};

function mapEdition(row: EditionRow, actor: Actor | null): BookEditionItem {
	const readers = row._count.reads + row._count.readings;
	const isCreator = actor != null && row.createdById === actor.id;
	return {
		id: row.id,
		publicId: row.publicId,
		key: canonicalKeyOfMember(row),
		openLibraryOlid: row.openLibraryOlid,
		title: row.title,
		language: row.language,
		pages: row.pages,
		isbn13: row.isbn13,
		isbn10: row.isbn10,
		publisher: row.publisher,
		publishedYear: row.publishedYear,
		format: row.format,
		translator: row.translator,
		coverUrl: row.coverUrl,
		notes: row.notes,
		status: row.status,
		createdAt: row.createdAt,
		verifiedAt: row.verifiedAt,
		createdBy: row.createdBy
			? { ...row.createdBy, image: row.createdBy.image ?? null }
			: null,
		readers,
		canEdit: actor != null && (actor.isAdmin || isCreator),
		canDelete: actor != null && (actor.isAdmin || (isCreator && readers === 0)),
	};
}

async function loadBook(db: Database, slug: string) {
	const book = await db.book.findUnique({
		where: { slug },
		select: { id: true, slug: true },
	});
	if (!book) throw appError("NOT_FOUND", "book.notFound");
	return book;
}

async function addsLeftToday(db: Database, userId: string) {
	const used = await db.bookEdition.count({
		where: {
			createdById: userId,
			createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
		},
	});
	return Math.max(0, MAX_EDITIONS_PER_MEMBER_PER_DAY - used);
}

export async function listBookEditions(
	db: Database,
	actor: Actor | null,
	bookSlug: string,
) {
	const book = await loadBook(db, bookSlug);
	const rows = await db.bookEdition.findMany({
		where: { bookId: book.id },
		orderBy: [{ status: "desc" }, { createdAt: "desc" }],
		select: editionSelect,
	});
	return {
		items: rows.map((row) => mapEdition(row as EditionRow, actor)),
		addsLeftToday: actor ? await addsLeftToday(db, actor.id) : null,
	};
}

type Fields = {
	title?: string | null;
	language?: string;
	pages?: number;
	isbn?: string | null;
	publisher?: string | null;
	publishedYear?: number | null;
	format?: BookEditionItem["format"];
	translator?: string | null;
	notes?: string | null;
	coverUrl?: string | null;
};

function isbnFields(isbn: string | null | undefined) {
	if (!isbn) return { isbn13: null, isbn10: null };
	const pair = isbnPair(isbn);
	return { isbn13: pair.isbn13, isbn10: pair.isbn10 ?? null };
}

async function assertNoDuplicate(
	db: Database,
	bookId: string,
	isbn13: string | null,
	exceptId?: string,
) {
	if (!isbn13) return;
	const existing = await db.bookEdition.findUnique({
		where: { bookId_isbn13: { bookId, isbn13 } },
		select: { id: true },
	});
	if (existing && existing.id !== exceptId) {
		throw appError("CONFLICT", "edition.alreadyListed", {
			data: { editionId: existing.id },
		});
	}
}

export async function createBookEdition(
	db: Database,
	actor: Actor,
	input: Fields & { bookSlug: string; language: string; pages: number },
) {
	const book = await loadBook(db, input.bookSlug);
	if ((await addsLeftToday(db, actor.id)) <= 0 && !actor.isAdmin) {
		throw appError("TOO_MANY_REQUESTS", "edition.dailyLimit", {
			params: { count: MAX_EDITIONS_PER_MEMBER_PER_DAY },
		});
	}
	const isbn = isbnFields(input.isbn);
	await assertNoDuplicate(db, book.id, isbn.isbn13);
	if (input.coverUrl) assertOwnEditionCoverUrl(input.coverUrl);

	let publicId = newMemberEditionPublicId();
	for (let attempt = 0; attempt < 5; attempt++) {
		const taken = await db.bookEdition.findUnique({
			where: { publicId },
			select: { id: true },
		});
		if (!taken) break;
		publicId = newMemberEditionPublicId();
	}

	const created = await db.bookEdition.create({
		data: {
			publicId,
			bookId: book.id,
			createdById: actor.id,
			title: input.title ?? null,
			language: input.language,
			pages: input.pages,
			...isbn,
			publisher: input.publisher ?? null,
			publishedYear: input.publishedYear ?? null,
			format: input.format ?? "paperback",
			translator: input.translator ?? null,
			notes: input.notes ?? null,
			coverUrl: input.coverUrl ?? null,
		},
		select: editionSelect,
	});
	return mapEdition(created as EditionRow, actor);
}

async function loadEdition(db: Database, id: string) {
	const row = await db.bookEdition.findUnique({
		where: { id },
		select: editionSelect,
	});
	if (!row) throw appError("NOT_FOUND", "edition.notFound");
	return row as EditionRow & { createdById: string | null };
}

async function bookIdOf(db: Database, editionId: string) {
	const row = await db.bookEdition.findUnique({
		where: { id: editionId },
		select: { bookId: true },
	});
	return row?.bookId ?? "";
}

export async function updateBookEdition(
	db: Database,
	actor: Actor,
	input: Fields & { id: string },
) {
	const existing = await loadEdition(db, input.id);
	if (!actor.isAdmin && existing.createdById !== actor.id) {
		throw appError("FORBIDDEN", "edition.onlyOwnerOrAdminEdit");
	}
	const data: Record<string, unknown> = {};
	if (input.title !== undefined) data.title = input.title;
	if (input.language !== undefined) data.language = input.language;
	if (input.pages !== undefined) data.pages = input.pages;
	if (input.publisher !== undefined) data.publisher = input.publisher;
	if (input.publishedYear !== undefined)
		data.publishedYear = input.publishedYear;
	if (input.format !== undefined) data.format = input.format;
	if (input.translator !== undefined) data.translator = input.translator;
	if (input.notes !== undefined) data.notes = input.notes;
	if (input.isbn !== undefined) {
		const isbn = isbnFields(input.isbn);
		await assertNoDuplicate(
			db,
			await bookIdOf(db, input.id),
			isbn.isbn13,
			input.id,
		);
		Object.assign(data, isbn);
	}
	let replacedCover: string | null = null;
	if (input.coverUrl !== undefined) {
		if (input.coverUrl) assertOwnEditionCoverUrl(input.coverUrl);
		if (input.coverUrl !== existing.coverUrl) replacedCover = existing.coverUrl;
		data.coverUrl = input.coverUrl;
	}
	// A member's change to a checked edition needs checking again.
	if (existing.status === "verified" && !actor.isAdmin) {
		data.status = "member";
		data.verifiedAt = null;
		data.verifiedById = null;
	}

	const updated = await db.bookEdition.update({
		where: { id: input.id },
		data,
		select: editionSelect,
	});
	void tryDeleteR2PublicUrl(replacedCover);
	return mapEdition(updated as EditionRow, actor);
}

export async function deleteBookEdition(
	db: Database,
	actor: Actor,
	id: string,
) {
	const existing = await loadEdition(db, id);
	const isCreator = existing.createdById === actor.id;
	if (!actor.isAdmin && !isCreator) {
		throw appError("FORBIDDEN", "edition.onlyOwnerOrAdminDelete");
	}
	const readers = existing._count.reads + existing._count.readings;
	if (!actor.isAdmin && readers > 0) {
		throw appError("FORBIDDEN", "edition.inUseAdminOnlyDelete");
	}
	await db.$transaction(async (tx) => {
		const full = await tx.bookEdition.findUnique({ where: { id } });
		if (full) {
			const label = editionLabelOf({
				title: full.title,
				publisher: full.publisher,
				year: full.publishedYear,
				language: full.language,
				fallback: "Own edition",
			});
			// Readings keep what the edition looked like (and move to the linked Open Library edition, if any).
			await tx.reading.updateMany({
				where: { bookEditionId: id },
				data: {
					editionLabel: label,
					editionCoverUrl: full.coverUrl,
					...(full.openLibraryOlid
						? { editionOlid: full.openLibraryOlid }
						: {}),
				},
			});
			if (full.openLibraryOlid) {
				await tx.read.updateMany({
					where: { bookEditionId: id },
					data: { editionId: full.openLibraryOlid },
				});
			}
			await tx.editionTombstone.upsert({
				where: { publicId: full.publicId },
				create: { publicId: full.publicId, bookId: full.bookId },
				update: { removedAt: new Date(), redirectKey: null },
			});
		}
		await tx.bookEdition.delete({ where: { id } });
	});
	// Our cover file is kept when readings still show it.
	const stillShown = await db.reading.count({
		where: { editionCoverUrl: existing.coverUrl ?? "__none__" },
	});
	if (stillShown === 0) void tryDeleteR2PublicUrl(existing.coverUrl);
}

export async function setBookEditionVerified(
	db: Database,
	actor: Actor,
	id: string,
	verified: boolean,
) {
	await loadEdition(db, id);
	await db.bookEdition.update({
		where: { id },
		data: verified
			? { status: "verified", verifiedAt: new Date(), verifiedById: actor.id }
			: { status: "member", verifiedAt: null, verifiedById: null },
	});
}

/** Folds a duplicate into the edition to keep: its readings and reads move over. */
export async function mergeBookEditions(
	db: Database,
	fromId: string,
	intoId: string,
) {
	if (fromId === intoId) {
		throw appError("BAD_REQUEST", "edition.pickTwoDifferent");
	}
	const [from, into] = await Promise.all([
		db.bookEdition.findUnique({ where: { id: fromId } }),
		db.bookEdition.findUnique({ where: { id: intoId } }),
	]);
	if (!from || !into) {
		throw appError("NOT_FOUND", "edition.notFound");
	}
	if (from.bookId !== into.bookId) {
		throw appError("BAD_REQUEST", "edition.differentBooks");
	}
	let copiedCover = false;
	await db.$transaction(async (tx) => {
		await tx.reading.updateMany({
			where: { bookEditionId: fromId },
			data: { bookEditionId: intoId, totalPages: into.pages },
		});
		await tx.read.updateMany({
			where: { bookEditionId: fromId },
			data: { bookEditionId: intoId },
		});
		// Keep what the kept edition lacks.
		const fill: Record<string, unknown> = {};
		if (!into.coverUrl && from.coverUrl) {
			fill.coverUrl = from.coverUrl;
			copiedCover = true;
		}
		if (!into.isbn13 && from.isbn13) {
			fill.isbn13 = from.isbn13;
			fill.isbn10 = from.isbn10;
		}
		if (!into.publisher && from.publisher) fill.publisher = from.publisher;
		if (!into.publishedYear && from.publishedYear) {
			fill.publishedYear = from.publishedYear;
		}
		// The old address keeps working: it points at the edition we kept.
		await tx.editionTombstone.upsert({
			where: { publicId: from.publicId },
			create: {
				publicId: from.publicId,
				bookId: from.bookId,
				redirectKey: canonicalKeyOfMember(into),
			},
			update: {
				removedAt: new Date(),
				redirectKey: canonicalKeyOfMember(into),
			},
		});
		// The ISBN must be free before it can move.
		await tx.bookEdition.delete({ where: { id: fromId } });
		if (Object.keys(fill).length > 0) {
			await tx.bookEdition.update({ where: { id: intoId }, data: fill });
		}
	});
	if (!copiedCover) void tryDeleteR2PublicUrl(from.coverUrl);
}

/** Admin: say this member edition is the same as an Open Library one (or unlink them). */
export async function linkBookEdition(
	db: Database,
	id: string,
	openLibraryOlid: string | null,
) {
	const edition = await loadEdition(db, id);
	const book = await db.book.findUnique({
		where: { id: edition.bookId },
		select: { olid: true },
	});
	if (openLibraryOlid == null) {
		await db.bookEdition.update({
			where: { id },
			data: { openLibraryOlid: null },
		});
		return;
	}
	const full = await fetchOpenLibraryEditionFull(openLibraryOlid);
	if (!full || (full.workOlid && full.workOlid !== book?.olid)) {
		throw appError("BAD_REQUEST", "edition.openLibraryEditionNotFound");
	}
	const taken = await db.bookEdition.findFirst({
		where: { openLibraryOlid, NOT: { id } },
		select: { id: true },
	});
	if (taken) {
		throw appError("CONFLICT", "edition.openLibraryEditionLinked");
	}
	await db.bookEdition.update({ where: { id }, data: { openLibraryOlid } });
}

/** Tells the add dialog when an ISBN already exists, so it can offer the existing edition. */
export async function checkEditionIsbn(
	db: Database,
	bookSlug: string,
	rawIsbn: string,
) {
	const empty = { openLibrary: null, member: null };
	if (!isValidIsbn(rawIsbn)) return empty;
	const isbn = normalizeIsbn(rawIsbn);
	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: { id: true, olid: true },
	});
	if (!book) throw appError("NOT_FOUND", "book.notFound");

	const pair = isbnPair(isbn);
	const [memberRow, found] = await Promise.all([
		db.bookEdition.findFirst({
			where: {
				bookId: book.id,
				OR: [{ isbn13: pair.isbn13 ?? isbn }, { isbn10: pair.isbn10 ?? isbn }],
			},
			select: {
				publicId: true,
				openLibraryOlid: true,
				title: true,
				publisher: true,
				publishedYear: true,
				language: true,
			},
		}),
		resolveOpenLibraryEditionByIsbn(isbn),
	]);

	return {
		member: memberRow
			? {
					key: canonicalKeyOfMember(memberRow),
					label: editionLabelOf({
						title: memberRow.title,
						publisher: memberRow.publisher,
						year: memberRow.publishedYear,
						language: memberRow.language,
						fallback: "Member edition",
					}),
				}
			: null,
		openLibrary:
			found && (!found.workOlid || found.workOlid === book.olid)
				? {
						key: openLibraryEditionKey(found.olid),
						label: editionLabelOf({
							title: found.title,
							publisher: found.publishers[0] ?? null,
							year: found.publishedYear,
							language: found.languageKeys[0] ?? null,
							fallback: found.olid,
						}),
					}
				: null,
	};
}
