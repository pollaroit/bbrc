import type { Database } from "@bbrc/db";
import {
	canView,
	type ProfileSection,
	type ProfileVisibility,
	relationTo,
	type Viewer,
	type Visibility,
} from "@bbrc/shared";

/*
 * Single-owner checks for a member's own content (reads, reviews, favourites,
 * goals, currently reading). Lists across many owners use the where-builders in
 * `../visibility/visibility-resources`; this is for "may I see THIS member's X".
 */

type SectionColumn =
	| "readsVisibility"
	| "reviewsVisibility"
	| "favoritesVisibility"
	| "goalsVisibility"
	| "readingVisibility";

const SECTION_COLUMNS: Record<
	Exclude<ProfileSection, "wishlist">,
	SectionColumn
> = {
	reads: "readsVisibility",
	reviews: "reviewsVisibility",
	favorites: "favoritesVisibility",
	goals: "goalsVisibility",
	reading: "readingVisibility",
};

export type OwnerPrivacy = {
	profile: ProfileVisibility;
	sections: Record<Exclude<ProfileSection, "wishlist">, Visibility>;
};

export async function loadOwnerPrivacy(
	db: Database,
	ownerId: string,
): Promise<OwnerPrivacy | null> {
	const user = await db.user.findUnique({
		where: { id: ownerId },
		select: {
			profileVisibility: true,
			readsVisibility: true,
			reviewsVisibility: true,
			favoritesVisibility: true,
			goalsVisibility: true,
			readingVisibility: true,
		},
	});
	if (!user) return null;
	return {
		profile: user.profileVisibility,
		sections: {
			reads: user.readsVisibility,
			reviews: user.reviewsVisibility,
			favorites: user.favoritesVisibility,
			goals: user.goalsVisibility,
			reading: user.readingVisibility,
		},
	};
}

/** Pure: may this viewer see this section of an owner with this privacy? */
export function viewerMaySeeSection(
	viewer: Viewer,
	ownerId: string,
	privacy: OwnerPrivacy,
	section: Exclude<ProfileSection, "wishlist">,
): boolean {
	return canView(relationTo(viewer, ownerId), {
		profile: privacy.profile,
		section: privacy.sections[section],
	});
}

export function sectionColumnOf(
	section: Exclude<ProfileSection, "wishlist">,
): SectionColumn {
	return SECTION_COLUMNS[section];
}

/** Loads the owner's settings and checks one section. A missing owner is not visible. */
export async function canViewerSeeSection(
	db: Database,
	viewer: Viewer,
	ownerId: string,
	section: Exclude<ProfileSection, "wishlist">,
): Promise<boolean> {
	const privacy = await loadOwnerPrivacy(db, ownerId);
	if (!privacy) return false;
	return viewerMaySeeSection(viewer, ownerId, privacy, section);
}

/** The id of the signed-in viewer, or null for an anonymous one. */
export function viewerIdOf(viewer: Viewer): string | null {
	return viewer.kind === "member" ? viewer.userId : null;
}

/** True when either side blocked the other: the owner's pages are "unavailable". */
export function isBlockedFrom(viewer: Viewer, ownerId: string): boolean {
	return relationTo(viewer, ownerId) === "blocked";
}
