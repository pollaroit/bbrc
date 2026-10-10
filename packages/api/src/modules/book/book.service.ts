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
import {
	mapReadAfterBooks,
	readAfterBookInclude,
	syncBookReadAfterPrerequisites,
} from "./book-reading-prerequisites";
import { generateBookSlug } from "./book-slug";

const bookListSelect = {
	...getBookListFields,
	_count: {
		select: {
			documents: { where: { status: "approved" as const } },
			reads: true,
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
			readCount: row._count.reads,
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
			requestedById: true,
			approvedById: true,
		},
		include: {
			requestedBy: {
				select: {
					username: true,
					name: true,
				},
			},
			readAfterPrerequisites: readAfterBookInclude,
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

	const { readAfterPrerequisites, ...rest } = book;

	return normalizeBookRecord({
		...rest,
		readAfterBooks: mapReadAfterBooks(readAfterPrerequisites),
	});
}

function normalizeBookRecord<T extends TGetBookBySlugOutputSchema>(book: T): T {
	return {
		...book,
		subjectPeople: book.subjectPeople ?? [],
		subjectTimes: book.subjectTimes ?? [],
		subjects: book.subjects ?? [],
	};
}

export async function addBook(
	input: TAddBookInputSchema,
	db: Database,
	adminUserId: string,
) {
	const { acceptanceNotes, readAfterBookSlugs, ...bookInput } = input;
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

		const pendingRequest = await tx.bookRequest.findFirst({
			where: { olid: bookInput.olid, status: "pending" },
			orderBy: { createdAt: "asc" },
			select: { userId: true },
		});

		const book = await tx.book.create({
			data: {
				...bookInput,
				subjectPeople: bookInput.subjectPeople ?? [],
				subjectTimes: bookInput.subjectTimes ?? [],
				subjects: bookInput.subjects ?? [],
				slug,
				approvedById: adminUserId,
				requestedById: pendingRequest?.userId ?? null,
			},
			select: {
				id: true,
				slug: true,
			},
		});

		if (readAfterBookSlugs && readAfterBookSlugs.length > 0) {
			await syncBookReadAfterPrerequisites(book.id, readAfterBookSlugs, tx);
		}

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
		const { slug, readAfterBookSlugs, ...data } = input;

		await tx.book.update({
			where: { id: book.id },
			data,
		});

		if (readAfterBookSlugs !== undefined) {
			await syncBookReadAfterPrerequisites(book.id, readAfterBookSlugs, tx);
		}

		return { slug };
	});
}

export async function removeBook(slug: string, db: Database): Promise<string> {
	const book = await db.book.findUnique({
		where: { slug },
		select: { id: true, status: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: {
				slug,
			},
		});
	}

	if (book.status !== "wishlist") {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Only wishlist books can be removed. Change status or keep the title in the catalog.",
			data: { slug, status: book.status },
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
