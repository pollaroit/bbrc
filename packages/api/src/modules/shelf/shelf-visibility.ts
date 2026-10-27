import type { Prisma } from "@bbrc/db";
import { visibleOnSiteUserWhere } from "../user/user-visibility";

/** Who is looking: a signed-in member (with admin flag) or nobody. */
export type ShelfViewer =
	| { userId: string; isAdmin: boolean }
	| null
	| undefined;

/**
 * Shelves anyone may see in lists, search, counts and previews: active, public,
 * owned by a visible member, and never the Wishlist (it has its own tab).
 */
export const publicShelfWhere = {
	status: "active",
	visibility: "public",
	isWishlist: false,
	user: visibleOnSiteUserWhere,
} satisfies Prisma.ShelfWhereInput;

/**
 * Shelves a viewer may open or preview: the public ones (a public Wishlist
 * counts, by link), plus the ones they own or help edit. Admins see all.
 * Drafts and archived shelves stay with the owner and collaborators.
 */
export function visibleShelfWhere(viewer: ShelfViewer): Prisma.ShelfWhereInput {
	if (viewer?.isAdmin) return {};
	const open: Prisma.ShelfWhereInput = {
		status: "active",
		visibility: "public",
		user: visibleOnSiteUserWhere,
	};
	if (!viewer) return open;
	return {
		OR: [
			open,
			{ userId: viewer.userId },
			{ collaborators: { some: { userId: viewer.userId } } },
		],
	};
}

/** Whether the shelf's visibility lets this viewer in (status rules are separate). */
export function visibilityAllows(
	shelf: { visibility: "public" | "private"; userId: string },
	viewer: { userId?: string; isAdmin?: boolean; isCollaborator?: boolean },
): boolean {
	if (shelf.visibility === "public") return true;
	if (viewer.isAdmin) return true;
	if (viewer.userId == null) return false;
	return viewer.userId === shelf.userId || viewer.isCollaborator === true;
}
