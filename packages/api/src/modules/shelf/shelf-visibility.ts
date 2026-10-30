import type { Prisma } from "@bbrc/db";
import { ANONYMOUS_VIEWER, memberViewer, type Viewer } from "@bbrc/shared";
import { visibleWhere } from "../visibility/visibility-where";

/** Who is looking: a signed-in member (with admin flag) or nobody. Prefer `Viewer`. */
export type ShelfViewer =
	| { userId: string; isAdmin: boolean }
	| null
	| undefined;

export type WishlistScope = "exclude" | "include" | "only";

/**
 * Shelves a viewer may see, as a where-clause: the stricter of the owner's profile level and
 * the shelf's own level (public / friends / private), active status, blocked owners left out.
 * Owners, collaborators and pending invitees keep their access whatever the level, and admins
 * see everything. The Wishlist is left out unless asked for (it has its own tab).
 */
export function shelfVisibleWhere(
	viewer: Viewer,
	options: {
		wishlist?: WishlistScope;
		/**
		 * For public lists and search: active shelves the level lets this viewer see, with no
		 * access through ownership, collaboration or invitation (admins included).
		 */
		listing?: boolean;
	} = {},
): Prisma.ShelfWhereInput {
	const scope = options.wishlist ?? "exclude";
	const wishlistClause: Prisma.ShelfWhereInput =
		scope === "exclude"
			? { isWishlist: false }
			: scope === "only"
				? { isWishlist: true }
				: {};
	if (viewer.kind === "member" && viewer.isAdmin && !options.listing) {
		return wishlistClause;
	}

	const byLevel: Prisma.ShelfWhereInput = {
		AND: [
			{ status: "active" },
			visibleWhere(viewer, {
				ownerIdField: "userId",
				ownerRelation: "user",
				itemField: "visibility",
			}) as Prisma.ShelfWhereInput,
		],
	};
	if (viewer.kind === "anonymous" || options.listing) {
		return { AND: [wishlistClause, byLevel] };
	}
	const now = new Date();
	return {
		AND: [
			wishlistClause,
			{
				OR: [
					byLevel,
					{ userId: viewer.userId },
					{ collaborators: { some: { userId: viewer.userId } } },
					{
						invitations: {
							some: {
								inviteeId: viewer.userId,
								status: "pending",
								expiresAt: { gt: now },
							},
						},
					},
				],
			},
		],
	};
}

/**
 * Shelves that count in public numbers (book pages, overviews): active, shelf level public,
 * never the Wishlist, whoever owns them. Counts include every member.
 */
export const countableShelfWhere = {
	status: "active",
	visibility: "public",
	isWishlist: false,
} satisfies Prisma.ShelfWhereInput;

/**
 * @deprecated Use `shelfVisibleWhere(viewer)` (or `countableShelfWhere` for counts).
 * Same meaning as `shelfVisibleWhere(ANONYMOUS_VIEWER)`: what a signed-out visitor sees.
 */
export const publicShelfWhere: Prisma.ShelfWhereInput =
	shelfVisibleWhere(ANONYMOUS_VIEWER);

/**
 * @deprecated Use `shelfVisibleWhere(viewer, { wishlist: "include" })`. Friends are not known
 * here, so the viewer counts as a member with no friends.
 */
export function visibleShelfWhere(viewer: ShelfViewer): Prisma.ShelfWhereInput {
	return shelfVisibleWhere(
		viewer
			? memberViewer({ userId: viewer.userId, isAdmin: viewer.isAdmin })
			: ANONYMOUS_VIEWER,
		{ wishlist: "include" },
	);
}

export const WISHLIST_PROTECTED_MESSAGE =
	"Your Wishlist is special: you can only change its description and who can see it.";
