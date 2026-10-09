import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { MAX_BOOKS_PER_SHELF } from "@bbrc/shared";
import type { z } from "zod";
import type { ShelfStatusSchema } from "./shelf.schema";

type ShelfStatus = z.infer<typeof ShelfStatusSchema>;

import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { tryDeleteR2PublicUrl } from "../storage/storage-r2-cleanup";
import { awardShelfXp } from "../xp/xp.service";
import { shelfListSorting } from "./shelf.listing";
import type {
	CreateShelfInput,
	CreateShelfOutput,
	DeleteShelfInput,
	GetShelfBySlugOutput,
	GetShelfListInput,
	GetShelfListOutput,
	ListMyEditableShelvesOutput,
	ListShelvesByUsernameOutput,
	ListShelvesForBookOutput,
	UpdateShelfInput,
} from "./shelf.schema";
import {
	getShelfListFields,
	mapShelfListItem,
	shelfBookSelect,
	shelfListItemSelect,
	shelfListItemWithCoverSelect,
} from "./shelf.schema";
import { buildPublicShelfListWhere } from "./shelf-list-where";
import { generateShelfSlug } from "./shelf-slug";

const COVER_PREVIEW_LIMIT = 4;

type ShelfListRow = Prisma.ShelfGetPayload<{
	select: typeof getShelfListFields;
}>;

const shelfListCursorCodec = {
	decode(cursor: string): { id: string } {
		return { id: cursor };
	},
	encode(item: ShelfListRow): string {
		return item.id;
	},
};

function withStableShelfOrderBy(
	orderBy: Prisma.ShelfOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.ShelfOrderByWithRelationInput[] {
	return [orderBy, { id: sortDirection }];
}

async function loadCoverPreviewMap(
	shelfIds: string[],
	db: Database,
): Promise<Map<string, (number | null)[]>> {
	if (shelfIds.length === 0) {
		return new Map();
	}

	const rows = await db.shelfBook.findMany({
		where: { shelfId: { in: shelfIds } },
		orderBy: [{ shelfId: "asc" }, { position: "asc" }],
		select: {
			shelfId: true,
			book: { select: { coverId: true } },
		},
	});

	const map = new Map<string, (number | null)[]>();

	for (const row of rows) {
		const current = map.get(row.shelfId) ?? [];
		if (current.length >= COVER_PREVIEW_LIMIT) {
			continue;
		}
		current.push(row.book.coverId ?? null);
		map.set(row.shelfId, current);
	}

	return map;
}

async function loadUserByUsername(username: string, db: Database) {
	const user = await db.user.findUnique({
		where: { username },
		select: { id: true, username: true },
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "Member not found",
			data: { username },
		});
	}

	return user;
}

async function loadBookBySlug(
	slug: string,
	db: Database | DatabaseTransaction,
) {
	const book = await db.book.findUnique({
		where: { slug },
		select: { id: true, slug: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug },
		});
	}

	return book;
}

async function loadOwnedShelf(
	shelfSlug: string,
	userId: string,
	db: Database | DatabaseTransaction,
) {
	const shelf = await db.shelf.findFirst({
		where: { userId, slug: shelfSlug },
		select: {
			id: true,
			slug: true,
			title: true,
			description: true,
			coverImageUrl: true,
			status: true,
			type: true,
			userId: true,
			updatedAt: true,
			_count: { select: { books: true } },
		},
	});

	if (!shelf) {
		throw new ORPCError("NOT_FOUND", {
			message: "Shelf not found",
			data: { shelfSlug },
		});
	}

	return shelf;
}

function viewerIsOwner(viewerUserId: string | undefined, ownerId: string) {
	return viewerUserId != null && viewerUserId === ownerId;
}

function assertCanViewShelf(
	shelf: { status: ShelfStatus; userId: string },
	viewerUserId: string | undefined,
) {
	if (shelf.status === "active") {
		return;
	}

	if (!viewerIsOwner(viewerUserId, shelf.userId)) {
		throw new ORPCError("NOT_FOUND", {
			message: "Shelf not found",
		});
	}
}

