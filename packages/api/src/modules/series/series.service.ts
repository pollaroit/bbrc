import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { isSlug } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { seriesListSearching, seriesListSorting } from "./series.listing";
import type {
	AddBookToSeriesInput,
	CreateSeriesInput,
	DeleteSeriesInput,
	GetSeriesBySlugOutput,
	GetSeriesListInput,
	GetSeriesListOutput,
	RemoveBookFromSeriesInput,
	ReorderSeriesBooksInput,
	UpdateSeriesInput,
} from "./series.schema";
import { generateSeriesSlug } from "./series-slug";

const COVER_PREVIEW_LIMIT = 4;

const seriesBookSelect = {
	position: true,
	book: {
		select: {
			slug: true,
			title: true,
			authors: true,
			coverId: true,
			publishedIn: true,
		},
	},
} as const;

const seriesListSelect = {
	id: true,
	slug: true,
	title: true,
	description: true,
	updatedAt: true,
	_count: { select: { books: true } },
} as const;

type SeriesListRow = Prisma.SeriesGetPayload<{
	select: typeof seriesListSelect;
}>;

const seriesListCursorCodec = {
	decode(cursor: string): { slug: string } {
		return { slug: cursor };
	},
	encode(item: SeriesListRow): string {
		return item.slug;
	},
};

function withStableSeriesOrderBy(
	orderBy: Prisma.SeriesOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.SeriesOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

async function loadCoverPreviewMap(
	seriesIds: string[],
	db: Database,
): Promise<Map<string, (number | null)[]>> {
	if (seriesIds.length === 0) {
		return new Map();
	}

	const rows = await db.seriesBook.findMany({
		where: { seriesId: { in: seriesIds } },
		orderBy: [{ seriesId: "asc" }, { position: "asc" }],
		select: {
			seriesId: true,
			book: { select: { coverId: true } },
		},
	});

	const map = new Map<string, (number | null)[]>();

	for (const row of rows) {
		const current = map.get(row.seriesId) ?? [];
		if (current.length >= COVER_PREVIEW_LIMIT) {
			continue;
		}
		current.push(row.book.coverId ?? null);
		map.set(row.seriesId, current);
	}

	return map;
}

function mapSeriesListItem(
	row: SeriesListRow,
	coverPreviewCoverIds: (number | null)[],
) {
	return {
		slug: row.slug,
		title: row.title,
		description: row.description,
		bookCount: row._count.books,
		updatedAt: row.updatedAt,
		coverPreviewCoverIds,
	};
}

async function loadSeriesBySlugOrThrow(
	slug: string,
	db: Database | DatabaseTransaction,
) {
	const series = await db.series.findUnique({
		where: { slug },
		select: { id: true, slug: true, title: true },
	});

	if (!series) {
		throw new ORPCError("NOT_FOUND", {
			message: "Series not found",
			data: { slug },
		});
	}

	return series;
}

async function loadBookBySlugOrThrow(
	bookSlug: string,
	db: Database | DatabaseTransaction,
) {
	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: { id: true, slug: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug: bookSlug },
		});
	}

	return book;
}

async function assertBookNotInAnotherSeries(
	bookId: string,
	seriesId: string,
	db: Database | DatabaseTransaction,
) {
	const existing = await db.seriesBook.findUnique({
		where: { bookId },
		select: { seriesId: true, series: { select: { slug: true, title: true } } },
	});

	if (existing && existing.seriesId !== seriesId) {
		throw new ORPCError("CONFLICT", {
			message: `This book is already in “${existing.series.title}”. Remove it there first.`,
			data: { seriesSlug: existing.series.slug },
		});
	}
}

async function recompactSeriesPositions(
	seriesId: string,
	tx: DatabaseTransaction,
) {
	const rows = await tx.seriesBook.findMany({
		where: { seriesId },
		orderBy: { position: "asc" },
		select: { id: true },
	});

	for (const [index, row] of rows.entries()) {
		await tx.seriesBook.update({
			where: { id: row.id },
			data: { position: -1 - index },
		});
	}

	for (const [index, row] of rows.entries()) {
		await tx.seriesBook.update({
			where: { id: row.id },
			data: { position: index + 1 },
		});
	}
}

