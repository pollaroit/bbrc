import type { Database, DatabaseTransaction } from "@bbrc/db";
import {
	clubDayKey,
	type PaceResult,
	readingPace,
	readingStats,
	resolveClubTimeZone,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { activeParticipationWhere } from "../sitting/participation-active";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import type {
	ReadingBookState,
	ReadingItem,
	ReadingStatsOutput,
} from "./reading.schema";
import { removeBookFromWishlist } from "./wishlist.service";

type Db = Database | DatabaseTransaction;

/** How many books a member can be reading at once. */
export const MAX_ACTIVE_READINGS = 5;

const readingSelect = {
	id: true,
	startedAt: true,
	updatedAt: true,
	finishedAt: true,
	percent: true,
	currentPage: true,
	totalPages: true,
	editionOlid: true,
	editionCoverId: true,
	editionLabel: true,
	bookEditionId: true,
	bookEdition: {
		select: {
			id: true,
			title: true,
			language: true,
			pages: true,
			coverUrl: true,
			publisher: true,
			publishedYear: true,
		},
	},
	book: {
		select: {
			id: true,
			slug: true,
			title: true,
			authors: true,
			coverId: true,
			pages: true,
		},
	},
	logs: {
		orderBy: { createdAt: "desc" as const },
		take: 40,
		select: { createdAt: true, percent: true, page: true },
	},
} as const;

type ReadingRow = {
	id: string;
	startedAt: Date;
	updatedAt: Date;
	finishedAt: Date | null;
	percent: number;
	currentPage: number | null;
	totalPages: number | null;
	editionOlid: string | null;
	editionCoverId: number | null;
	editionLabel: string | null;
	bookEdition: {
		id: string;
		title: string | null;
		language: string;
		pages: number;
		coverUrl: string | null;
		publisher: string | null;
		publishedYear: number | null;
	} | null;
	book: {
		id: string;
		slug: string;
		title: string;
		authors: string[];
		coverId: number | null;
		pages: number;
	};
	logs: { createdAt: Date; percent: number; page: number | null }[];
};

export function mapEdition(row: ReadingRow): ReadingItem["edition"] {
	if (row.bookEdition) {
		const edition = row.bookEdition;
		const parts = [
			edition.title,
			edition.publisher,
			edition.publishedYear ? String(edition.publishedYear) : null,
			edition.language,
		].filter(Boolean);
		return {
			kind: "member",
			olid: null,
			memberEditionId: edition.id,
			label: parts.join(" · ") || "Member-added edition",
			coverId: null,
			coverUrl: edition.coverUrl,
			language: edition.language,
			pages: edition.pages,
		};
	}
	if (row.editionOlid) {
		return {
			kind: "open_library",
			olid: row.editionOlid,
			memberEditionId: null,
			label: row.editionLabel,
			coverId: row.editionCoverId,
			coverUrl: null,
			language: null,
			pages: row.totalPages,
		};
	}
	return null;
}

function toPace(
	row: ReadingRow,
	deadline: Date | null,
	now: Date,
): ReadingItem["pace"] {
	if (row.finishedAt) return null;
	const pace: PaceResult = readingPace({
		percent: row.percent,
		totalPages: row.totalPages,
		currentPage: row.currentPage,
		startedAt: row.startedAt,
		logs: row.logs.map((log) => ({
			at: log.createdAt,
			percent: log.percent,
			page: log.page,
		})),
		deadline,
		now,
	});
	return pace;
}

type SittingLink = { slug: string; deadline: Date; status: "reading" };

/** Sittings in their reading phase whose pick is this book and that the member is in. */
async function sittingsFor(
	db: Db,
	userId: string,
	bookIds: string[],
): Promise<Map<string, SittingLink>> {
	if (bookIds.length === 0) return new Map();
	const sittings = await db.sitting.findMany({
		where: {
			status: "reading",
			selectedBookId: { in: bookIds },
			participants: { some: { userId, ...activeParticipationWhere } },
		},
		select: { slug: true, deadline: true, selectedBookId: true },
	});
	return new Map(
		sittings.flatMap((sitting) =>
			sitting.selectedBookId
				? [
						[
							sitting.selectedBookId,
							{
								slug: sitting.slug,
								deadline: sitting.deadline,
								status: "reading" as const,
							},
						] as const,
					]
				: [],
		),
	);
}

function mapReading(
	row: ReadingRow,
	sitting: SittingLink | undefined,
	now: Date,
): ReadingItem {
	return {
		id: row.id,
		startedAt: row.startedAt,
		updatedAt: row.updatedAt,
		finishedAt: row.finishedAt,
		percent: row.percent,
		currentPage: row.currentPage,
		totalPages: row.totalPages,
		book: {
			slug: row.book.slug,
			title: row.book.title,
			authors: row.book.authors,
			coverId: row.book.coverId,
			pages: row.book.pages,
		},
		edition: mapEdition(row),
		sitting: sitting
			? {
					slug: sitting.slug,
					deadline: sitting.deadline,
					status: sitting.status,
				}
			: null,
		pace: toPace(row, sitting?.deadline ?? null, now),
	};
}

async function loadBook(db: Db, slug: string) {
	const book = await db.book.findUnique({
		where: { slug },
		select: { id: true, slug: true, title: true, pages: true },
	});
	if (!book) {
		throw new ORPCError("NOT_FOUND", { message: "Book not found" });
	}
	return book;
}

async function loadOwnReading(db: Db, userId: string, id: string) {
	const row = await db.reading.findUnique({
		where: { id },
		select: { ...readingSelect, userId: true },
	});
	if (!row || row.userId !== userId) {
		throw new ORPCError("NOT_FOUND", { message: "Reading not found" });
	}
	return row;
}

export async function listMyReadings(
	db: Database,
	userId: string,
): Promise<ReadingItem[]> {
	const rows = await db.reading.findMany({
		where: { userId, finishedAt: null },
		orderBy: { updatedAt: "desc" },
		select: readingSelect,
	});
	const now = new Date();
	const sittings = await sittingsFor(
		db,
		userId,
		rows.map((row) => row.book.id),
	);
	// The sitting's book comes first.
	return rows
		.map((row) => mapReading(row, sittings.get(row.book.id), now))
		.sort((a, b) => Number(Boolean(b.sitting)) - Number(Boolean(a.sitting)));
}

export async function getReadingBookState(
	db: Database,
	userId: string,
	bookSlug: string,
): Promise<ReadingBookState> {
	const book = await loadBook(db, bookSlug);
	const [read, wishlist, reading, activeCount] = await Promise.all([
		db.read.findUnique({
			where: { userId_bookId: { userId, bookId: book.id } },
			select: { userId: true },
		}),
		db.shelfBook.findFirst({
			where: { bookId: book.id, shelf: { userId, isWishlist: true } },
			select: { id: true },
		}),
		db.reading.findFirst({
			where: { userId, bookId: book.id, finishedAt: null },
			select: readingSelect,
		}),
		db.reading.count({ where: { userId, finishedAt: null } }),
	]);
	const sittings = reading
		? await sittingsFor(db, userId, [book.id])
		: new Map<string, SittingLink>();
	return {
		hasRead: read != null,
		inWishlist: wishlist != null,
		reading: reading
			? mapReading(reading, sittings.get(book.id), new Date())
			: null,
		activeCount,
	};
}

// ── Sitting sync ───────────────────────────────────────────────────────────

/** Starting a book you are reading with a sitting makes you "in progress" there. */
async function syncSittingsOnStart(db: Db, userId: string, bookId: string) {
	await db.participation.updateMany({
		where: {
			userId,
			...activeParticipationWhere,
			progress: "not_started",
			sitting: { selectedBookId: bookId, status: "reading" },
		},
		data: { progress: "in_progress" },
	});
}

/** Dropping the reading puts the sitting back to "not started". */
async function syncSittingsOnAbandon(db: Db, userId: string, bookId: string) {
	await db.participation.updateMany({
		where: {
			userId,
			...activeParticipationWhere,
			progress: "in_progress",
			sitting: { selectedBookId: bookId, status: "reading" },
		},
		data: { progress: "not_started" },
	});
}

/**
 * A sitting just entered its reading phase: members who already have this book
 * going become "in progress" there.
 */
export async function syncParticipationWithActiveReadings(
	db: Db,
	sittingId: string,
	bookId: string,
) {
	const readings = await db.reading.findMany({
		where: { bookId, finishedAt: null },
		select: { userId: true },
	});
	if (readings.length === 0) return;
	await db.participation.updateMany({
		where: {
			sittingId,
			userId: { in: readings.map((row) => row.userId) },
			...activeParticipationWhere,
			progress: "not_started",
		},
		data: { progress: "in_progress" },
	});
}

/**
 * Called when a member sets "in progress" on a sitting: they now have a reading
 * session for the sitting's book (the sitting and the session stay in step).
 */
export async function ensureReadingForSitting(
	db: Database,
	userId: string,
	bookId: string,
) {
	const [existing, hasRead, count, book] = await Promise.all([
		db.reading.findFirst({
			where: { userId, bookId, finishedAt: null },
			select: { id: true },
		}),
		db.read.findUnique({
			where: { userId_bookId: { userId, bookId } },
			select: { userId: true },
		}),
		db.reading.count({ where: { userId, finishedAt: null } }),
		db.book.findUnique({ where: { id: bookId }, select: { pages: true } }),
	]);
	if (existing || hasRead || count >= MAX_ACTIVE_READINGS) return;
	await db.reading.create({
		data: {
			userId,
			bookId,
			totalPages: book && book.pages > 0 ? book.pages : null,
			currentPage: book && book.pages > 0 ? 0 : null,
		},
	});
}

// ── Starting, updating, abandoning ─────────────────────────────────────────

function percentFromPage(page: number, total: number) {
	return Math.min(100, Math.max(0, Math.round((page / total) * 100)));
}

export async function startReading(
	db: Database,
	userId: string,
	input: {
		bookSlug: string;
		editionOlid?: string | null;
		editionCoverId?: number | null;
		editionLabel?: string | null;
		bookEditionId?: string | null;
		totalPages?: number | null;
	},
): Promise<ReadingItem> {
	const book = await loadBook(db, input.bookSlug);

	const result = await db.$transaction(async (tx) => {
		const hasRead = await tx.read.findUnique({
			where: { userId_bookId: { userId, bookId: book.id } },
			select: { userId: true },
		});
		if (hasRead) {
			throw new ORPCError("BAD_REQUEST", {
				message: "You have already read this book.",
			});
		}

		let memberEdition: { id: string; pages: number } | null = null;
		if (input.bookEditionId) {
			const edition = await tx.bookEdition.findUnique({
				where: { id: input.bookEditionId },
				select: { id: true, bookId: true, pages: true },
			});
			if (!edition || edition.bookId !== book.id) {
				throw new ORPCError("BAD_REQUEST", {
					message: "That edition belongs to another book.",
				});
			}
			memberEdition = edition;
		}

		const totalPages =
			input.totalPages ??
			memberEdition?.pages ??
			(book.pages > 0 ? book.pages : null);
		const editionFields = {
			editionOlid: memberEdition ? null : (input.editionOlid ?? null),
			editionCoverId: memberEdition ? null : (input.editionCoverId ?? null),
			editionLabel: memberEdition ? null : (input.editionLabel ?? null),
			bookEditionId: memberEdition?.id ?? null,
			totalPages,
		};

		const existing = await tx.reading.findFirst({
			where: { userId, bookId: book.id, finishedAt: null },
			select: { id: true, percent: true },
		});
		if (existing) {
			// Starting again just updates the edition.
			return tx.reading.update({
				where: { id: existing.id },
				data: {
					...editionFields,
					currentPage:
						totalPages != null
							? Math.round((existing.percent / 100) * totalPages)
							: null,
				},
				select: readingSelect,
			});
		}

		const active = await tx.reading.count({
			where: { userId, finishedAt: null },
		});
		if (active >= MAX_ACTIVE_READINGS) {
			throw new ORPCError("BAD_REQUEST", {
				message: `You can read ${MAX_ACTIVE_READINGS} books at a time. Finish or drop one first.`,
			});
		}

		const created = await tx.reading.create({
			data: {
				userId,
				bookId: book.id,
				...editionFields,
				currentPage: totalPages != null ? 0 : null,
			},
			select: readingSelect,
		});
		await syncSittingsOnStart(tx, userId, book.id);
		return created;
	});

	const sittings = await sittingsFor(db, userId, [book.id]);
	return mapReading(result, sittings.get(book.id), new Date());
}

export async function updateReadingProgress(
	db: Database,
	userId: string,
	input: { id: string; page?: number; percent?: number },
): Promise<ReadingItem> {
	const row = await loadOwnReading(db, userId, input.id);
	if (row.finishedAt) {
		throw new ORPCError("BAD_REQUEST", {
			message: "This book is already finished.",
		});
	}

	let page: number | null = row.currentPage;
	let percent = row.percent;
	if (input.page != null) {
		if (row.totalPages == null) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Add the number of pages to track by page.",
			});
		}
		page = Math.min(input.page, row.totalPages);
		percent = percentFromPage(page, row.totalPages);
	} else if (input.percent != null) {
		percent = input.percent;
		page =
			row.totalPages != null
				? Math.round((percent / 100) * row.totalPages)
				: null;
	}

	const changed = percent !== row.percent || page !== row.currentPage;
	const updated = await db.$transaction(async (tx) => {
		const saved = await tx.reading.update({
			where: { id: row.id },
			data: { percent, currentPage: page },
			select: readingSelect,
		});
		if (changed) {
			await tx.readingLog.create({
				data: { readingId: row.id, percent, page },
			});
		}
		// Moving off zero also makes the sitting "in progress".
		if (percent > 0) await syncSittingsOnStart(tx, userId, row.book.id);
		return saved;
	});
	const fresh = await db.reading.findUnique({
		where: { id: updated.id },
		select: readingSelect,
	});
	const sittings = await sittingsFor(db, userId, [row.book.id]);
	return mapReading(fresh ?? updated, sittings.get(row.book.id), new Date());
}

