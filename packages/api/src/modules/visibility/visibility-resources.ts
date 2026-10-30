import type { Viewer } from "@bbrc/shared";
import { type Clause, notBlockedWhere, visibleWhere } from "./visibility-where";

/*
 * The where-clause for each kind of resource, one function each, built from the
 * registry in `packages/shared/src/visibility/registry.ts`. Reads use these and
 * nothing else; to change who sees a resource, change the registry (or the
 * builder), never a call site.
 *
 * Callers cast the result to their model's `WhereInput`:
 *   where: { AND: [existing, postVisibleWhere(viewer) as Prisma.PostWhereInput] }
 */

/** A post: its author's profile level (and, in 9B, the post's own level). */
export function postVisibleWhere(viewer: Viewer): Clause {
	return visibleWhere(viewer, {
		ownerIdField: "authorId",
		ownerRelation: "author",
	});
}

/**
 * A comment (or like) is public space: it follows its post, not its author's
 * profile, and a blocked author's comments are left out.
 */
export function commentVisibleWhere(viewer: Viewer): Clause {
	return {
		AND: [
			{ post: postVisibleWhere(viewer) },
			notBlockedWhere(viewer, "authorId"),
		],
	};
}

export function likeVisibleWhere(viewer: Viewer): Clause {
	return {
		AND: [
			{ post: postVisibleWhere(viewer) },
			notBlockedWhere(viewer, "userId"),
		],
	};
}

/** A review: the author's reviews setting and profile. */
export function reviewVisibleWhere(viewer: Viewer): Clause {
	return visibleWhere(viewer, {
		ownerIdField: "authorId",
		ownerRelation: "author",
		section: "reviews",
	});
}

export function readVisibleWhere(viewer: Viewer): Clause {
	return visibleWhere(viewer, {
		ownerIdField: "userId",
		ownerRelation: "user",
		section: "reads",
	});
}

export function favoriteVisibleWhere(viewer: Viewer): Clause {
	return visibleWhere(viewer, {
		ownerIdField: "userId",
		ownerRelation: "user",
		section: "favorites",
	});
}

export function readingVisibleWhere(viewer: Viewer): Clause {
	return visibleWhere(viewer, {
		ownerIdField: "userId",
		ownerRelation: "user",
		section: "reading",
	});
}

export function goalVisibleWhere(viewer: Viewer): Clause {
	return visibleWhere(viewer, {
		ownerIdField: "userId",
		ownerRelation: "user",
		section: "goals",
	});
}

/**
 * Rows owned by a member where only the member's profile level applies
 * (achievements, XP events, stats, sitting history, quiz results).
 */
export function profileOwnedVisibleWhere(
	viewer: Viewer,
	owner: { ownerIdField: string; ownerRelation: string },
): Clause {
	return visibleWhere(viewer, owner);
}

/** Members the viewer may see in people lists and search: not blocked either way. Names and avatars are public. */
export function memberListVisibleWhere(viewer: Viewer): Clause {
	return notBlockedWhere(viewer, "id");
}
