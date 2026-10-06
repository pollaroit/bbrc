import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { notifyBookAddedToLibrary } from "../notification/notification-triggers";
import { bookListSorting } from "./book.listing";
import {
	type GetBookListAuthorFacetsInput,
	type GetBookListAuthorFacetsOutput,
	type GetBookListInput,
	type GetBookListOutput,
	getBookListFields,
	type TAddBookInputSchema,
	type TGetBookBySlugOutputSchema,
	type TUpdateBookInputSchema,
	type TUpdateBookOutputSchema,
} from "./book.schema";
import { listAuthorFacetsForBooks } from "./book-author-filter";
import { buildBookListWhereWithAuthors } from "./book-list-where";
import { generateBookSlug } from "./book-slug";

const bookListSelect = {
	...getBookListFields,
	_count: {
		select: {
			documents: { where: { status: "approved" as const } },
		},
	},
} as const;

type BookListRow = Prisma.BookGetPayload<{
	select: typeof bookListSelect;
}>;

const bookListCursorCodec = {
	decode(cursor: string): { slug: string } {
		return { slug: cursor };
	},
	encode(item: BookListRow): string {
		return item.slug;
	},
};

function withStableSlugOrderBy(
	orderBy: Prisma.BookOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.BookOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

export async function getBookList(
	input: GetBookListInput,
	db: Database,
	viewerUserId?: string,
): Promise<GetBookListOutput> {
	const pagination = definePagination.cursor(input, bookListCursorCodec);
	const sorting = bookListSorting.from(input);

	const where = await buildBookListWhereWithAuthors(input, db, viewerUserId);

	if (where == null) {
		return {
			items: [],
			metadata: {
				limit: pagination.limit,
				hasNextPage: false,
				hasPreviousPage: pagination.hasPreviousPage,
				nextCursor: null,
				total: 0,
			},
		};
	}

	const isFirstPage = input.cursor == null;

	const [rows, total] = await Promise.all([
		db.book.findMany({
			...pagination.use(),
			where,
			orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
			select: bookListSelect,
		}),
		isFirstPage ? db.book.count({ where }) : Promise.resolve(undefined),
	]);

	const page = pagination.paginate(rows);

	return {
		items: page.items.map((row) => ({
			slug: row.slug,
			title: row.title,
			authors: row.authors,
			coverId: row.coverId,
			openLibraryRating: row.openLibraryRating,
			pages: row.pages,
			publishedIn: row.publishedIn,
			status: row.status,
			approvedDocumentCount: row._count.documents,
		})),
		metadata: {
			...page.metadata,
			...(total != null ? { total } : {}),
		},
	};
}

export async function getBookListAuthorFacets(
	input: GetBookListAuthorFacetsInput,
	db: Database,
	viewerUserId?: string,
): Promise<GetBookListAuthorFacetsOutput> {
	const { pinnedAuthorSlugs, authors: _selectedAuthors, ...listInput } = input;

	const where = await buildBookListWhereWithAuthors(
		listInput,
		db,
		viewerUserId,
	);

	if (where == null) {
		return { authors: [] };
	}

	const authors = await listAuthorFacetsForBooks(
		db,
		where,
		pinnedAuthorSlugs ?? [],
	);

	return { authors };
}

export async function getBookBySlug(
	slug: string,
	db: Database,
): Promise<TGetBookBySlugOutputSchema> {
	const book = await db.book.findUnique({
		where: {
			slug,
		},
		omit: {
			id: true,
			updatedAt: true,
		},
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: {
				slug,
			},
		});
	}

	return normalizeBookRecord(book);
}

function normalizeBookRecord<T extends TGetBookBySlugOutputSchema>(book: T): T {
	return {
		...book,
		subjectPeople: book.subjectPeople ?? [],
		subjectTimes: book.subjectTimes ?? [],
		subjects: book.subjects ?? [],
	};
}

export async function addBook(input: TAddBookInputSchema, db: Database) {
	const { acceptanceNotes, ...bookInput } = input;
	const trimmedAcceptanceNotes = acceptanceNotes?.trim() || null;

	const book = await db.$transaction(async (tx) => {
		const existing = await tx.book.findUnique({
			where: { olid: bookInput.olid },
			select: { slug: true },
		});

		if (existing) {
			throw new ORPCError("CONFLICT", {
				message: "A book with this Open Library ID is already in the catalog",
				data: { olid: bookInput.olid, slug: existing.slug },
			});
		}

		const slug = await generateBookSlug(bookInput.title, tx);

		const book = await tx.book.create({
			data: {
				...bookInput,
				subjectPeople: bookInput.subjectPeople ?? [],
				subjectTimes: bookInput.subjectTimes ?? [],
				subjects: bookInput.subjects ?? [],
				slug,
			},
			select: {
				slug: true,
			},
		});

		await tx.bookRequest.updateMany({
			where: { olid: bookInput.olid, status: "pending" },
			data: {
				status: "accepted",
				acceptanceNotes: trimmedAcceptanceNotes,
				rejectionReason: null,
			},
		});

		return book;
	});

	void notifyBookAddedToLibrary(db, book.slug);

	return book;
}

export async function updateBook(
	input: TUpdateBookInputSchema,
	db: Database,
): Promise<TUpdateBookOutputSchema> {
	const book = await db.book.findUnique({
		where: { slug: input.slug },
		select: { id: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: {
				slug: input.slug,
			},
		});
	}

	return await db.$transaction(async (tx) => {
		const { slug, ...data } = input;

		await tx.book.update({
			where: { id: book.id },
			data,
		});

		return { slug };
	});
}

export async function removeBook(slug: string, db: Database): Promise<string> {
	const book = await db.book.findUnique({
		where: { slug },
		select: { id: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: {
				slug,
			},
		});
	}

	await db.$transaction(async (tx) => {
		await tx.favorite.deleteMany({ where: { bookId: book.id } });
		await tx.book.delete({
			where: { id: book.id },
		});
	});

	return slug;
}