export async function getSeriesList(
	input: GetSeriesListInput,
	db: Database,
): Promise<GetSeriesListOutput> {
	const pagination = definePagination.cursor(input, seriesListCursorCodec);
	const sorting = seriesListSorting.from(input);
	const searching = seriesListSearching.from(input);

	const where: Prisma.SeriesWhereInput = {
		...searching.use(),
	};

	const isFirstPage = input.cursor == null;

	const [rows, total] = await Promise.all([
		db.series.findMany({
			...pagination.use(),
			where,
			orderBy: withStableSeriesOrderBy(sorting.use(), sorting.sortDirection),
			select: seriesListSelect,
		}),
		isFirstPage ? db.series.count({ where }) : Promise.resolve(undefined),
	]);

	const page = pagination.paginate(rows);
	const coverMap = await loadCoverPreviewMap(
		page.items.map((row) => row.id),
		db,
	);

	return {
		items: page.items.map((row) =>
			mapSeriesListItem(row, coverMap.get(row.id) ?? []),
		),
		metadata: {
			...page.metadata,
			...(total != null ? { total } : {}),
		},
	};
}

export async function getSeriesBySlug(
	slug: string,
	db: Database,
): Promise<GetSeriesBySlugOutput> {
	const series = await db.series.findUnique({
		where: { slug },
		select: {
			...seriesListSelect,
			books: {
				orderBy: { position: "asc" },
				select: seriesBookSelect,
			},
		},
	});

	if (!series) {
		throw new ORPCError("NOT_FOUND", {
			message: "Series not found",
			data: { slug },
		});
	}

	const { books, _count, ...rest } = series;
	const coverPreviewCoverIds =
		books
			.slice(0, COVER_PREVIEW_LIMIT)
			.map((row) => row.book.coverId ?? null) ?? [];

	return {
		...mapSeriesListItem({ ...rest, _count }, coverPreviewCoverIds),
		books,
	};
}

export async function createSeries(input: CreateSeriesInput, db: Database) {
	const title = input.title.trim();
	const description = input.description?.trim() || null;

	const slug =
		input.slug?.trim() && isSlug(input.slug.trim())
			? input.slug.trim()
			: await generateSeriesSlug(title, db);

	if (input.slug?.trim() && !isSlug(input.slug.trim())) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid slug" });
	}

	const existingSlug = await db.series.findUnique({
		where: { slug },
		select: { id: true },
	});

	if (existingSlug) {
		throw new ORPCError("CONFLICT", {
			message: "A series with this slug already exists",
			data: { slug },
		});
	}

	await db.series.create({
		data: { slug, title, description },
	});

	return { slug };
}

export async function updateSeries(input: UpdateSeriesInput, db: Database) {
	const series = await loadSeriesBySlugOrThrow(input.slug, db);

	const data: Prisma.SeriesUpdateInput = {};

	if (input.title != null) {
		data.title = input.title.trim();
	}

	if (input.description !== undefined) {
		data.description = input.description?.trim() || null;
	}

	let nextSlug = series.slug;

	if (input.nextSlug != null && input.nextSlug !== series.slug) {
		if (!isSlug(input.nextSlug)) {
			throw new ORPCError("BAD_REQUEST", { message: "Invalid slug" });
		}

		const taken = await db.series.findUnique({
			where: { slug: input.nextSlug },
			select: { id: true },
		});

		if (taken) {
			throw new ORPCError("CONFLICT", {
				message: "A series with this slug already exists",
				data: { slug: input.nextSlug },
			});
		}

		data.slug = input.nextSlug;
		nextSlug = input.nextSlug;
	}

	await db.series.update({
		where: { id: series.id },
		data,
	});

	return { slug: nextSlug };
}

export async function deleteSeries(input: DeleteSeriesInput, db: Database) {
	const series = await loadSeriesBySlugOrThrow(input.slug, db);

	await db.series.delete({ where: { id: series.id } });

	return { deleted: true as const };
}

