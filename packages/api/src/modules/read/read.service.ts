import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import type { Viewer } from "@bbrc/shared";
import {
	contentPlainText,
	readFinishedMonthFromClubNow,
	resolveClubTimeZone,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import {
	fetchEditionDetailSummaries,
	listWorkEditions,
	type OpenLibraryEditionLanguage,
} from "../../lib/open-library/work-editions";
import { definePagination } from "../../utils/pagination";
import {
	type BookListQueryInput,
	buildBookListWhereWithAuthors,
} from "../book/book-list-where";
import { createFeedback } from "../feedback/feedback.service";
import { finalizeReadingForRead } from "../reading/reading.service";
import { checkReadingAchievements } from "../reading/reading-achievements";
import { activeParticipationWhere } from "../sitting/participation-active";
import { readVisibleWhere } from "../visibility/visibility-resources";
import {
	compareUserReadRatings,
	userReadListSorting,
	withStableUserReadOrderBy,
} from "./read.listing";
import type {
	GetBookReadStateOutput,
	GetReadPreferencesOutput,
	ListBookReadsInput,
	ListBookReadsOutput,
	ListUserReadsInput,
	ListUserReadsOutput,
	RemoveReadInput,
	SearchWorkEditionsInput,
	SearchWorkEditionsOutput,
	SetReadInput,
	SetReadPreferencesInput,
} from "./read.schema";
import { userReadListSelect } from "./read.schema";
import {
	loadEditionSnapshotLabels,
	readEditionRef,
	readEditionRefSelect,
} from "./read-edition-ref";
import {
	canViewerSeeSection,
	isBlockedFrom,
	viewerIdOf,
} from "./section-access";

async function loadBookBySlug(slug: string, db: Database) {
	const book = await db.book.findUnique({
		where: { slug },
		select: { id: true, slug: true, olid: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug },
		});
	}

	return book;
}

function resolveFinishMonthFields(input: {
	readEndYear?: number | null;
	readEndMonth?: number | null;
}): { readEndYear: number | null; readEndMonth: number | null } | undefined {
	if (input.readEndYear === undefined && input.readEndMonth === undefined) {
		return undefined;
	}
	if (input.readEndYear == null && input.readEndMonth == null) {
		return { readEndYear: null, readEndMonth: null };
	}
	if (input.readEndYear == null || input.readEndMonth == null) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Finish month and year must be set together",
		});
	}
	return {
		readEndYear: input.readEndYear,
		readEndMonth: input.readEndMonth,
	};
}

function mapReadRowToState(
	row: {
		readEndYear: number | null;
		readEndMonth: number | null;
		editionId: string | null;
	},
	hasFeedback: boolean,
): GetBookReadStateOutput {
	return {
		hasRead: true,
		hasFeedback,
		readEndYear: row.readEndYear,
		readEndMonth: row.readEndMonth,
		editionId: row.editionId,
	};
}

export async function userHasReadBook(
	userId: string,
	bookId: string,
	db: Database,
): Promise<boolean> {
	const row = await db.read.findUnique({
		where: {
			userId_bookId: { userId, bookId },
		},
		select: { userId: true },
	});

	return row != null;
}

export async function deleteReadForUserBook(
	userId: string,
	bookId: string,
	db: Database | DatabaseTransaction,
): Promise<void> {
	await db.read.deleteMany({
		where: { userId, bookId },
	});
}

export async function ensureUserReadBook(
	userId: string,
	bookId: string,
	db: Database,
	finishMonth = readFinishedMonthFromClubNow(new Date(), resolveClubTimeZone()),
): Promise<void> {
	await db.read.upsert({
		where: {
			userId_bookId: { userId, bookId },
		},
		create: {
			userId,
			bookId,
			readEndYear: finishMonth.year,
			readEndMonth: finishMonth.month,
		},
		update: {
			readEndYear: finishMonth.year,
			readEndMonth: finishMonth.month,
		},
	});
	await finalizeReadingForRead(db, userId, bookId);
	void checkReadingAchievements(db, userId);
}

/** When a participant completes the sitting’s selected book during reading. */
export async function ensureReadForSittingCompletion(
	db: Database,
	sittingId: string,
	userId: string,
): Promise<void> {
	const sitting = await db.sitting.findUnique({
		where: { id: sittingId },
		select: {
			selectedBookId: true,
			status: true,
		},
	});

	if (!sitting?.selectedBookId) {
		return;
	}

	if (sitting.status !== "reading" && sitting.status !== "finished") {
		return;
	}

	await ensureUserReadBook(userId, sitting.selectedBookId, db);
}