export async function setReadingEdition(
	db: Database,
	userId: string,
	input: {
		id: string;
		editionOlid?: string | null;
		editionCoverId?: number | null;
		editionLabel?: string | null;
		bookEditionId?: string | null;
		totalPages?: number | null;
	},
): Promise<ReadingItem> {
	const row = await loadOwnReading(db, userId, input.id);
	if (row.finishedAt) {
		throw new ORPCError("BAD_REQUEST", {
			message: "This book is already finished.",
		});
	}
	let memberPages: number | null = null;
	if (input.bookEditionId) {
		const edition = await db.bookEdition.findUnique({
			where: { id: input.bookEditionId },
			select: { bookId: true, pages: true },
		});
		if (!edition || edition.bookId !== row.book.id) {
			throw new ORPCError("BAD_REQUEST", {
				message: "That edition belongs to another book.",
			});
		}
		memberPages = edition.pages;
	}
	const totalPages = input.totalPages ?? memberPages ?? row.totalPages;
	const updated = await db.reading.update({
		where: { id: row.id },
		data: {
			editionOlid: input.bookEditionId ? null : (input.editionOlid ?? null),
			editionCoverId: input.bookEditionId
				? null
				: (input.editionCoverId ?? null),
			editionLabel: input.bookEditionId ? null : (input.editionLabel ?? null),
			bookEditionId: input.bookEditionId ?? null,
			totalPages,
			// Keep the same place in the book, whatever the edition's length.
			currentPage:
				totalPages != null
					? Math.round((row.percent / 100) * totalPages)
					: null,
		},
		select: readingSelect,
	});
	const sittings = await sittingsFor(db, userId, [row.book.id]);
	return mapReading(updated, sittings.get(row.book.id), new Date());
}

