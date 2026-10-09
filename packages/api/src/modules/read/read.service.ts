import { type Database, Prisma } from "@bbrc/db";
import {
	parseReadDateField,
	parseReadDateFields,
	type ReadDateField,
	ReadDateFieldSchema,
} from "@bbrc/schemas/read-dates";
import { ORPCError } from "@orpc/server";
import {
	fetchEditionDetailSummaries,
	fetchWorkEditionSummaries,
	type OpenLibraryEditionLanguage,
} from "../../lib/open-library/work-editions";
import { definePagination } from "../../utils/pagination";
import { activeParticipationWhere } from "../sitting/participation-active";
import type {
	GetBookReadStateOutput,
	ListBookReadsInput,
	ListBookReadsOutput,
	ListUserReadsInput,
	ListUserReadsOutput,
	RemoveReadInput,
	SearchWorkEditionsInput,
	SearchWorkEditionsOutput,
	SetReadInput,
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

function jsonDateField(
	value: ReadDateField,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
	if (value == null) {
		return Prisma.DbNull;
	}
	return value;
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

export async function ensureUserReadBook(
	userId: string,
	bookId: string,
	db: Database,
): Promise<void> {
	await db.read.upsert({
		where: {
			userId_bookId: { userId, bookId },
		},
		create: { userId, bookId },
		update: {},
	});
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

export async function getBookReadState(
	bookSlug: string,
	userId: string,
	db: Database,
): Promise<GetBookReadStateOutput> {
	const book = await loadBookBySlug(bookSlug, db);

	const row = await db.read.findUnique({
		where: {
			userId_bookId: { userId, bookId: book.id },
		},
		select: {
			readStart: true,
			readEnd: true,
			editionId: true,
		},
	});

	if (!row) {
		return {
			hasRead: false,
			readStart: null,
			readEnd: null,
			editionId: null,
		};
	}

	const dates = parseReadDateFields({
		readStart: row.readStart,
		readEnd: row.readEnd,
	});

	return {
		hasRead: true,
		readStart: dates.readStart,
		readEnd: dates.readEnd,
		editionId: row.editionId,
	};
}

export async function setRead(
	input: SetReadInput,
	userId: string,
	db: Database,
): Promise<GetBookReadStateOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);

	const readStart =
		input.readStart === undefined ? undefined : jsonDateField(input.readStart);
	const readEnd =
		input.readEnd === undefined ? undefined : jsonDateField(input.readEnd);
	const editionId = input.editionId === undefined ? undefined : input.editionId;

	const row = await db.$transaction(async (tx) => {
		const saved = await tx.read.upsert({
			where: {
				userId_bookId: { userId, bookId: book.id },
			},
			create: {
				userId,
				bookId: book.id,
				...(readStart !== undefined ? { readStart } : {}),
				...(readEnd !== undefined ? { readEnd } : {}),
				...(editionId !== undefined ? { editionId } : {}),
			},
			update: {
				...(readStart !== undefined ? { readStart } : {}),
				...(readEnd !== undefined ? { readEnd } : {}),
				...(editionId !== undefined ? { editionId } : {}),
			},
			select: {
				readStart: true,
				readEnd: true,
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

		return saved;
	});

	const dates = parseReadDateFields({
		readStart: row.readStart,
		readEnd: row.readEnd,
	});

	return {
		hasRead: true,
		readStart: dates.readStart,
		readEnd: dates.readEnd,
		editionId: row.editionId,
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

export function formatReadDateFieldsForOutput(row: {
	readStart: unknown;
	readEnd: unknown;
}): { readStart: ReadDateField; readEnd: ReadDateField } {
	return parseReadDateFields(row);
}

export async function listBookReads(
	input: ListBookReadsInput,
	db: Database,
): Promise<ListBookReadsOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);
	const limit = input.limit ?? 100;

	const [total, rows] = await Promise.all([
		db.read.count({ where: { bookId: book.id } }),
		db.read.findMany({
			where: { bookId: book.id },
			orderBy: { createdAt: "desc" },
			take: limit,
			select: {
				readStart: true,
				readEnd: true,
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
		items: rows.map((row) => {
			const dates = parseReadDateFields({
				readStart: row.readStart,
				readEnd: row.readEnd,
			});

			return {
				readStart: dates.readStart,
				readEnd: dates.readEnd,
				editionId: row.editionId,
				recordedAt: row.createdAt,
				user: row.user,
			};
		}),
	};
}

type UserReadListRow = Prisma.ReadGetPayload<{
	select: typeof userReadListSelect;
}>;

export async function listUserReads(
	input: ListUserReadsInput,
	db: Database,
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

	const rows = await db.read.findMany({
		...pagination.use(),
		where: { userId: user.id },
		orderBy: [{ createdAt: "desc" }, { bookId: "desc" }],
		select: userReadListSelect,
	});

	const page = pagination.paginate(rows);

	return {
		items: page.items.map((row) => {
			const dates = parseReadDateFields({
				readStart: row.readStart,
				readEnd: row.readEnd,
			});

			return {
				readStart: dates.readStart,
				readEnd: dates.readEnd,
				editionId: row.editionId,
				recordedAt: row.createdAt,
				book: {
					slug: row.book.slug,
					title: row.book.title,
					authors: row.book.authors,
					coverId: row.book.coverId,
					status: row.book.status,
					pages: row.book.pages,
					publishedIn: row.book.publishedIn,
				},
			};
		}),
		metadata: page.metadata,
	};
}

export async function searchWorkEditionsForBook(
	input: SearchWorkEditionsInput,
	db: Database,
): Promise<SearchWorkEditionsOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);

	if (!book.olid) {
		return { items: [] };
	}

	const items = await fetchWorkEditionSummaries(book.olid, {
		query: input.query,
		language: (input.language ?? "any") as OpenLibraryEditionLanguage,
		limit: input.limit ?? 5,
	});

	return { items };
}

export { fetchEditionDetailSummaries, parseReadDateField, ReadDateFieldSchema };