export async function listShelvesByUsername(
	username: string,
	status: ShelfStatus | undefined,
	viewerUserId: string | undefined,
	db: Database,
): Promise<ListShelvesByUsernameOutput> {
	const user = await loadUserByUsername(username, db);
	const isOwner = viewerIsOwner(viewerUserId, user.id);

	let statusFilter: ShelfStatus | undefined;

	if (isOwner && status) {
		statusFilter = status;
	} else if (isOwner && !status) {
		statusFilter = undefined;
	} else {
		statusFilter = "active";
	}

	const rows = await db.shelf.findMany({
		where: {
			userId: user.id,
			status: statusFilter,
		},
		orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
		select: shelfListItemSelect,
	});

	const coverMap = await loadCoverPreviewMap(
		rows.map((row) => row.id),
		db,
	);

	return {
		items: rows.map((row) => mapShelfListItem(row, coverMap.get(row.id) ?? [])),
		isOwner,
	};
}

export async function getShelfBySlug(
	username: string,
	shelfSlug: string,
	viewerUserId: string | undefined,
	db: Database,
): Promise<GetShelfBySlugOutput> {
	const user = await loadUserByUsername(username, db);

	const shelf = await db.shelf.findFirst({
		where: { userId: user.id, slug: shelfSlug },
		select: {
			...shelfListItemSelect,
			userId: true,
			books: {
				orderBy: { position: "asc" },
				select: shelfBookSelect,
			},
		},
	});

	if (!shelf) {
		throw new ORPCError("NOT_FOUND", {
			message: "Shelf not found",
			data: { shelfSlug },
		});
	}

	assertCanViewShelf(shelf, viewerUserId);

	const isOwner = viewerIsOwner(viewerUserId, shelf.userId);
	const coverMap = await loadCoverPreviewMap([shelf.id], db);
	const coverPreviewCoverIds = coverMap.get(shelf.id) ?? [];

	return {
		...mapShelfListItem(shelf, coverPreviewCoverIds),
		books: shelf.books,
		isOwner,
	};
}

export async function getShelfList(
	input: GetShelfListInput,
	db: Database,
): Promise<GetShelfListOutput> {
	const pagination = definePagination.cursor(input, shelfListCursorCodec);
	const sorting = shelfListSorting.from(input);
	const where = await buildPublicShelfListWhere(input, db);

	const rows = await db.shelf.findMany({
		...pagination.use(),
		where,
		orderBy: withStableShelfOrderBy(sorting.use(), sorting.sortDirection),
		select: getShelfListFields,
	});

	const page = pagination.paginate(rows);
	const coverMap = await loadCoverPreviewMap(
		page.items.map((row) => row.id),
		db,
	);

	return {
		items: page.items.map((row) => ({
			...mapShelfListItem(row, coverMap.get(row.id) ?? []),
			owner: row.user,
		})),
		metadata: page.metadata,
	};
}

export async function createShelf(
	input: CreateShelfInput,
	userId: string,
	db: Database,
): Promise<CreateShelfOutput> {
	const result = await db.$transaction(async (tx) => {
		const slug = await generateShelfSlug(input.title, userId, tx);

		const shelf = await tx.shelf.create({
			data: {
				userId,
				slug,
				title: input.title.trim(),
				description: input.description?.trim() || null,
				status: input.status ?? "draft",
				type: input.type ?? "unordered",
			},
			select: { id: true, slug: true },
		});

		await awardShelfXp({ userId, shelfId: shelf.id }, tx);

		if (input.addBookSlug) {
			const book = await loadBookBySlug(input.addBookSlug, tx);
			await tx.shelfBook.create({
				data: {
					shelfId: shelf.id,
					bookId: book.id,
					position: 0,
				},
			});
		}

		return shelf;
	});

	return { slug: result.slug };
}

