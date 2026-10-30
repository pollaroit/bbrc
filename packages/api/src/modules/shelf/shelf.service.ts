import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import {
	MAX_BOOKS_PER_SHELF,
	reorderPermissionFor,
	resolveShelfPermissions,
	type Viewer,
} from "@bbrc/shared";
import type { z } from "zod";
import type { ShelfStatusSchema } from "./shelf.schema";

type ShelfStatus = z.infer<typeof ShelfStatusSchema>;

import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { tryDeleteR2PublicUrl } from "../storage/storage-r2-cleanup";
import { throwMemberNotFound } from "../user/user-visibility";
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
	ShelfOverview,
	UpdateShelfInput,
} from "./shelf.schema";
import {
	getShelfListFields,
	mapShelfListItem,
	shelfBookSelect,
	shelfCardCollaboratorsSelect,
	shelfListItemSelect,
	shelfListItemWithCoverSelect,
} from "./shelf.schema";
import {
	assertNotWishlist,
	canViewShelf,
	loadShelfAccess,
	logShelfActivity,
	requireShelfPermission,
} from "./shelf-access";
import { buildPublicShelfListWhere } from "./shelf-list-where";
import { displayName, notifyShelfCollaboration } from "./shelf-notify";
import { generateShelfSlug } from "./shelf-slug";
import {
	countableShelfWhere,
	shelfVisibleWhere,
	WISHLIST_PROTECTED_MESSAGE,
} from "./shelf-visibility";

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

export async function loadCoverPreviewMap(
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
		select: {
			id: true,
			username: true,
			name: true,
			image: true,
			profileVisibility: true,
		},
	});

	if (!user) {
		throwMemberNotFound(username);
	}

	return user;
}

function viewerUserIdOf(viewer: Viewer): string | undefined {
	return viewer.kind === "member" ? viewer.userId : undefined;
}

async function loadBookBySlug(
	slug: string,
	db: Database | DatabaseTransaction,
) {
	const book = await db.book.findUnique({
		where: { slug },
		select: { id: true, slug: true, title: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug },
		});
	}

	return book;
}

function viewerIsOwner(viewerUserId: string | undefined, ownerId: string) {
	return viewerUserId != null && viewerUserId === ownerId;
}

const memberShelfSelect = {
	...shelfListItemSelect,
	_count: { select: { books: true, collaborators: true } },
	user: { select: { username: true, name: true } },
} as const;

export async function listShelvesByUsername(
	username: string,
	status: ShelfStatus | undefined,
	viewer: Viewer,
	db: Database,
): Promise<ListShelvesByUsernameOutput> {
	const user = await loadUserByUsername(username, db);
	const viewerUserId = viewerUserIdOf(viewer);
	const isOwner = viewerIsOwner(viewerUserId, user.id);

	const statusFilter: ShelfStatus | undefined = isOwner ? status : "active";
	// What the viewer may see by level (profile, shelf, friends, blocks); the Wishlist has
	// its own tab, never in this list.
	const visibilityFilter = shelfVisibleWhere(viewer);

	const [ownedRows, sharedRows] = await Promise.all([
		db.shelf.findMany({
			where: {
				userId: user.id,
				status: statusFilter,
				isWishlist: false,
				AND: [visibilityFilter],
			},
			orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
			select: memberShelfSelect,
		}),
		db.shelf.findMany({
			where: {
				collaborators: { some: { userId: user.id } },
				status: statusFilter,
				isWishlist: false,
				AND: [visibilityFilter],
			},
			orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
			select: {
				...memberShelfSelect,
				collaborators: {
					where: { userId: user.id },
					select: { permissions: true },
				},
			},
		}),
	]);

	// Someone else's draft or archived shelf only shows up for the collaborator
	// who was allowed to see it.
	const visibleShared = sharedRows.filter(
		(row) =>
			row.status === "active" ||
			(isOwner &&
				row.collaborators.some((collab) =>
					collab.permissions.includes("view_non_public"),
				)),
	);

	const rows = [
		...ownedRows.map((row) => ({ row, role: "owner" as const })),
		...visibleShared.map((row) => ({ row, role: "collaborator" as const })),
	].sort(
		(a, b) =>
			b.row.updatedAt.getTime() - a.row.updatedAt.getTime() ||
			a.row.title.localeCompare(b.row.title),
	);

	const coverMap = await loadCoverPreviewMap(
		rows.map(({ row }) => row.id),
		db,
	);

	return {
		items: rows.map(({ row, role }) => ({
			...mapShelfListItem(row, coverMap.get(row.id) ?? []),
			role,
			owner: { username: row.user.username, name: row.user.name },
			collaboratorCount: row._count.collaborators,
		})),
		isOwner,
	};
}

