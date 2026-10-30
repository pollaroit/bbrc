import {
	LEVEL_REACH,
	PROFILE_VISIBILITIES,
	type ProfileSection,
	type ProfileVisibility,
	profileCap,
	VISIBILITY_LEVELS,
	type Viewer,
	type Visibility,
} from "@bbrc/shared";

/**
 * Prisma where-clauses for "what may this viewer see", derived from the same
 * levels and reach table the pure `canView` uses (packages/shared/src/visibility).
 * The test in this folder proves the two agree over the whole matrix, so a rule
 * changed in one place changes everywhere.
 *
 * A clause is a plain object; callers cast it to their model's `WhereInput`.
 */
export type Clause = Record<string, unknown>;

/** Which Prisma columns hold the profile level and each section's level on `User`. */
export const USER_PROFILE_COLUMN = "profileVisibility";
export const USER_SECTION_COLUMNS: Record<ProfileSection, string | null> = {
	reads: "readsVisibility",
	reviews: "reviewsVisibility",
	favorites: "favoritesVisibility",
	goals: "goalsVisibility",
	reading: "readingVisibility",
	/** The wishlist's level is its shelf's own level. */
	wishlist: null,
};

const NOTHING: Clause = { OR: [] };
const EVERYTHING: Clause = {};

/**
 * Where an owner (named by `owner`, a function that puts a condition on the
 * owner's id into the right place) is someone the viewer is allowed to reach at
 * this level. The reach table decides which relations count.
 */
function levelReachClause(
	viewer: Viewer,
	level: Visibility,
	owner: (condition: Clause) => Clause,
): Clause {
	if (viewer.kind === "anonymous") {
		return LEVEL_REACH[level].includes("anonymous") ? EVERYTHING : NOTHING;
	}

	if (viewer.isAdmin) return EVERYTHING;

	const reach = LEVEL_REACH[level];
	const friends = [...viewer.friendIds];
	const clauses: Clause[] = [];

	if (reach.includes("self")) {
		clauses.push(owner({ equals: viewer.userId }));
	}

	if (reach.includes("friend") && friends.length > 0) {
		clauses.push(owner({ in: friends }));
	}

	if (reach.includes("member")) {
		clauses.push(
			owner({
				notIn: [viewer.userId, ...friends, ...viewer.blockedIds],
			}),
		);
	}

	return clauses.length === 0 ? NOTHING : { OR: clauses };
}

export type OwnerSpec = {
	/** The field holding the owner's id on the model, for example `authorId` or `userId`. */
	ownerIdField: string;
	/** The relation to the owner on the model, for example `author` or `user`. */
	ownerRelation: string;
};

export type VisibleSpec = OwnerSpec & {
	/** The model's own level column (for example `visibility`), when the resource has one. */
	itemField?: string;
	/** The owner's profile section that applies, when there is one. */
	section?: ProfileSection;
	/** False when the owner's profile level does not apply (public space). Default true. */
	profile?: boolean;
};

/**
 * Everything the viewer may see of a resource: the owner's profile level, their
 * section setting and the item's own level, whichever apply, with blocked owners
 * left out. An admin sees all.
 */
export function visibleWhere(viewer: Viewer, spec: VisibleSpec): Clause {
	if (viewer.kind === "member" && viewer.isAdmin) return EVERYTHING;

	const onModelOwner = (condition: Clause): Clause => ({
		[spec.ownerIdField]: condition,
	});

	const parts: Clause[] = [];

	if (spec.profile !== false) {
		parts.push({
			OR: PROFILE_VISIBILITIES.map((profile: ProfileVisibility) => ({
				AND: [
					{ [spec.ownerRelation]: { [USER_PROFILE_COLUMN]: profile } },
					levelReachClause(viewer, profileCap(profile), onModelOwner),
				],
			})),
		});
	}

	const sectionColumn = spec.section
		? USER_SECTION_COLUMNS[spec.section]
		: null;

	if (sectionColumn) {
		parts.push({
			OR: VISIBILITY_LEVELS.map((level) => ({
				AND: [
					{ [spec.ownerRelation]: { [sectionColumn]: level } },
					levelReachClause(viewer, level, onModelOwner),
				],
			})),
		});
	}

	if (spec.itemField) {
		const itemField = spec.itemField;

		parts.push({
			OR: VISIBILITY_LEVELS.map((level) => ({
				AND: [
					{ [itemField]: level },
					levelReachClause(viewer, level, onModelOwner),
				],
			})),
		});
	}

	if (viewer.kind === "member" && viewer.blockedIds.size > 0) {
		parts.push({
			NOT: { [spec.ownerIdField]: { in: [...viewer.blockedIds] } },
		});
	}

	return parts.length === 0 ? EVERYTHING : { AND: parts };
}

/** Members the viewer may see at all in the app: not blocked either way. For lists of people and names. */
export function notBlockedWhere(viewer: Viewer, idField = "id"): Clause {
	if (viewer.kind !== "member" || viewer.isAdmin) return EVERYTHING;
	if (viewer.blockedIds.size === 0) return EVERYTHING;

	return { NOT: { [idField]: { in: [...viewer.blockedIds] } } };
}