/**
 * Which sitting participations a member's "mark as read" completes: only those of
 * a sitting that is going (reading) and not already completed or DNF. A reading
 * and a sitting are separate things: finishing the book on your own after the
 * sitting ended must never change a sitting's outcome, and a DNF stays a DNF.
 */
export function markReadParticipationWhere(userId: string, bookId: string) {
	return {
		userId,
		...activeParticipationWhere,
		progress: { notIn: ["completed", "dnf"] },
		sitting: { selectedBookId: bookId, status: "reading" },
	} satisfies Prisma.ParticipationWhereInput;
}

/**
 * When a sitting enters reading, participants who already marked the club pick
 * read should show completed (bidirectional sync with member_read).
 */
export async function syncParticipationWithExistingReadsForSelectedBook(
	db: Database | DatabaseTransaction,
	sittingId: string,
	bookId: string,
): Promise<void> {
	const reads = await db.read.findMany({
		where: { bookId },
		select: { userId: true },
	});

	if (reads.length === 0) {
		return;
	}

	const readerUserIds = reads.map((read) => read.userId);

	await db.participation.updateMany({
		where: {
			sittingId,
			userId: { in: readerUserIds },
			...activeParticipationWhere,
			progress: { notIn: ["completed", "dnf"] },
		},
		data: { progress: "completed" },
	});
}

export async function getBookReadState(
	bookSlug: string,
	userId: string,
	db: Database,
): Promise<GetBookReadStateOutput> {
	const book = await loadBookBySlug(bookSlug, db);

	const [row, existingFeedback] = await Promise.all([
		db.read.findUnique({
			where: {
				userId_bookId: { userId, bookId: book.id },
			},
			select: {
				readEndYear: true,
				readEndMonth: true,
				editionId: true,
			},
		}),
		db.feedback.findFirst({
			where: { authorId: userId, bookId: book.id },
			select: { id: true },
		}),
	]);

	const hasFeedback = existingFeedback != null;

	if (!row) {
		return {
			hasRead: false,
			hasFeedback,
			readEndYear: null,
			readEndMonth: null,
			editionId: null,
		};
	}

	return mapReadRowToState(row, hasFeedback);
}

async function maybeCreateFeedbackFromSetRead(
	input: SetReadInput,
	userId: string,
	db: Database,
): Promise<string | null> {
	const rating = input.feedbackRating;
	const reviewRaw = input.feedbackReview?.trim() ?? "";
	const hasRating = rating != null;
	const hasReview = contentPlainText(reviewRaw).trim().length > 0;

	if (!hasRating && !hasReview) {
		return null;
	}

	if (!hasRating) {
		return null;
	}

	const created = await createFeedback(
		{
			bookSlug: input.bookSlug,
			rating,
			review: hasReview ? reviewRaw : "—",
		},
		userId,
		db,
	);
	return created.slug;
}

export async function setRead(
	input: SetReadInput,
	userId: string,
	db: Database,
): Promise<GetBookReadStateOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);

	const finishFields = resolveFinishMonthFields(input);
	const editionId = input.editionId === undefined ? undefined : input.editionId;
	const bookEditionId =
		input.bookEditionId === undefined ? undefined : input.bookEditionId;

	if (bookEditionId) {
		const edition = await db.bookEdition.findUnique({
			where: { id: bookEditionId },
			select: { bookId: true },
		});
		if (!edition || edition.bookId !== book.id) {
			throw new ORPCError("BAD_REQUEST", {
				message: "That edition belongs to another book.",
			});
		}
	}

	const row = await db.$transaction(async (tx) => {
		const saved = await tx.read.upsert({
			where: {
				userId_bookId: { userId, bookId: book.id },
			},
			create: {
				userId,
				bookId: book.id,
				...(finishFields !== undefined
					? {
							readEndYear: finishFields.readEndYear,
							readEndMonth: finishFields.readEndMonth,
						}
					: {}),
				...(editionId !== undefined ? { editionId } : {}),
				...(bookEditionId !== undefined ? { bookEditionId } : {}),
			},
			update: {
				...(finishFields !== undefined
					? {
							readEndYear: finishFields.readEndYear,
							readEndMonth: finishFields.readEndMonth,
						}
					: {}),
				...(editionId !== undefined ? { editionId } : {}),
				...(bookEditionId !== undefined ? { bookEditionId } : {}),
			},
			select: {
				readEndYear: true,
				readEndMonth: true,
				editionId: true,
			},
		});

		await tx.participation.updateMany({
			where: markReadParticipationWhere(userId, book.id),
			data: { progress: "completed" },
		});

		await finalizeReadingForRead(tx, userId, book.id);

		return saved;
	});

	void checkReadingAchievements(db, userId);

	const createdFeedbackSlug = await maybeCreateFeedbackFromSetRead(
		input,
		userId,
		db,
	);

	const hasFeedback =
		(await db.feedback.findFirst({
			where: { authorId: userId, bookId: book.id },
			select: { id: true },
		})) != null;

	return {
		...mapReadRowToState(row, hasFeedback),
		createdFeedbackSlug,
	};
}