export async function getShelfBySlug(
	username: string,
	shelfSlug: string,
	viewer: Viewer,
	db: Database,
): Promise<GetShelfBySlugOutput> {
	const user = await loadUserByUsername(username, db);
	const viewerUserId = viewerUserIdOf(viewer);

	const shelf = await db.shelf.findFirst({
		where: { userId: user.id, slug: shelfSlug },
		select: {
			...shelfListItemSelect,
			userId: true,
			books: {
				orderBy: { position: "asc" },
				select: shelfBookSelect,
			},
			collaborators: {
				orderBy: { createdAt: "asc" },
				select: {
					userId: true,
					permissions: true,
					user: { select: { username: true, name: true, image: true } },
				},
			},
			invitations: {
				where: {
					inviteeId: viewerUserId ?? "",
					status: "pending",
					expiresAt: { gt: new Date() },
				},
				select: { id: true },
				take: 1,
			},
		},
	});

	if (!shelf) {
		throw new ORPCError("NOT_FOUND", {
			message: "Shelf not found",
			data: { shelfSlug },
		});
	}

	const isOwner = viewerIsOwner(viewerUserId, shelf.userId);
	const mine = shelf.collaborators.find(
		(collab) => collab.userId === viewerUserId,
	);
	const permissions = resolveShelfPermissions(isOwner, mine?.permissions ?? []);
	const pendingInvitationId = shelf.invitations[0]?.id ?? null;

	if (
		!canViewShelf(
			viewer,
			{
				status: shelf.status,
				userId: shelf.userId,
				visibility: shelf.visibility,
				ownerProfileVisibility: user.profileVisibility,
			},
			{
				permissions,
				hasPendingInvitation: pendingInvitationId != null,
				isCollaborator: mine != null,
			},
		)
	) {
		throw new ORPCError("NOT_FOUND", { message: "Shelf not found" });
	}

	const coverMap = await loadCoverPreviewMap([shelf.id], db);
	const coverPreviewCoverIds = coverMap.get(shelf.id) ?? [];

	return {
		...mapShelfListItem(shelf, coverPreviewCoverIds),
		books: shelf.books.map((row) => ({
			position: row.position,
			notes: row.notes,
			addedAt: row.createdAt,
			addedBy: row.addedBy,
			updatedBy: row.updatedBy,
			book: row.book,
		})),
		isOwner,
		owner: { username: user.username, name: user.name, image: user.image },
		collaborators: shelf.collaborators.map((collab) => collab.user),
		viewer: {
			role: isOwner ? "owner" : mine ? "collaborator" : "visitor",
			permissions: [...permissions],
			pendingInvitationId,
		},
	};
}

