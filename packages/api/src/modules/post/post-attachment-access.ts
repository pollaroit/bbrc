import {
	canView,
	type ProfileVisibility,
	relationTo,
	type Viewer,
	type Visibility,
} from "@bbrc/shared";

/** Someone whose visibility settings decide whether an attached thing may be shown. */
export type AttachmentOwner = {
	id: string | null;
	profileVisibility: ProfileVisibility;
	/** The owner's section setting that applies (for example their reviews setting). */
	section?: Visibility | null;
	/** The attached item's own level (a shelf's). */
	item?: Visibility | null;
};

/**
 * True when the viewer may NOT see something that hangs on these owners. Every
 * owner has to allow it, and a blocked pair is always refused. Names, avatars and
 * usernames are public, so a member attachment passes a public-profile owner and
 * only a block locks it.
 */
export function attachmentLocked(
	viewer: Viewer,
	owners: readonly AttachmentOwner[],
): boolean {
	return owners.some(
		(owner) =>
			!canView(relationTo(viewer, owner.id), {
				profile: owner.profileVisibility,
				section: owner.section,
				item: owner.item,
			}),
	);
}