/** Dropping a reading deletes it (and its log); the sitting goes back to "not started". */
export async function abandonReading(
	db: Database,
	userId: string,
	id: string,
): Promise<void> {
	const row = await loadOwnReading(db, userId, id);
	if (row.finishedAt) {
		throw new ORPCError("BAD_REQUEST", {
			message: "A finished book cannot be dropped.",
		});
	}
	await db.$transaction(async (tx) => {
		await tx.reading.delete({ where: { id: row.id } });
		await syncSittingsOnAbandon(tx, userId, row.book.id);
	});
}

/**
 * The book was marked read (from anywhere): the reading ends as finished, the
 * edition carries over to the read, and the book leaves the wishlist.
 */
export async function finalizeReadingForRead(
	db: Db,
	userId: string,
	bookId: string,
): Promise<void> {
	const active = await db.reading.findFirst({
		where: { userId, bookId, finishedAt: null },
		select: {
			id: true,
			totalPages: true,
			currentPage: true,
			editionOlid: true,
			bookEditionId: true,
		},
	});
	if (active) {
		const finalPage = active.totalPages ?? active.currentPage;
		await db.reading.update({
			where: { id: active.id },
			data: { finishedAt: new Date(), percent: 100, currentPage: finalPage },
		});
		await db.readingLog.create({
			data: { readingId: active.id, percent: 100, page: finalPage },
		});
		if (active.editionOlid || active.bookEditionId) {
			await db.read.updateMany({
				where: { userId, bookId, editionId: null, bookEditionId: null },
				data: {
					editionId: active.editionOlid,
					bookEditionId: active.bookEditionId,
				},
			});
		}
	}
	await removeBookFromWishlist(db, userId, bookId);
}

