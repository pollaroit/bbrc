import {
	LEVEL_REACH,
	type ProfileVisibility,
	profileCap,
	stricterVisibility,
	type ViewerRelation,
	type Visibility,
} from "./levels";

export type VisibilityInput = {
	/** The owner's profile level. */
	profile: ProfileVisibility;
	/** The owner's setting for this part of their profile (reads, reviews...), when there is one. */
	section?: Visibility | null;
	/** The item's own level, when it has one. */
	item?: Visibility | null;
};

/** The stricter of the profile, the section and the item. Nothing given means public. */
export function effectiveVisibility(input: VisibilityInput): Visibility {
	let level = profileCap(input.profile);
	if (input.section) level = stricterVisibility(level, input.section);
	if (input.item) level = stricterVisibility(level, input.item);
	return level;
}

/**
 * Whether a viewer of this relation may see something with this visibility.
 * Admins and the owner always may; a blocked viewer never may (in the app).
 */
export function canView(
	relation: ViewerRelation,
	input: VisibilityInput,
): boolean {
	if (relation === "admin" || relation === "self") return true;
	if (relation === "blocked") return false;
	return LEVEL_REACH[effectiveVisibility(input)].includes(relation);
}

/** Same, for a level that is already worked out. */
export function relationReaches(
	relation: ViewerRelation,
	level: Visibility,
): boolean {
	if (relation === "admin" || relation === "self") return true;
	if (relation === "blocked") return false;
	return LEVEL_REACH[level].includes(relation);
}