export async function addBookToSeries(
	input: AddBookToSeriesInput,
	db: Database,
) {
	const series = await loadSeriesBySlugOrThrow(input.seriesSlug, db);
	const book = await loadBookBySlugOrThrow(input.bookSlug, db);

	return db.$transaction(async (tx) => {
		await assertBookNotInAnotherSeries(book.id, series.id, tx);

		const existing = await tx.seriesBook.findUnique({
			where: { bookId: book.id },
			select: { id: true, position: true, seriesId: true },
		});

		if (existing?.seriesId === series.id) {
			return { added: true as const, position: existing.position };
		}

		const maxRow = await tx.seriesBook.findFirst({
			where: { seriesId: series.id },
			orderBy: { position: "desc" },
			select: { position: true },
		});

		const position = (maxRow?.position ?? 0) + 1;

		await tx.seriesBook.create({
			data: {
				seriesId: series.id,
				bookId: book.id,
				position,
			},
		});

		await tx.series.update({
			where: { id: series.id },
			data: { updatedAt: new Date() },
		});

		return { added: true as const, position };
	});
}

export async function removeBookFromSeries(
	input: RemoveBookFromSeriesInput,
	db: Database,
) {
	const series = await loadSeriesBySlugOrThrow(input.seriesSlug, db);
	const book = await loadBookBySlugOrThrow(input.bookSlug, db);

	await db.$transaction(async (tx) => {
		const membership = await tx.seriesBook.findUnique({
			where: { bookId: book.id },
			select: { id: true, seriesId: true },
		});

		if (!membership || membership.seriesId !== series.id) {
			throw new ORPCError("NOT_FOUND", {
				message: "This book is not in this series",
			});
		}

		await tx.seriesBook.delete({ where: { id: membership.id } });
		await recompactSeriesPositions(series.id, tx);

		await tx.series.update({
			where: { id: series.id },
			data: { updatedAt: new Date() },
		});
	});

	return { removed: true as const };
}

export async function reorderSeriesBooks(
	input: ReorderSeriesBooksInput,
	db: Database,
) {
	const series = await loadSeriesBySlugOrThrow(input.seriesSlug, db);

	await db.$transaction(async (tx) => {
		const rows = await tx.seriesBook.findMany({
			where: { seriesId: series.id },
			select: {
				bookId: true,
				book: { select: { slug: true } },
			},
		});

		if (rows.length !== input.bookSlugs.length) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Reorder list must include every book in the series.",
			});
		}

		const slugToBookId = new Map(
			rows.map((row) => [row.book.slug, row.bookId]),
		);
		const orderedBookIds: string[] = [];

		for (const slug of input.bookSlugs) {
			const bookId = slugToBookId.get(slug);
			if (!bookId) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Reorder list includes a book that is not in this series.",
				});
			}
			orderedBookIds.push(bookId);
		}

		if (new Set(orderedBookIds).size !== orderedBookIds.length) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Reorder list contains duplicate books.",
			});
		}

		for (const [i, bookId] of orderedBookIds.entries()) {
			await tx.seriesBook.update({
				where: { bookId },
				data: { position: -1 - i },
			});
		}

		for (const [i, bookId] of orderedBookIds.entries()) {
			await tx.seriesBook.update({
				where: { bookId },
				data: { position: i + 1 },
			});
		}

		await tx.series.update({
			where: { id: series.id },
			data: { updatedAt: new Date() },
		});
	});

	return { reordered: true as const };
}

export async function listBookSlugsInSeries(
	seriesSlug: string,
	db: Database,
): Promise<string[]> {
	const series = await db.series.findUnique({
		where: { slug: seriesSlug },
		select: {
			books: {
				orderBy: { position: "asc" },
				select: { book: { select: { slug: true } } },
			},
		},
	});

	if (!series) {
		return [];
	}

	return series.books.map((row) => row.book.slug);
}

export function mapBookSeriesSummary(
	membership:
		| {
				position: number;
				series: { slug: string; title: string };
		  }
		| null
		| undefined,
) {
	if (!membership) {
		return null;
	}

	return {
		slug: membership.series.slug,
		title: membership.series.title,
		position: membership.position,
	};
}
