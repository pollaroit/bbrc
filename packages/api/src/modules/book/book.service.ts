import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { notifyBookAddedToLibrary } from "../notification/notification-triggers";
import {
	bookListRanging,
	bookListSearching,
	bookListSorting,
} from "./book.listing";
import {
	type GetBookListInput,
	type GetBookListOutput,
	getBookListFields,
	type TAddBookInputSchema,
	type TGetBookBySlugOutputSchema,
	type TUpdateBookInputSchema,
	type TUpdateBookOutputSchema,
} from "./book.schema";
import { generateBookSlug } from "./book-slug";

type BookListRow = Prisma.BookGetPayload<{
	select: typeof getBookListFields;
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
): Promise<GetBookListOutput> {
	const pagination = definePagination.cursor(input, bookListCursorCodec);
	const sorting = bookListSorting.from(input);
	const ranging = bookListRanging.from(input);
	const searching = bookListSearching.from(input);

	const where = mergeWhereFragments<Prisma.BookWhereInput>(
		ranging.use(),
		searching.use(),
		{
			status: input.statuses ? { in: input.statuses } : undefined,
			openLibraryRating:
				input.minOpenLibraryRating == null && input.maxOpenLibraryRating == null
					? undefined
					: {
							gte: input.minOpenLibraryRating ?? undefined,
							lte: input.maxOpenLibraryRating ?? undefined,
						},
		},
	);

	const rows = await db.book.findMany({
		...pagination.use(),
		where,
		orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
		select: getBookListFields,
	});

	return pagination.paginate(rows);
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

	return book;
}

export async function addBook(input: TAddBookInputSchema, db: Database) {
	const book = await db.$transaction(async (tx) => {
		const slug = await generateBookSlug(input.title, tx);

		return tx.book.create({
			data: {
				...input,
				slug,
			},
			select: {
				slug: true,
			},
		});
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
			select: {},
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
			select: {},
		});
	});

	return slug;
}