export async function updateShelf(
	input: UpdateShelfInput,
	userId: string,
	db: Database,
) {
	const shelf = await loadOwnedShelf(input.shelfSlug, userId, db);

	const data: Prisma.ShelfUpdateInput = {};

	if (input.title !== undefined) {
		data.title = input.title.trim();
	}
	if (input.description !== undefined) {
		data.description = input.description?.trim() || null;
	}
	if (input.status !== undefined) {
		if (input.status === "draft" && shelf.status !== "draft") {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"A shelf that has been public or archived cannot be moved back to draft.",
			});
		}
		data.status = input.status;
	}
	if (input.type !== undefined) {
		data.type = input.type;
	}

	const updated = await db.shelf.update({
		where: { id: shelf.id },
		data,
		select: shelfListItemSelect,
	});

	return mapShelfListItem(updated);
}

export async function deleteShelf(
	input: DeleteShelfInput,
	userId: string,
	db: Database,
) {
	const shelf = await loadOwnedShelf(input.shelfSlug, userId, db);

	if (shelf._count.books > 0) {
		const confirm = input.confirmTitle?.trim();
		if (!confirm || confirm !== shelf.title) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Type the shelf title to confirm deletion.",
			});
		}
	}

	await tryDeleteR2PublicUrl(shelf.coverImageUrl);

	await db.shelf.delete({ where: { id: shelf.id } });

	return { removed: true as const };
}

async function nextShelfPosition(
	shelfId: string,
	tx: DatabaseTransaction,
): Promise<number> {
	const agg = await tx.shelfBook.aggregate({
		where: { shelfId },
		_max: { position: true },
	});
	const max = agg._max.position;
	return max == null ? 0 : max + 1;
}

export async function addBookToShelf(
	shelfSlug: string,
	bookSlug: string,
	userId: string,
	db: Database,
) {
	await db.$transaction(async (tx) => {
		const shelf = await loadOwnedShelf(shelfSlug, userId, tx);

		if (shelf._count.books >= MAX_BOOKS_PER_SHELF) {
			throw new ORPCError("BAD_REQUEST", {
				message: `A shelf can hold at most ${MAX_BOOKS_PER_SHELF} books.`,
			});
		}

		const book = await loadBookBySlug(bookSlug, tx);

		const existing = await tx.shelfBook.findUnique({
			where: {
				shelfId_bookId: { shelfId: shelf.id, bookId: book.id },
			},
			select: { id: true },
		});

		if (existing) {
			throw new ORPCError("CONFLICT", {
				message: "This book is already on the shelf.",
			});
		}

		const position = await nextShelfPosition(shelf.id, tx);

		await tx.shelfBook.create({
			data: {
				shelfId: shelf.id,
				bookId: book.id,
				position,
			},
		});

		await tx.shelf.update({
			where: { id: shelf.id },
			data: { updatedAt: new Date() },
		});
	});

	const shelf = await loadOwnedShelf(shelfSlug, userId, db);

	return {
		added: true as const,
		bookCount: shelf._count.books,
	};
}

export async function removeBookFromShelf(
	shelfSlug: string,
	bookSlug: string,
	userId: string,
	db: Database,
) {
	await db.$transaction(async (tx) => {
		const shelf = await loadOwnedShelf(shelfSlug, userId, tx);
		const book = await loadBookBySlug(bookSlug, tx);

		const deleted = await tx.shelfBook.deleteMany({
			where: { shelfId: shelf.id, bookId: book.id },
		});

		if (deleted.count === 0) {
			throw new ORPCError("NOT_FOUND", {
				message: "Book not on this shelf.",
			});
		}

		const remaining = await tx.shelfBook.findMany({
			where: { shelfId: shelf.id },
			orderBy: { position: "asc" },
			select: { id: true, bookId: true },
		});

		for (const [i, row] of remaining.entries()) {
			await tx.shelfBook.update({
				where: { id: row.id },
				data: { position: -1 - i },
			});
		}

		for (const [i, row] of remaining.entries()) {
			await tx.shelfBook.update({
				where: { id: row.id },
				data: { position: i },
			});
		}

		await tx.shelf.update({
			where: { id: shelf.id },
			data: { updatedAt: new Date() },
		});
	});

	return { removed: true as const };
}

