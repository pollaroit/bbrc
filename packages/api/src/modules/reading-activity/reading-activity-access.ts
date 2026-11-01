import {
	type ActivityScope,
	FULL_SCOPE,
	relationTo,
	type Viewer,
} from "@bbrc/shared";
import {
	isBlockedFor,
	type MemberAccessFields,
	mayViewProfile,
	mayViewSection,
} from "../user/member-access";

/**
 * What a viewer gets of a member's reading activity:
 * - `unavailable`: blocked either way (reads as not found);
 * - `closed`: a private profile seen by a non-friend (the profile rule beats everything);
 * - `numbers`: the section is closed on a public profile, so only five numbers with no names or dates;
 * - `full`: the grid, stats and rankings, cut down by `scope`.
 */
export type ActivityAccess =
	| { kind: "unavailable" }
	| { kind: "closed" }
	| { kind: "numbers" }
	| { kind: "full"; isOwner: boolean; scope: ActivityScope };

export type ActivityOwner = MemberAccessFields & {
	showReadingProgress: boolean;
};

export function decideActivityAccess(
	viewer: Viewer,
	owner: ActivityOwner,
): ActivityAccess {
	if (isBlockedFor(viewer, owner.id)) return { kind: "unavailable" };
	if (!mayViewProfile(viewer, owner)) return { kind: "closed" };
	if (!mayViewSection(viewer, owner, "readingActivity")) {
		return { kind: "numbers" };
	}

	const relation = relationTo(viewer, owner.id);
	// The member and admins see everything.
	if (relation === "self" || relation === "admin") {
		return { kind: "full", isOwner: relation === "self", scope: FULL_SCOPE };
	}
	return {
		kind: "full",
		isOwner: false,
		scope: {
			// Pages, percent and speed follow "show my reading progress".
			progress: owner.showReadingProgress,
			// Exact times and time of day are the member's alone.
			clock: false,
			// A finished book would leak what Reads hides.
			finish: mayViewSection(viewer, owner, "reads"),
		},
	};
}