export async function removeRead(
	input: RemoveReadInput,
	userId: string,
	db: Database,
): Promise<{ removed: true }> {
	const book = await loadBookBySlug(input.bookSlug, db);

	const deleted = await db.read.deleteMany({
		where: {
			userId,
			bookId: book.id,
		},
	});

	if (deleted.count === 0) {
		throw new ORPCError("NOT_FOUND", {
			message: "Read record not found",
		});
	}

	return { removed: true };
}

export async function listBookReads(
	input: ListBookReadsInput,
	db: Database,
	viewer: Viewer,
): Promise<ListBookReadsOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);
	const limit = input.limit ?? 100;

	// Totals count everyone; only the named rows follow the viewer.
	const readWhere = { bookId: book.id };
	const visibleReadWhere: Prisma.ReadWhereInput = {
		AND: [readWhere, readVisibleWhere(viewer) as Prisma.ReadWhereInput],
	};

	const [total, visibleTotal, rows] = await Promise.all([
		db.read.count({ where: readWhere }),
		db.read.count({ where: visibleReadWhere }),
		db.read.findMany({
			where: visibleReadWhere,
			orderBy: [
				{ readEndYear: "desc" },
				{ readEndMonth: "desc" },
				{ createdAt: "desc" },
			],
			take: limit,
			select: {
				readEndYear: true,
				readEndMonth: true,
				editionId: true,
				bookEdition: readEditionRefSelect.bookEdition,
				createdAt: true,
				user: {
					select: {
						username: true,
						name: true,
						image: true,
					},
				},
			},
		}),
	]);

	const snapshotLabels = await loadEditionSnapshotLabels(
		db,
		rows.flatMap((row) => (row.editionId ? [row.editionId] : [])),
	);

	return {
		total,
		privateCount: Math.max(0, total - visibleTotal),
		items: rows.map((row) => ({
			readEndYear: row.readEndYear,
			readEndMonth: row.readEndMonth,
			editionId: row.editionId,
			edition: readEditionRef(row, snapshotLabels),
			recordedAt: row.createdAt,
			user: row.user,
		})),
	};
}

type UserReadListRow = Prisma.ReadGetPayload<{
	select: typeof userReadListSelect;
}>;

