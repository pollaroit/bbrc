import type { Prisma } from "@bbrc/db";
import {
	canView,
	LEVEL_REACH,
	PROFILE_VISIBILITIES,
	type ProfileDetailField,
	type ProfileSection,
	type ProfileVisibility,
	profileCap,
	relationTo,
	VISIBILITY_LEVELS,
	type Viewer,
	type ViewerRelation,
	type Visibility,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";

/*
 * What a viewer may see of a MEMBER (not of a row they own): the profile level,
 * the section levels (reads, reviews...) and the profile-detail levels. The pure
 * functions use `canView`; the where-builder is derived from the same reach table
 * and checked against it in `member-access.test.ts`.
 *
 * Grand rule: counts, totals and sorts always include everyone. Use these only to
 * decide what is IDENTIFIABLE.
 */

/** The member columns the checks read (select them with `memberAccessSelect`). */
export type MemberAccessFields = {
	id: string;
	profileVisibility: ProfileVisibility;
	readsVisibility: Visibility;
	reviewsVisibility: Visibility;
	favoritesVisibility: Visibility;
	goalsVisibility: Visibility;
	readingVisibility: Visibility;
};

export const memberAccessSelect = {
	id: true,
	profileVisibility: true,
	readsVisibility: true,
	reviewsVisibility: true,
	favoritesVisibility: true,
	goalsVisibility: true,
	readingVisibility: true,
} as const satisfies Prisma.UserSelect;

const SECTION_FIELD: Record<
	Exclude<ProfileSection, "wishlist">,
	keyof MemberAccessFields
> = {
	reads: "readsVisibility",
	reviews: "reviewsVisibility",
	favorites: "favoritesVisibility",
	goals: "goalsVisibility",
	reading: "readingVisibility",
};

/** Blocked either way: the member reads as "unavailable" (NOT_FOUND). */
export function isBlockedFor(viewer: Viewer, ownerId: string): boolean {
	return relationTo(viewer, ownerId) === "blocked";
}

/** Name, username, avatar, bio and friend count are visible to everyone not blocked. */
export function mayViewProfile(
	viewer: Viewer,
	owner: Pick<MemberAccessFields, "id" | "profileVisibility">,
): boolean {
	return canView(relationTo(viewer, owner.id), {
		profile: owner.profileVisibility,
	});
}

/** A profile section (reads, reviews, favourites, goals, reading): profile level and the section's own level. */
export function mayViewSection(
	viewer: Viewer,
	owner: MemberAccessFields,
	section: Exclude<ProfileSection, "wishlist">,
): boolean {
	return canView(relationTo(viewer, owner.id), {
		profile: owner.profileVisibility,
		section: owner[SECTION_FIELD[section]] as Visibility,
	});
}

/** Date of birth, gender and location have their own level; the rest of the details follow the profile only. */
export function mayViewDetail(
	viewer: Viewer,
	owner: Pick<MemberAccessFields, "id" | "profileVisibility">,
	level: Visibility | null,
): boolean {
	return canView(relationTo(viewer, owner.id), {
		profile: owner.profileVisibility,
		section: level,
	});
}

export function throwMemberUnavailable(username?: string): never {
	throw new ORPCError("NOT_FOUND", {
		message: username
			? `User with ${username} username not found. Please check the username and try again.`
			: "User not found",
		data: username ? { username } : undefined,
	});
}

/** The member exists and is not blocked either way (admins always pass). */
export function assertMemberAvailable<T extends { id: string }>(
	target: T | null,
	viewer: Viewer,
	username?: string,
): asserts target is T {
	if (!target) throwMemberUnavailable(username);
	if (isBlockedFor(viewer, target.id)) throwMemberUnavailable(username);
}

export function viewerUserId(viewer: Viewer): string | null {
	return viewer.kind === "member" ? viewer.userId : null;
}

export function viewerIsAdmin(viewer: Viewer): boolean {
	return viewer.kind === "member" && viewer.isAdmin;
}

/* ---------------------------------------------------------------- where */

type Clause = Prisma.UserWhereInput;

export type MemberWhereSpec = {
	/** A profile section whose level must be reached. */
	section?: Exclude<ProfileSection, "wishlist">;
	/** A `UserProfile` column holding a detail level. */
	detail?: ProfileDetailField;
};

const DETAIL_COLUMN: Record<ProfileDetailField, string> = {
	dateOfBirth: "dateOfBirthVisibility",
	gender: "genderVisibility",
	location: "locationVisibility",
};

function levelsFor(relation: ViewerRelation): Visibility[] {
	return VISIBILITY_LEVELS.filter((level) =>
		LEVEL_REACH[level].includes(relation),
	);
}

function profilesFor(relation: ViewerRelation): ProfileVisibility[] {
	return PROFILE_VISIBILITIES.filter((profile) =>
		LEVEL_REACH[profileCap(profile)].includes(relation),
	);
}

/**
 * The members whose profile (and optionally one section or detail) the viewer may see.
 * Use it to keep identifiable rows out of filters and lists; never for counts.
 */
export function memberVisibleWhere(
	viewer: Viewer,
	spec: MemberWhereSpec = {},
): Clause {
	if (viewer.kind === "member" && viewer.isAdmin) return {};

	const part = (relation: ViewerRelation, ids: Clause): Clause => {
		const levels = levelsFor(relation);
		const and: Clause[] = [
			ids,
			{ profileVisibility: { in: profilesFor(relation) } },
		];
		if (spec.section) {
			and.push({
				[SECTION_FIELD[spec.section]]: { in: levels },
			} as Clause);
		}
		if (spec.detail) {
			and.push({
				profile: { [DETAIL_COLUMN[spec.detail]]: { in: levels } },
			} as Clause);
		}
		return { AND: and };
	};

	if (viewer.kind === "anonymous") return part("anonymous", {});

	const friends = [...viewer.friendIds];
	const clauses: Clause[] = [part("self", { id: viewer.userId })];
	if (friends.length > 0) clauses.push(part("friend", { id: { in: friends } }));
	clauses.push(
		part("member", {
			id: { notIn: [viewer.userId, ...friends, ...viewer.blockedIds] },
		}),
	);
	return { OR: clauses };
}

/**
 * The member exists, is not blocked either way and the viewer may see their profile
 * (and, when given, one section of it). Blocked or missing reads as NOT_FOUND; a private
 * profile reads as FORBIDDEN with `data.isPrivate` so the screen can say "This profile is private".
 */
export function assertMayViewMember<T extends MemberAccessFields>(
	target: T | null,
	viewer: Viewer,
	options: {
		section?: Exclude<ProfileSection, "wishlist">;
		username?: string;
	} = {},
): asserts target is T {
	assertMemberAvailable(target, viewer, options.username);
	const allowed = options.section
		? mayViewSection(viewer, target, options.section)
		: mayViewProfile(viewer, target);
	if (!allowed) {
		throw new ORPCError("FORBIDDEN", {
			message: "This member keeps this private.",
			data: { isPrivate: true },
		});
	}
}
