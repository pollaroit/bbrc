import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { createServerTranslator } from "@bbrc/i18n";
import {
	normalizeShelfPermissions,
	resolveShelfPermissions,
	type ShelfPermission,
} from "@bbrc/shared";
import { appError, type ErrorKey } from "../../lib/app-error";
import { currentLocale } from "../../lib/request-locale";

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
		throw appError("NOT_FOUND", "shelf.notFound");
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
		throw appError("NOT_FOUND", "shelf.notFound", {
			data: { shelfSlug: input.shelfSlug },
		});
	}

	const { collaborators, ...shelfFields } = shelf;
	const row = collaborators[0] ?? null;
	const isOwner = owner.id === input.actorId;

	// Banned members can still collaborate on other people's shelves, but
	// cannot change their own.
	if (isOwner && owner.status === "banned") {
		throw appError("FORBIDDEN", "shelf.restricted");
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
		(access.shelf.status !== "active" || access.shelf.visibility === "private")
	) {
		throw appError("NOT_FOUND", "shelf.notFound");
	}
	throw appError("FORBIDDEN", "shelf.noPermission", {
		params: { permission: permissionPhrase(permission) },
	});
}

export function requireOwner(access: ShelfAccess): void {
	if (!access.isOwner) {
		throw appError("FORBIDDEN", "shelf.ownerOnly");
	}
}

/**
 * Whether the viewer may open the shelf page. Active shelves are public; draft
 * and archived ones need ownership, the `view_non_public` permission, or a
 * pending invitation (so an invitee can look before answering).
 */
export function canViewShelf(
	shelf: {
		status: string;
		userId: string;
		visibility?: "public" | "private";
	},
	viewer: {
		userId: string | undefined;
		permissions: ReadonlySet<ShelfPermission>;
		hasPendingInvitation: boolean;
		isCollaborator?: boolean;
		isAdmin?: boolean;
	},
): boolean {
	// A private shelf is for the owner, collaborators, admins and invitees only.
	if (
		shelf.visibility === "private" &&
		!(
			viewer.isAdmin ||
			(viewer.userId != null &&
				(viewer.userId === shelf.userId ||
					viewer.isCollaborator ||
					viewer.hasPendingInvitation))
		)
	) {
		return false;
	}
	if (shelf.status === "active") {
		return true;
	}
	if (viewer.userId == null) {
		return false;
	}
	return (
		viewer.userId === shelf.userId ||
		viewer.permissions.has("view_non_public") ||
		viewer.hasPendingInvitation
	);
}

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
	what: ErrorKey = "shelf.wishlistProtected",
): void {
	if (shelf.isWishlist) {
		throw appError("BAD_REQUEST", what);
	}
}

/** What a collaborator may do, as a phrase in the request's language ("add books"). */
function permissionPhrase(permission: ShelfPermission): string {
	const translate = createServerTranslator(currentLocale(), "errors") as (
		key: string,
	) => string;
	return translate(`shelf.permissions.${permission}`);
}
