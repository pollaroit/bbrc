import type { Session } from "@bbrc/auth";
import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
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
import { visibleOnSiteUserWhere } from "../user/user-visibility";
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
			progress: { not: "completed" },
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
): Promise<void> {
	const rating = input.feedbackRating;
	const reviewRaw = input.feedbackReview?.trim() ?? "";
	const hasRating = rating != null;
	const hasReview = contentPlainText(reviewRaw).trim().length > 0;

	if (!hasRating && !hasReview) {
		return;
	}

	if (!hasRating) {
		return;
	}

	await createFeedback(
		{
			bookSlug: input.bookSlug,
			rating,
			review: hasReview ? reviewRaw : "—",
		},
		userId,
		db,
	);
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
			where: {
				userId,
				...activeParticipationWhere,
				progress: { not: "completed" },
				sitting: {
					selectedBookId: book.id,
					status: { in: ["reading", "finished"] },
				},
			},
			data: { progress: "completed" },
		});

		await finalizeReadingForRead(tx, userId, book.id);

		return saved;
	});

	void checkReadingAchievements(db, userId);

	await maybeCreateFeedbackFromSetRead(input, userId, db);

	const hasFeedback =
		(await db.feedback.findFirst({
			where: { authorId: userId, bookId: book.id },
			select: { id: true },
		})) != null;

	return mapReadRowToState(row, hasFeedback);
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
): Promise<ListBookReadsOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);
	const limit = input.limit ?? 100;

	const readWhere = { bookId: book.id, user: visibleOnSiteUserWhere };

	const [total, rows] = await Promise.all([
		db.read.count({ where: readWhere }),
		db.read.findMany({
			where: readWhere,
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

	return {
		total,
		items: rows.map((row) => ({
			readEndYear: row.readEndYear,
			readEndMonth: row.readEndMonth,
			editionId: row.editionId,
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
	session: Session | null = null,
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

	const bookWhere = await buildBookListWhereWithAuthors(
		input as BookListQueryInput,
		db,
	);

	if (bookWhere == null) {
		return {
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

	const viewerId = session?.user?.id;
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

	return {
		items: page.items.map((row) => ({
			readEndYear: row.readEndYear,
			readEndMonth: row.readEndMonth,
			editionId: row.editionId,
			recordedAt: row.createdAt,
			rating: ratingByBookId.get(row.book.id) ?? null,
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
