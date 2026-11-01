import { isSuperAdmin, type Role, roleOf } from "../roles";
import type { ViewerRelation } from "./levels";

/**
 * Who is looking. Built once per request and handed to every read service as a
 * required argument, so a read that forgets to consider the viewer does not compile.
 */
export type Viewer =
	/** Anonymous has no role; the field exists so any viewer can be handed to `isSuperAdmin`. */
	| { kind: "anonymous"; role?: undefined }
	| {
			kind: "member";
			userId: string;
			role: Role;
			/** Accepted friends (banned members left out). */
			friendIds: ReadonlySet<string>;
			/** Everyone who blocked this member or was blocked by them. */
			blockedIds: ReadonlySet<string>;
	  };

export const ANONYMOUS_VIEWER: Viewer = { kind: "anonymous" };

export function memberViewer(input: {
	userId: string;
	role?: string | null;
	friendIds?: Iterable<string>;
	blockedIds?: Iterable<string>;
}): Viewer {
	return {
		kind: "member",
		userId: input.userId,
		role: roleOf(input.role),
		friendIds: new Set(input.friendIds ?? []),
		blockedIds: new Set(input.blockedIds ?? []),
	};
}

/** How the viewer stands to an owner (null owner = nobody's, treated as a stranger). */
export function relationTo(
	viewer: Viewer,
	ownerId: string | null,
): ViewerRelation {
	if (viewer.kind === "anonymous") return "anonymous";
	if (isSuperAdmin(viewer)) return "super_admin";
	if (ownerId != null && ownerId === viewer.userId) return "self";
	if (ownerId != null && viewer.blockedIds.has(ownerId)) return "blocked";
	if (ownerId != null && viewer.friendIds.has(ownerId)) return "friend";
	return "member";
}