export async function reorderShelfBooks(
	shelfSlug: string,
	bookSlugs: string[],
	userId: string,
	db: Database,
) {
	await db.$transaction(async (tx) => {
		const shelf = await loadOwnedShelf(shelfSlug, userId, tx);

		const rows = await tx.shelfBook.findMany({
			where: { shelfId: shelf.id },
			select: {
				bookId: true,
				book: { select: { slug: true } },
			},
		});

		if (rows.length !== bookSlugs.length) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Reorder list must include every book on the shelf.",
			});
		}

		const slugToBookId = new Map(
			rows.map((row) => [row.book.slug, row.bookId]),
		);
		const orderedBookIds: string[] = [];

		for (const slug of bookSlugs) {
			const bookId = slugToBookId.get(slug);
			if (!bookId) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Reorder list includes a book that is not on this shelf.",
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
			await tx.shelfBook.update({
				where: {
					shelfId_bookId: {
						shelfId: shelf.id,
						bookId,
					},
				},
				data: { position: -1 - i },
			});
		}

		for (const [i, bookId] of orderedBookIds.entries()) {
			await tx.shelfBook.update({
				where: {
					shelfId_bookId: {
						shelfId: shelf.id,
						bookId,
					},
				},
				data: { position: i },
			});
		}

		await tx.shelf.update({
			where: { id: shelf.id },
			data: { updatedAt: new Date() },
		});
	});

	return { updated: true as const };
}

export async function listShelvesForBook(
	bookSlug: string,
	viewerUserId: string | undefined,
	db: Database,
): Promise<ListShelvesForBookOutput> {
	const book = await loadBookBySlug(bookSlug, db);

	const rows = await db.shelf.findMany({
		where: {
			books: { some: { bookId: book.id } },
			OR: [
				{ status: "active" },
				...(viewerUserId ? [{ userId: viewerUserId }] : []),
			],
		},
		orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
		select: {
			...shelfListItemWithCoverSelect,
			userId: true,
			user: { select: { username: true, name: true } },
		},
	});

	const coverMap = await loadCoverPreviewMap(
		rows.map((row) => row.id),
		db,
	);

	return {
		items: rows.map((row) => ({
			...mapShelfListItem(row, coverMap.get(row.id) ?? []),
			owner: {
				username: row.user.username,
				name: row.user.name,
			},
			isOwner: viewerUserId != null && row.userId === viewerUserId,
		})),
		maxBooksPerShelf: MAX_BOOKS_PER_SHELF,
	};
}

export async function listMyEditableShelves(
	bookSlug: string | undefined,
	userId: string,
	db: Database,
): Promise<ListMyEditableShelvesOutput> {
	const bookId = bookSlug ? (await loadBookBySlug(bookSlug, db)).id : null;

	const rows = await db.shelf.findMany({
		where: {
			userId,
			status: { in: ["draft", "active"] },
		},
		orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
		select: {
			id: true,
			slug: true,
			title: true,
			status: true,
			_count: { select: { books: true } },
		},
	});

	const containsShelfIds = new Set<string>();
	if (bookId && rows.length > 0) {
		const links = await db.shelfBook.findMany({
			where: {
				bookId,
				shelfId: { in: rows.map((row) => row.id) },
			},
			select: { shelfId: true },
		});
		for (const link of links) {
			containsShelfIds.add(link.shelfId);
		}
	}

	return {
		items: rows.map((row) => ({
			slug: row.slug,
			title: row.title,
			status: row.status,
			bookCount: row._count.books,
			containsBook: containsShelfIds.has(row.id),
		})),
		maxBooksPerShelf: MAX_BOOKS_PER_SHELF,
	};
}