// ── Who is reading ─────────────────────────────────────────────────────────

export async function listBookReaders(
	db: Database,
	viewerId: string | null,
	bookSlug: string,
) {
	const book = await loadBook(db, bookSlug);
	const rows = await db.reading.findMany({
		where: {
			bookId: book.id,
			finishedAt: null,
			user: { ...visibleOnSiteUserWhere },
		},
		orderBy: { startedAt: "desc" },
		take: 200,
		select: {
			...readingSelect,
			user: {
				select: {
					id: true,
					username: true,
					name: true,
					image: true,
					showCurrentlyReading: true,
					showReadingProgress: true,
				},
			},
		},
	});
	const visible = rows.filter(
		(row) => row.user.showCurrentlyReading || row.user.id === viewerId,
	);
	return {
		total: rows.length,
		items: visible.map((row) => {
			const isViewer = row.user.id === viewerId;
			const showProgress = isViewer || row.user.showReadingProgress;
			return {
				username: row.user.username,
				name: row.user.name,
				image: row.user.image ?? null,
				startedAt: row.startedAt,
				percent: showProgress ? row.percent : null,
				currentPage: showProgress ? row.currentPage : null,
				totalPages: showProgress ? row.totalPages : null,
				edition: mapEdition(row),
				isViewer,
			};
		}),
	};
}

