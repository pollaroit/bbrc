import {
	canView,
	type ProfileVisibility,
	relationTo,
	type ShelfPermission,
	type Viewer,
	type Visibility,
} from "@bbrc/shared";

/** What the decision needs to know about a shelf, all of it already loaded. */
export type ShelfVisibilityFacts = {
	status: string;
	userId: string;
	/** The shelf's own level. Missing means public. */
	visibility?: Visibility;
	/** The owner's profile level. Missing means public. */
	ownerProfileVisibility?: ProfileVisibility;
};

/** What ties the viewer to this particular shelf (not to its owner). */
export type ShelfViewerFlags = {
	permissions?: ReadonlySet<ShelfPermission>;
	isCollaborator?: boolean;
	hasPendingInvitation?: boolean;
};

/**
 * Whether the viewer may open (or see the content of) a shelf. Pure over loaded data.
 *
 * - Level: the stricter of the owner's profile and the shelf's own level, judged by how
 *   the viewer stands to the OWNER (friends of the owner for "friends").
 * - Owner, admins, collaborators and pending invitees always get past the level, even when
 *   the pair blocked each other (a shared shelf keeps working until someone leaves).
 * - Status: only active shelves are open to others; drafts and archived ones need
 *   ownership, `view_non_public` or a pending invitation.
 */
export function canViewShelf(
	viewer: Viewer,
	shelf: ShelfVisibilityFacts,
	flags: ShelfViewerFlags = {},
): boolean {
	const relation = relationTo(viewer, shelf.userId);
	if (relation === "admin") return true;
	const isMember = viewer.kind === "member";
	const isOwner = relation === "self";
	const isParty =
		isMember &&
		(flags.isCollaborator === true || flags.hasPendingInvitation === true);

	const levelOk = canView(relation, {
		profile: shelf.ownerProfileVisibility ?? "public",
		item: shelf.visibility ?? "public",
	});
	if (!levelOk && !isParty) return false;

	if (shelf.status === "active") return true;
	if (!isMember) return false;
	return (
		isOwner ||
		flags.permissions?.has("view_non_public") === true ||
		flags.hasPendingInvitation === true
	);
}
