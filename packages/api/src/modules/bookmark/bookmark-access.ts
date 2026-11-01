import { relationTo, type Viewer } from "@bbrc/shared";
import {
	isBlockedFor,
	type MemberAccessFields,
	mayViewProfile,
	mayViewSection,
} from "../user/member-access";

export type BookmarksAccess =
	| { kind: "unavailable" }
	| { kind: "closed" }
	| { kind: "full"; isOwner: boolean };

export function decideBookmarksAccess(
	viewer: Viewer,
	owner: MemberAccessFields,
): BookmarksAccess {
	if (isBlockedFor(viewer, owner.id)) return { kind: "unavailable" };
	if (!mayViewProfile(viewer, owner)) return { kind: "closed" };
	if (!mayViewSection(viewer, owner, "bookmarks")) {
		return { kind: "closed" };
	}
	const relation = relationTo(viewer, owner.id);
	return { kind: "full", isOwner: relation === "self" };
}