export async function listUserReads(
	input: ListUserReadsInput,
	db: Database,
	viewer: Viewer,
): Promise<ListUserReadsOutput> {
	const user = await db.user.findUnique({
		where: { username: input.username },
		select: { id: true },
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username: input.username },
		});
	}

	if (isBlockedFrom(viewer, user.id)) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username: input.username },
		});
	}
	const readsVisible = await canViewerSeeSection(db, viewer, user.id, "reads");
	const reviewsVisible =
		readsVisible && (await canViewerSeeSection(db, viewer, user.id, "reviews"));

	const bookWhere = await buildBookListWhereWithAuthors(
		input as BookListQueryInput,
		db,
	);

	if (bookWhere == null || !readsVisible) {
		return {
			hidden: !readsVisible,
			items: [],
			metadata: {
				limit: input.limit ?? 12,
				hasNextPage: false,
				hasPreviousPage: input.cursor != null,
				nextCursor: null,
				total: 0,
			},
		};
	}

	const viewerId = viewerIdOf(viewer);
	const mutualOnly = Boolean(input.mutualOnly && viewerId);

	if (input.mutualOnly && !viewerId) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Sign in to filter by mutual reads.",
		});
	}

	const bookFilter: Prisma.BookWhereInput =
		mutualOnly && viewerId
			? {
					AND: [
						bookWhere,
						{
							reads: {
								some: { userId: viewerId },
							},
						},
					],
				}
			: bookWhere;

	const readWhere = {
		userId: user.id,
		book: bookFilter,
	};

	const cursorCodec = {
		decode(cursor: string): {
			userId_bookId: { userId: string; bookId: string };
		} {
			return {
				userId_bookId: { userId: user.id, bookId: cursor },
			};
		},
		encode(item: UserReadListRow): string {
			return item.book.id;
		},
	};

	const pagination = definePagination.cursor(input, cursorCodec);
	const sorting = userReadListSorting.from(input);

	const isFirstPage = input.cursor == null;

	const loadRowsByRating = async (): Promise<UserReadListRow[]> => {
		const all = await db.read.findMany({
			where: readWhere,
			select: { bookId: true },
		});
		const ratings = await db.feedback.findMany({
			where: {
				authorId: user.id,
				bookId: { in: all.map((row) => row.bookId) },
			},
			select: { bookId: true, rating: true },
		});
		const ratingByBookId = new Map(
			ratings.map((feedback) => [feedback.bookId, feedback.rating]),
		);
		const sortedIds = all
			.map((row) => ({
				bookId: row.bookId,
				rating: ratingByBookId.get(row.bookId) ?? null,
			}))
			.toSorted((a, b) => compareUserReadRatings(a, b, sorting.sortDirection))
			.map((row) => row.bookId);

		const start = input.cursor ? sortedIds.indexOf(input.cursor) + 1 : 0;
		const pageIds = sortedIds.slice(start, start + pagination.limit + 1);
		const pageRows = await db.read.findMany({
			where: { userId: user.id, bookId: { in: pageIds } },
			select: userReadListSelect,
		});
		const rowByBookId = new Map(pageRows.map((row) => [row.book.id, row]));

		return pageIds.flatMap((id) => {
			const row = rowByBookId.get(id);
			return row ? [row] : [];
		});
	};

	const [rows, total] = await Promise.all([
		sorting.sortBy === "rating"
			? loadRowsByRating()
			: db.read.findMany({
					...pagination.use(),
					where: readWhere,
					orderBy: withStableUserReadOrderBy(
						sorting.use(),
						sorting.sortDirection,
					),
					select: userReadListSelect,
				}),
		isFirstPage
			? db.read.count({ where: readWhere })
			: Promise.resolve(undefined),
	]);

	const page = pagination.paginate(rows);

	const feedbacks = await db.feedback.findMany({
		where: {
			authorId: user.id,
			bookId: { in: page.items.map((row) => row.book.id) },
		},
		select: { bookId: true, rating: true },
	});
	const ratingByBookId = new Map(
		feedbacks.map((feedback) => [feedback.bookId, feedback.rating]),
	);

	const userSnapshotLabels = await loadEditionSnapshotLabels(
		db,
		page.items.flatMap((row) => (row.editionId ? [row.editionId] : [])),
	);

	return {
		items: page.items.map((row) => ({
			readEndYear: row.readEndYear,
			readEndMonth: row.readEndMonth,
			editionId: row.editionId,
			edition: readEditionRef(row, userSnapshotLabels),
			recordedAt: row.createdAt,
			rating: reviewsVisible ? (ratingByBookId.get(row.book.id) ?? null) : null,
			book: {
				slug: row.book.slug,
				title: row.book.title,
				authors: row.book.authors,
				coverId: row.book.coverId,
				status: row.book.status,
				pages: row.book.pages,
				publishedIn: row.book.publishedIn,
				readCount: row.book._count.reads,
			},
		})),
		metadata: {
			...page.metadata,
			...(total != null ? { total } : {}),
		},
	};
}

export async function searchWorkEditionsForBook(
	input: SearchWorkEditionsInput,
	db: Database,
): Promise<SearchWorkEditionsOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);

	if (!book.olid) {
		return {
			items: [],
			total: 0,
			page: 1,
			limit: input.limit ?? 12,
			totalPages: 0,
			hasNextPage: false,
		};
	}

	return listWorkEditions(book.olid, {
		query: input.query,
		language: (input.language ?? "any") as OpenLibraryEditionLanguage,
		page: input.page ?? 1,
		limit: input.limit ?? 12,
	});
}

export { fetchEditionDetailSummaries };

export async function getReadPreferences(
	userId: string,
	db: Database,
): Promise<GetReadPreferencesOutput> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { readDateDefaultsToNow: true },
	});

	return { defaultToCurrentDate: user?.readDateDefaultsToNow ?? true };
}

export async function setReadPreferences(
	input: SetReadPreferencesInput,
	userId: string,
	db: Database,
): Promise<GetReadPreferencesOutput> {
	const user = await db.user.update({
		where: { id: userId },
		data: { readDateDefaultsToNow: input.defaultToCurrentDate },
		select: { readDateDefaultsToNow: true },
	});

	return { defaultToCurrentDate: user.readDateDefaultsToNow };
}