export async function getBookReadingCounts(db: Database, bookSlug: string) {
	const book = await loadBook(db, bookSlug);
	const [readingNow, onWishlists] = await Promise.all([
		db.reading.count({
			where: {
				bookId: book.id,
				finishedAt: null,
				user: { ...visibleOnSiteUserWhere },
			},
		}),
		db.shelfBook.count({
			where: {
				bookId: book.id,
				shelf: { isWishlist: true, user: { ...visibleOnSiteUserWhere } },
			},
		}),
	]);
	return { readingNow, onWishlists };
}

export async function getUserCurrentReading(
	db: Database,
	viewerId: string | null,
	username: string,
) {
	const user = await db.user.findUnique({
		where: { username },
		select: {
			id: true,
			isHidden: true,
			showCurrentlyReading: true,
			showReadingProgress: true,
		},
	});
	if (!user || (user.isHidden && user.id !== viewerId)) {
		throw new ORPCError("NOT_FOUND", { message: "Member not found" });
	}
	const isSelf = user.id === viewerId;
	if (!isSelf && !user.showCurrentlyReading) {
		return { items: [], visible: false };
	}
	const rows = await db.reading.findMany({
		where: { userId: user.id, finishedAt: null },
		orderBy: { updatedAt: "desc" },
		select: readingSelect,
	});
	const progressVisible = isSelf || user.showReadingProgress;
	return {
		visible: true,
		items: rows.map((row) => {
			const mapped = mapReading(row, undefined, new Date());
			const { pace: _pace, sitting: _sitting, ...rest } = mapped;
			return {
				...rest,
				percent: progressVisible ? rest.percent : 0,
				currentPage: progressVisible ? rest.currentPage : null,
				progressVisible,
			};
		}),
	};
}