export async function getShelfList(
	input: GetShelfListInput,
	viewer: Viewer,
	db: Database,
): Promise<GetShelfListOutput> {
	const pagination = definePagination.cursor(input, shelfListCursorCodec);
	const sorting = shelfListSorting.from(input);
	const where = await buildPublicShelfListWhere(input, viewer, db);

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
			collaboratorCount: row._count.collaborators,
			collaborators: row.collaborators.map((collab) => collab.user),
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

		const owner = await tx.user.findUnique({
			where: { id: userId },
			select: { defaultShelfVisibility: true },
		});
		const shelf = await tx.shelf.create({
			data: {
				userId,
				slug,
				title: input.title.trim(),
				description: input.description?.trim() || null,
				status: input.status ?? "draft",
				type: input.type ?? "unordered",
				visibility:
					input.visibility ?? owner?.defaultShelfVisibility ?? "public",
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
					addedById: userId,
					updatedById: userId,
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
	const access = await loadShelfAccess(db, {
		ownerUsername: input.ownerUsername,
		shelfSlug: input.shelfSlug,
		actorId: userId,
	});
	const { shelf } = access;

	// Each field needs its own permission, but only when it actually changes,
	// because the edit form always sends every field.
	const data: Prisma.ShelfUpdateInput = {};
	const changed: string[] = [];

	// The Wishlist keeps its name, type, status and cover; only the description
	// and who can see it can change.
	if (shelf.isWishlist) {
		const wantsTitle =
			input.title !== undefined && input.title.trim() !== shelf.title;
		const wantsStatus =
			input.status !== undefined && input.status !== shelf.status;
		const wantsType = input.type !== undefined && input.type !== shelf.type;
		if (wantsTitle || wantsStatus || wantsType) {
			throw new ORPCError("BAD_REQUEST", {
				message: WISHLIST_PROTECTED_MESSAGE,
			});
		}
	}

	if (input.title !== undefined && input.title.trim() !== shelf.title) {
		requireShelfPermission(access, "edit_title");
		data.title = input.title.trim();
		changed.push("title");
	}
	if (
		input.description !== undefined &&
		(input.description?.trim() || null) !== shelf.description
	) {
		requireShelfPermission(access, "edit_description");
		data.description = input.description?.trim() || null;
		changed.push("description");
	}
	if (input.status !== undefined && input.status !== shelf.status) {
		requireShelfPermission(access, "edit_status");
		if (input.status === "draft" && shelf.status !== "draft") {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"A shelf that has been public or archived cannot be moved back to draft.",
			});
		}
		data.status = input.status;
		changed.push("status");
	}
	if (input.type !== undefined && input.type !== shelf.type) {
		requireShelfPermission(access, "edit_type");
		data.type = input.type;
		changed.push("type");
	}

	if (input.visibility !== undefined && input.visibility !== shelf.visibility) {
		if (!access.isOwner) {
			throw new ORPCError("FORBIDDEN", {
				message: "Only the owner can change who can see this shelf.",
			});
		}
		data.visibility = input.visibility;
		changed.push("visibility");
	}

	if (changed.length === 0) {
		return mapShelfListItem(shelf);
	}

	const updated = await db.$transaction(async (tx) => {
		const row = await tx.shelf.update({
			where: { id: shelf.id },
			data,
			select: shelfListItemSelect,
		});
		await logShelfActivity(tx, {
			shelfId: shelf.id,
			actorId: userId,
			kind: "shelf_updated",
			meta: { fields: changed },
		});
		return row;
	});

	return mapShelfListItem(updated);
}

export async function deleteShelf(
	input: DeleteShelfInput,
	userId: string,
	db: Database,
) {
	const access = await loadShelfAccess(db, {
		ownerUsername: input.ownerUsername,
		shelfSlug: input.shelfSlug,
		actorId: userId,
	});
	requireShelfPermission(access, "delete_shelf");
	const { shelf } = access;
	assertNotWishlist(shelf, "Your Wishlist cannot be deleted.");

	if (shelf._count.books > 0) {
		const confirm = input.confirmTitle?.trim();
		if (!confirm || confirm !== shelf.title) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Type the shelf title to confirm deletion.",
			});
		}
	}

	const [collaborators, actor] = await Promise.all([
		db.shelfCollaborator.findMany({
			where: { shelfId: shelf.id },
			select: { userId: true },
		}),
		db.user.findUnique({
			where: { id: userId },
			select: { name: true, username: true },
		}),
	]);

	await tryDeleteR2PublicUrl(shelf.coverImageUrl);

	await db.shelf.delete({ where: { id: shelf.id } });

	await notifyShelfCollaboration(db, {
		recipientUserIds: [shelf.userId, ...collaborators.map((row) => row.userId)],
		excludeUserIds: [userId],
		title: "A shared shelf was deleted",
		body: `${actor ? displayName(actor) : "Someone"} deleted "${shelf.title}".`,
	});

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
	input: { ownerUsername?: string; shelfSlug: string; bookSlug: string },
	userId: string,
	db: Database,
) {
	const bookCount = await db.$transaction(async (tx) => {
		const access = await loadShelfAccess(tx, {
			ownerUsername: input.ownerUsername,
			shelfSlug: input.shelfSlug,
			actorId: userId,
		});
		requireShelfPermission(access, "add_book");
		const { shelf } = access;
		const book = await loadBookBySlug(input.bookSlug, tx);
		// Books you have read do not belong on your Wishlist.
		if (shelf.isWishlist) {
			const alreadyRead = await tx.read.findUnique({
				where: { userId_bookId: { userId: shelf.userId, bookId: book.id } },
				select: { userId: true },
			});
			if (alreadyRead) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"You have already read this book, so it is not for the Wishlist.",
				});
			}
		}

		const existing = await tx.shelfBook.findUnique({
			where: {
				shelfId_bookId: { shelfId: shelf.id, bookId: book.id },
			},
			select: { id: true },
		});

		// Idempotent: a book that is already on the shelf is a success, so a
		// repeated click or a retry never errors the second time.
		if (existing) {
			return shelf._count.books;
		}

		if (shelf._count.books >= MAX_BOOKS_PER_SHELF) {
			throw new ORPCError("BAD_REQUEST", {
				message: `A shelf can hold at most ${MAX_BOOKS_PER_SHELF} books.`,
			});
		}

		const position = await nextShelfPosition(shelf.id, tx);

		await tx.shelfBook.create({
			data: {
				shelfId: shelf.id,
				bookId: book.id,
				position,
				addedById: userId,
				updatedById: userId,
			},
		});

		await tx.shelf.update({
			where: { id: shelf.id },
			data: { updatedAt: new Date() },
		});

		await logShelfActivity(tx, {
			shelfId: shelf.id,
			actorId: userId,
			kind: "book_added",
			meta: { title: book.title, slug: book.slug },
		});

		return shelf._count.books + 1;
	});

	return { added: true as const, bookCount };
}

