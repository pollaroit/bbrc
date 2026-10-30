import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import {
	normalizeShelfPermissions,
	resolveShelfPermissions,
	SHELF_PERMISSION_LABELS,
	type ShelfPermission,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { WISHLIST_PROTECTED_MESSAGE } from "./shelf-visibility";

type Db = Database | DatabaseTransaction;

export const shelfAccessSelect = {
	id: true,
	slug: true,
	title: true,
	description: true,
	coverImageUrl: true,
	status: true,
	type: true,
	visibility: true,
	isWishlist: true,
	userId: true,
	updatedAt: true,
	_count: { select: { books: true } },
} as const;

export type AccessShelf = Prisma.ShelfGetPayload<{
	select: typeof shelfAccessSelect;
}>;

export type ShelfOwner = {
	id: string;
	username: string;
	name: string;
	image: string | null;
	status: "active" | "warned" | "banned";
	profileVisibility: "public" | "private";
};

export type ShelfAccess = {
	shelf: AccessShelf;
	owner: ShelfOwner;
	actorId: string;
	isOwner: boolean;
	/** Null when the actor is not a collaborator (the owner has no row). */
	collaborator: { id: string; permissions: ShelfPermission[] } | null;
	permissions: Set<ShelfPermission>;
};

export const ownerSelect = {
	id: true,
	username: true,
	name: true,
	image: true,
	status: true,
	profileVisibility: true,
} as const;

/**
 * Finds a shelf by its owner and slug and works out what `actorId` may do on it.
 * `ownerUsername` defaults to the actor, so existing calls keep meaning "my shelf".
 */
export async function loadShelfAccess(
	db: Db,
	input: { ownerUsername?: string; shelfSlug: string; actorId: string },
): Promise<ShelfAccess> {
	const owner = input.ownerUsername
		? await db.user.findUnique({
				where: { username: input.ownerUsername },
				select: ownerSelect,
			})
		: await db.user.findUnique({
				where: { id: input.actorId },
				select: ownerSelect,
			});

	if (!owner) {
		throw new ORPCError("NOT_FOUND", { message: "Shelf not found" });
	}

	const shelf = await db.shelf.findUnique({
		where: { userId_slug: { userId: owner.id, slug: input.shelfSlug } },
		select: {
			...shelfAccessSelect,
			collaborators: {
				where: { userId: input.actorId },
				select: { id: true, permissions: true },
			},
		},
	});

	if (!shelf) {
		throw new ORPCError("NOT_FOUND", {
			message: "Shelf not found",
			data: { shelfSlug: input.shelfSlug },
		});
	}

	const { collaborators, ...shelfFields } = shelf;
	const row = collaborators[0] ?? null;
	const isOwner = owner.id === input.actorId;

	// Banned members can still collaborate on other people's shelves, but
	// cannot change their own.
	if (isOwner && owner.status === "banned") {
		throw new ORPCError("FORBIDDEN", {
			message: "Your account is restricted, so you cannot change your shelves.",
		});
	}
	const granted = row ? normalizeShelfPermissions(row.permissions) : [];

	return {
		shelf: shelfFields,
		owner,
		actorId: input.actorId,
		isOwner,
		collaborator: row ? { id: row.id, permissions: granted } : null,
		permissions: resolveShelfPermissions(isOwner, granted),
	};
}

/** Throws unless the actor holds `permission`. Strangers see "not found" on private shelves. */
export function requireShelfPermission(
	access: ShelfAccess,
	permission: ShelfPermission,
): void {
	if (access.permissions.has(permission)) {
		return;
	}
	if (
		!access.isOwner &&
		access.collaborator == null &&
		(access.shelf.status !== "active" || access.shelf.visibility !== "public")
	) {
		throw new ORPCError("NOT_FOUND", { message: "Shelf not found" });
	}
	throw new ORPCError("FORBIDDEN", {
		message: `You do not have permission to do that (${SHELF_PERMISSION_LABELS[permission].toLowerCase()}).`,
	});
}

export function requireOwner(access: ShelfAccess): void {
	if (!access.isOwner) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the owner of the shelf can do that.",
		});
	}
}

export { canViewShelf } from "./shelf-can-view";

export type ShelfActivityInput = {
	shelfId: string;
	actorId: string;
	kind:
		| "book_added"
		| "book_removed"
		| "books_reordered"
		| "notes_edited"
		| "shelf_updated"
		| "collaborator_joined"
		| "collaborator_left"
		| "collaborator_removed"
		| "permissions_changed"
		| "ownership_transferred";
	targetUserId?: string;
	meta?: Prisma.InputJsonValue;
};

export async function logShelfActivity(
	db: Db,
	input: ShelfActivityInput,
): Promise<void> {
	await db.shelfActivity.create({
		data: {
			shelfId: input.shelfId,
			actorId: input.actorId,
			kind: input.kind,
			targetUserId: input.targetUserId ?? null,
			meta: input.meta ?? undefined,
		},
	});
}

/** Throws for the Wishlist shelf: it cannot be deleted, renamed, retyped, re-covered or shared. */
export function assertNotWishlist(
	shelf: { isWishlist: boolean },
	what = WISHLIST_PROTECTED_MESSAGE,
): void {
	if (shelf.isWishlist) {
		throw new ORPCError("BAD_REQUEST", { message: what });
	}
}
