import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { isSlug } from "@bbrc/shared";
import { appError } from "../../lib/app-error";
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
		throw appError("NOT_FOUND", "series.notFound", { data: { slug } });
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
		throw appError("NOT_FOUND", "book.notFound", { data: { slug: bookSlug } });
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
		throw appError("CONFLICT", "series.alreadyInSeries", {
			params: { series: existing.series.title },
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
		select: { id: true, position: true },
	});

	// A half step (1.5) is deliberate, so a series that has one keeps its numbers.
	if (rows.some((row) => !Number.isInteger(row.position))) {
		return;
	}

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
		throw appError("NOT_FOUND", "series.notFound", { data: { slug } });
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

export async function createSeriesRecord(
	input: CreateSeriesInput,
	db: Database | DatabaseTransaction,
) {
	const title = input.title.trim();
	const description = input.description?.trim() || null;

	const slug =
		input.slug?.trim() && isSlug(input.slug.trim())
			? input.slug.trim()
			: await generateSeriesSlug(title, db);

	if (input.slug?.trim() && !isSlug(input.slug.trim())) {
		throw appError("BAD_REQUEST", "series.invalidSlug");
	}

	const existingSlug = await db.series.findUnique({
		where: { slug },
		select: { id: true },
	});

	if (existingSlug) {
		throw appError("CONFLICT", "series.slugTaken", { data: { slug } });
	}

	await db.series.create({
		data: { slug, title, description },
	});

	return { slug };
}

export async function createSeries(input: CreateSeriesInput, db: Database) {
	return createSeriesRecord(input, db);
}

export async function appendBookToEndOfSeriesByBookId(
	bookId: string,
	seriesSlug: string,
	db: Database | DatabaseTransaction,
) {
	const series = await loadSeriesBySlugOrThrow(seriesSlug, db);

	await assertBookNotInAnotherSeries(bookId, series.id, db);

	const existing = await db.seriesBook.findUnique({
		where: { bookId },
		select: { id: true, position: true, seriesId: true },
	});

	if (existing?.seriesId === series.id) {
		return { slug: series.slug, position: existing.position };
	}

	const maxRow = await db.seriesBook.findFirst({
		where: { seriesId: series.id },
		orderBy: { position: "desc" },
		select: { position: true },
	});

	const position = Math.floor(maxRow?.position ?? 0) + 1;

	await db.seriesBook.create({
		data: {
			seriesId: series.id,
			bookId,
			position,
		},
	});

	await db.series.update({
		where: { id: series.id },
		data: { updatedAt: new Date() },
	});

	return { slug: series.slug, position };
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
			throw appError("BAD_REQUEST", "series.invalidSlug");
		}

		const taken = await db.series.findUnique({
			where: { slug: input.nextSlug },
			select: { id: true },
		});

		if (taken) {
			throw appError("CONFLICT", "series.slugTaken", {
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

/**
 * Puts a book at a chosen place in a series. With no place it goes to the end.
 * When the place is taken, a whole number can push the later books down by one
 * (`shiftLater`); a half step never moves anything and fails if it is taken.
 */
export async function placeBookInSeries(
	db: Database | DatabaseTransaction,
	params: {
		bookId: string;
		seriesSlug: string;
		position?: number | null;
		shiftLater?: boolean;
	},
) {
	const series = await loadSeriesBySlugOrThrow(params.seriesSlug, db);
	await assertBookNotInAnotherSeries(params.bookId, series.id, db);

	const rows = await db.seriesBook.findMany({
		where: { seriesId: series.id, NOT: { bookId: params.bookId } },
		orderBy: { position: "asc" },
		select: { id: true, position: true, book: { select: { title: true } } },
	});

	const last = rows.at(-1);
	const position =
		params.position ?? (last ? Math.floor(last.position) + 1 : 1);

	const taken = rows.find((row) => row.position === position);
	if (taken && (!params.shiftLater || !Number.isInteger(position))) {
		throw appError("CONFLICT", "series.placeTaken", {
			params: { position: position, book: taken.book.title },
			data: { position },
		});
	}

	// Lift the book out first (a move), so its old number never blocks a shift.
	await db.seriesBook.deleteMany({
		where: { bookId: params.bookId, seriesId: series.id },
	});

	if (taken) {
		// Latest first, so no two books ever share a number while they move.
		const later = rows.filter((row) => row.position >= position).reverse();
		for (const row of later) {
			await db.seriesBook.update({
				where: { id: row.id },
				data: { position: row.position + 1 },
			});
		}
	}

	await db.seriesBook.create({
		data: { seriesId: series.id, bookId: params.bookId, position },
	});
	await db.series.update({
		where: { id: series.id },
		data: { updatedAt: new Date() },
	});

	return { slug: series.slug, position };
}

/** Takes a book out of whatever series it is in (no-op when it is in none). */
export async function detachBookFromSeries(
	db: DatabaseTransaction,
	bookId: string,
) {
	const membership = await db.seriesBook.findUnique({
		where: { bookId },
		select: { id: true, seriesId: true },
	});
	if (!membership) return;
	await db.seriesBook.delete({ where: { id: membership.id } });
	await recompactSeriesPositions(membership.seriesId, db);
	await db.series.update({
		where: { id: membership.seriesId },
		data: { updatedAt: new Date() },
	});
}

export async function addBookToSeries(
	input: AddBookToSeriesInput,
	db: Database,
) {
	const book = await loadBookBySlugOrThrow(input.bookSlug, db);

	return db.$transaction(async (tx) => {
		const result = await placeBookInSeries(tx, {
			bookId: book.id,
			seriesSlug: input.seriesSlug,
			position: input.position,
			shiftLater: input.shiftLater,
		});
		return { added: true as const, position: result.position };
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
			throw appError("NOT_FOUND", "series.bookNotInSeries");
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
			throw appError("BAD_REQUEST", "series.reorderMissing");
		}

		const slugToBookId = new Map(
			rows.map((row) => [row.book.slug, row.bookId]),
		);
		const orderedBookIds: string[] = [];

		for (const slug of input.bookSlugs) {
			const bookId = slugToBookId.get(slug);
			if (!bookId) {
				throw appError("BAD_REQUEST", "series.reorderForeign");
			}
			orderedBookIds.push(bookId);
		}

		if (new Set(orderedBookIds).size !== orderedBookIds.length) {
			throw appError("BAD_REQUEST", "series.reorderDuplicate");
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
	if (!membership?.series) {
		return null;
	}

	const title = membership.series.title?.trim();
	const slug = membership.series.slug?.trim();
	const position = membership.position;

	if (!title || !slug || !Number.isFinite(position) || position < 1) {
		return null;
	}

	return {
		slug,
		title,
		position,
	};
}