export async function removeBookFromShelf(
	input: { ownerUsername?: string; shelfSlug: string; bookSlug: string },
	userId: string,
	db: Database,
) {
	await db.$transaction(async (tx) => {
		const access = await loadShelfAccess(tx, {
			ownerUsername: input.ownerUsername,
			shelfSlug: input.shelfSlug,
			actorId: userId,
		});
		requireShelfPermission(access, "remove_book");
		const { shelf } = access;
		const book = await loadBookBySlug(input.bookSlug, tx);

		const deleted = await tx.shelfBook.deleteMany({
			where: { shelfId: shelf.id, bookId: book.id },
		});

		// Idempotent: nothing to remove means it is already gone.
		if (deleted.count === 0) {
			return;
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

		await logShelfActivity(tx, {
			shelfId: shelf.id,
			actorId: userId,
			kind: "book_removed",
			meta: { title: book.title, slug: book.slug },
		});
	});

	return { removed: true as const };
}

export async function reorderShelfBooks(
	input: { ownerUsername?: string; shelfSlug: string; bookSlugs: string[] },
	userId: string,
	db: Database,
) {
	await db.$transaction(async (tx) => {
		const access = await loadShelfAccess(tx, {
			ownerUsername: input.ownerUsername,
			shelfSlug: input.shelfSlug,
			actorId: userId,
		});
		requireShelfPermission(access, reorderPermissionFor(access.shelf.type));
		const { shelf } = access;
		const bookSlugs = input.bookSlugs;

		const rows = await tx.shelfBook.findMany({
			where: { shelfId: shelf.id },
			select: {
				bookId: true,
				position: true,
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
		const previousPosition = new Map(
			rows.map((row) => [row.bookId, row.position]),
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

		let moved = 0;
		for (const [i, bookId] of orderedBookIds.entries()) {
			const didMove = previousPosition.get(bookId) !== i;
			if (didMove) moved += 1;
			await tx.shelfBook.update({
				where: {
					shelfId_bookId: {
						shelfId: shelf.id,
						bookId,
					},
				},
				data: { position: i, ...(didMove ? { updatedById: userId } : {}) },
			});
		}

		await tx.shelf.update({
			where: { id: shelf.id },
			data: { updatedAt: new Date() },
		});

		if (moved > 0) {
			await logShelfActivity(tx, {
				shelfId: shelf.id,
				actorId: userId,
				kind: "books_reordered",
				meta: { moved },
			});
		}
	});

	return { updated: true as const };
}

export async function updateBookNotes(
	input: {
		ownerUsername?: string;
		shelfSlug: string;
		bookSlug: string;
		notes: string | null;
	},
	userId: string,
	db: Database,
) {
	return db.$transaction(async (tx) => {
		const access = await loadShelfAccess(tx, {
			ownerUsername: input.ownerUsername,
			shelfSlug: input.shelfSlug,
			actorId: userId,
		});
		requireShelfPermission(access, "edit_notes");
		const book = await loadBookBySlug(input.bookSlug, tx);
		const notes = input.notes?.trim() || null;

		const existing = await tx.shelfBook.findUnique({
			where: {
				shelfId_bookId: { shelfId: access.shelf.id, bookId: book.id },
			},
			select: { notes: true },
		});
		if (!existing) {
			throw new ORPCError("NOT_FOUND", {
				message: "That book is not on this shelf.",
			});
		}
		if (existing.notes === notes) {
			return { notes };
		}

		await tx.shelfBook.update({
			where: {
				shelfId_bookId: { shelfId: access.shelf.id, bookId: book.id },
			},
			data: { notes, updatedById: userId },
		});
		await logShelfActivity(tx, {
			shelfId: access.shelf.id,
			actorId: userId,
			kind: "notes_edited",
			meta: { title: book.title, slug: book.slug },
		});

		return { notes };
	});
}

export async function listShelvesForBook(
	bookSlug: string,
	viewer: Viewer,
	db: Database,
): Promise<ListShelvesForBookOutput> {
	const book = await loadBookBySlug(bookSlug, db);
	const viewerUserId = viewerUserIdOf(viewer);

	const rows = await db.shelf.findMany({
		where: {
			books: { some: { bookId: book.id } },
			isWishlist: false,
			OR: [
				shelfVisibleWhere(viewer, { listing: true }),
				...(viewerUserId ? [{ userId: viewerUserId }] : []),
			],
		},
		orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
		select: {
			...shelfListItemWithCoverSelect,
			_count: { select: { books: true, collaborators: true } },
			collaborators: shelfCardCollaboratorsSelect,
			userId: true,
			user: { select: { username: true, name: true, image: true } },
		},
	});

	const coverMap = await loadCoverPreviewMap(
		rows.map((row) => row.id),
		db,
	);

	return {
		items: rows.map((row) => ({
			...mapShelfListItem(row, coverMap.get(row.id) ?? []),
			owner: row.user,
			isOwner: viewerUserId != null && row.userId === viewerUserId,
			collaboratorCount: row._count.collaborators,
			collaborators: row.collaborators.map((collab) => collab.user),
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
			status: { in: ["draft", "active"] },
			isWishlist: false,
			OR: [
				{ userId },
				{
					collaborators: {
						some: { userId, permissions: { has: "add_book" } },
					},
				},
			],
		},
		orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
		select: {
			id: true,
			slug: true,
			title: true,
			status: true,
			userId: true,
			user: { select: { username: true } },
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
			ownerUsername: row.user.username,
			isOwner: row.userId === userId,
		})),
		maxBooksPerShelf: MAX_BOOKS_PER_SHELF,
	};
}

/**
 * Counts cover every member's public shelves; only the "newest" teaser is held to what
 * the viewer may see.
 */
export async function getShelfOverview(
	viewer: Viewer,
	db: Database,
): Promise<ShelfOverview> {
	const where = countableShelfWhere;
	const [shelves, books, sharedShelves, collaborators, newest] =
		await Promise.all([
			db.shelf.count({ where }),
			db.shelfBook.count({ where: { shelf: where } }),
			db.shelf.count({ where: { ...where, collaborators: { some: {} } } }),
			db.shelfCollaborator.findMany({
				where: { shelf: where },
				distinct: ["userId"],
				select: { userId: true },
			}),
			db.shelf.findFirst({
				where: { AND: [where, shelfVisibleWhere(viewer, { listing: true })] },
				orderBy: { createdAt: "desc" },
				select: {
					title: true,
					slug: true,
					user: { select: { username: true } },
				},
			}),
		]);

	return {
		shelves,
		books,
		sharedShelves,
		collaborators: collaborators.length,
		newest: newest
			? {
					title: newest.title,
					slug: newest.slug,
					ownerUsername: newest.user.username,
				}
			: null,
	};
}
