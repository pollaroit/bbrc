import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { notifyBookAddedToLibrary } from "../notification/notification-triggers";
import {
	appendBookToEndOfSeriesByBookId,
	createSeriesRecord,
	mapBookSeriesSummary,
} from "../series/series.service";
import { bookListSorting } from "./book.listing";
import {
	type GetBookListAuthorFacetsInput,
	type GetBookListAuthorFacetsOutput,
	type GetBookListCountryFacetsInput,
	type GetBookListCountryFacetsOutput,
	type GetBookListInput,
	type GetBookListOutput,
	type GetRandomBookInput,
	type GetRandomBookOutput,
	getBookListFields,
	type TAddBookInputSchema,
	type TGetBookBySlugOutputSchema,
	type TUpdateBookInputSchema,
	type TUpdateBookOutputSchema,
} from "./book.schema";
import { listAuthorFacetsForBooks } from "./book-author-filter";
import { listCountryFacetsForBooks } from "./book-country-filter";
import { buildBookListWhereWithAuthors } from "./book-list-where";
import {
	mapReadAfterBooks,
	readAfterBookInclude,
	syncBookReadAfterPrerequisites,
} from "./book-reading-prerequisites";
import { generateBookSlug } from "./book-slug";
import { resolveClubSittingSlug } from "./resolve-club-sitting-slug";

const bookListSelect = {
	...getBookListFields,
	seriesMembership: {
		select: {
			position: true,
			series: { select: { slug: true, title: true } },
		},
	},
	sittingsSelectedFor: {
		where: { status: { in: ["reading", "finished"] } },
		orderBy: { updatedAt: "desc" as const },
		select: { slug: true, status: true },
	},
	_count: {
		select: {
			documents: { where: { status: "approved" as const } },
			reads: true,
			feedbacks: true,
			shelfBooks: true,
			favorites: true,
		},
	},
} satisfies Prisma.BookSelect;

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

function expandBookListOrderBy(
	sortBy: string,
	sortDirection: "asc" | "desc",
	orderBy: Prisma.BookOrderByWithRelationInput,
): Prisma.BookOrderByWithRelationInput[] {
	const nulls = "last" as const;
	if (sortBy === "averageRating") {
		return [
			{ averageRating: { sort: sortDirection, nulls } },
			{ slug: sortDirection },
		];
	}
	return withStableSlugOrderBy(orderBy, sortDirection);
}

export async function getRandomBook(
	input: GetRandomBookInput,
	db: Database,
	viewerUserId?: string,
): Promise<GetRandomBookOutput> {
	if (
		(input.viewerRead != null ||
			input.viewerFavorite ||
			input.viewerReviewed) &&
		!viewerUserId
	) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Sign in to filter by your own reads.",
		});
	}

	const where = await buildBookListWhereWithAuthors(input, db, viewerUserId);
	const matched = where == null ? 0 : await db.book.count({ where });

	if (where == null || matched === 0) {
		throw new ORPCError("NOT_FOUND", {
			message: "No book matches these filters.",
		});
	}

	const [book] = await db.book.findMany({
		where,
		orderBy: { id: "asc" },
		skip: Math.floor(Math.random() * matched),
		take: 1,
		select: { slug: true, title: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "No book matches these filters.",
		});
	}

	return { ...book, matched };
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
			orderBy: expandBookListOrderBy(
				sorting.sortBy,
				sorting.sortDirection,
				sorting.use(),
			),
			select: bookListSelect,
		}),
		isFirstPage ? db.book.count({ where }) : Promise.resolve(undefined),
	]);

	const page = pagination.paginate(rows);

	return {
		items: page.items.map((row) => {
			const { seriesMembership, sittingsSelectedFor, _count, ...fields } = row;
			return {
				...fields,
				approvedDocumentCount: _count.documents,
				readCount: _count.reads,
				feedbackCount: _count.feedbacks,
				shelfCount: _count.shelfBooks,
				favoriteCount: _count.favorites,
				clubSittingSlug: resolveClubSittingSlug(
					fields.status,
					sittingsSelectedFor,
				),
				series: mapBookSeriesSummary(seriesMembership),
			};
		}),
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
	const {
		pinnedAuthorSlugs,
		authors: _selectedAuthors,
		countries: _countries,
		...listInput
	} = input;

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

export async function getBookListCountryFacets(
	input: GetBookListCountryFacetsInput,
	db: Database,
	viewerUserId?: string,
): Promise<GetBookListCountryFacetsOutput> {
	const {
		pinnedCountryCodes,
		countries: _selectedCountries,
		...listInput
	} = input;

	const where = await buildBookListWhereWithAuthors(
		listInput,
		db,
		viewerUserId,
	);

	if (where == null) {
		return { countries: [] };
	}

	const countries = await listCountryFacetsForBooks(
		db,
		where,
		pinnedCountryCodes ?? [],
	);

	return { countries };
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
			seriesMembership: {
				select: {
					position: true,
					series: { select: { slug: true, title: true } },
				},
			},
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

	const { readAfterPrerequisites, seriesMembership, ...rest } = book;

	return normalizeBookRecord({
		...rest,
		readAfterBooks: mapReadAfterBooks(readAfterPrerequisites),
		series: mapBookSeriesSummary(seriesMembership),
	});
}

function normalizeBookRecord<T extends TGetBookBySlugOutputSchema>(book: T): T {
	return {
		...book,
		subjectPeople: book.subjectPeople ?? [],
		subjectTimes: book.subjectTimes ?? [],
		subjects: book.subjects ?? [],
		countries: book.countries ?? [],
	};
}

export async function addBook(
	input: TAddBookInputSchema,
	db: Database,
	adminUserId: string,
) {
	const {
		acceptanceNotes,
		readAfterBookSlugs,
		seriesSlug,
		newSeries,
		...bookInput
	} = input;
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
				countries: bookInput.countries ?? [],
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

		let attachedSeriesSlug: string | undefined;

		if (newSeries) {
			const created = await createSeriesRecord(newSeries, tx);
			await appendBookToEndOfSeriesByBookId(book.id, created.slug, tx);
			attachedSeriesSlug = created.slug;
		} else if (seriesSlug) {
			const attached = await appendBookToEndOfSeriesByBookId(
				book.id,
				seriesSlug,
				tx,
			);
			attachedSeriesSlug = attached.slug;
		}

		return { ...book, seriesSlug: attachedSeriesSlug };
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
