import type { Prisma } from "@bbrc/db";
import { isSuperAdmin, type Viewer } from "@bbrc/shared";

/** Public sittings, plus a member's own unlisted/private ones (and pending invites). */
export function sittingListVisibleWhere(
	viewer: Viewer,
): Prisma.SittingWhereInput {
	if (viewer.kind === "member" && isSuperAdmin(viewer)) {
		return {};
	}
	const userId = viewer.kind === "member" ? viewer.userId : undefined;
	if (!userId) {
		return { joinType: "public" };
	}
	return {
		OR: [
			{ joinType: "public" },
			{
				participants: { some: { userId, removedAt: null } },
			},
			{
				invitations: {
					some: { inviteeId: userId, status: "pending" },
				},
			},
		],
	};
}

export function sittingOngoingVisibleWhere(
	viewerUserId?: string,
): Prisma.SittingWhereInput {
	if (!viewerUserId) {
		return { joinType: "public" };
	}
	return {
		OR: [
			{ joinType: "public" },
			{
				participants: { some: { userId: viewerUserId, removedAt: null } },
			},
			{
				invitations: {
					some: { inviteeId: viewerUserId, status: "pending" },
				},
			},
		],
	};
}