// ── Preferences ────────────────────────────────────────────────────────────

export async function getReadingPreferences(db: Database, userId: string) {
	const [user, wishlist] = await Promise.all([
		db.user.findUnique({
			where: { id: userId },
			select: { showCurrentlyReading: true, showReadingProgress: true },
		}),
		db.shelf.findFirst({
			where: { userId, isWishlist: true },
			select: { visibility: true },
		}),
	]);
	return {
		wishlistPrivate: (wishlist?.visibility ?? "private") === "private",
		showCurrentlyReading: user?.showCurrentlyReading ?? true,
		showReadingProgress: user?.showReadingProgress ?? true,
	};
}

export async function setReadingPreferences(
	db: Database,
	userId: string,
	input: {
		wishlistPrivate?: boolean;
		showCurrentlyReading?: boolean;
		showReadingProgress?: boolean;
	},
) {
	await db.$transaction(async (tx) => {
		if (
			input.showCurrentlyReading !== undefined ||
			input.showReadingProgress !== undefined
		) {
			await tx.user.update({
				where: { id: userId },
				data: {
					...(input.showCurrentlyReading !== undefined
						? { showCurrentlyReading: input.showCurrentlyReading }
						: {}),
					...(input.showReadingProgress !== undefined
						? { showReadingProgress: input.showReadingProgress }
						: {}),
				},
			});
		}
		if (input.wishlistPrivate !== undefined) {
			await tx.shelf.updateMany({
				where: { userId, isWishlist: true },
				data: { visibility: input.wishlistPrivate ? "private" : "public" },
			});
		}
	});
	return getReadingPreferences(db, userId);
}

// ── Stats ──────────────────────────────────────────────────────────────────

export async function getMyReadingStats(
	db: Database,
	userId: string,
): Promise<ReadingStatsOutput> {
	const [finishedRows, logs] = await Promise.all([
		db.reading.findMany({
			where: { userId, finishedAt: { not: null } },
			orderBy: { finishedAt: "desc" },
			select: {
				startedAt: true,
				finishedAt: true,
				totalPages: true,
				book: {
					select: { slug: true, title: true, authors: true, coverId: true },
				},
			},
		}),
		db.readingLog.findMany({
			where: { reading: { userId } },
			select: { createdAt: true },
		}),
	]);
	const finished = finishedRows.flatMap((row) =>
		row.finishedAt
			? [
					{
						book: row.book,
						startedAt: row.startedAt,
						finishedAt: row.finishedAt,
						totalPages: row.totalPages,
					},
				]
			: [],
	);
	const stats = readingStats({
		finished,
		logTimes: logs.map((log) => log.createdAt),
		now: new Date(),
		timeZone: resolveClubTimeZone(),
	});

	const cutoff = Date.now() - 120 * 24 * 60 * 60 * 1000;
	const activity = new Map<string, number>();
	for (const log of logs) {
		if (log.createdAt.getTime() < cutoff) continue;
		const day = clubDayKey(log.createdAt, resolveClubTimeZone());
		activity.set(day, (activity.get(day) ?? 0) + 1);
	}

	return {
		...stats,
		finished: finished.map((row) => ({
			book: row.book,
			startedAt: row.startedAt,
			finishedAt: row.finishedAt,
			days: Math.max(
				1,
				Math.ceil(
					(row.finishedAt.getTime() - row.startedAt.getTime()) /
						(24 * 60 * 60 * 1000),
				),
			),
			totalPages: row.totalPages,
		})),
		activity: [...activity.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([day, updates]) => ({ day, updates })),
	};
}
