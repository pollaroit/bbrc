import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";

export type ViewerContext = {
	userId: string;
	isAdmin: boolean;
} | null;

/** Users who may appear in public listings, search, and leaderboards. */
export const visibleOnSiteUserWhere = {
	isHidden: false,
} satisfies Prisma.UserWhereInput;

export function viewerFromSession(session: Session | null): ViewerContext {
	if (!session?.user?.id) {
		return null;
	}

	return {
		userId: session.user.id,
		isAdmin: Boolean(session.user.isAdmin),
	};
}

export function canViewMemberProfile(
	target: { id: string; isHidden: boolean },
	viewer: ViewerContext,
): boolean {
	if (!target.isHidden) {
		return true;
	}
	if (!viewer) {
		return false;
	}
	if (viewer.isAdmin) {
		return true;
	}
	return viewer.userId === target.id;
}

export function throwMemberNotFound(username?: string): never {
	throw new ORPCError("NOT_FOUND", {
		message: username
			? `User with ${username} username not found. Please check the username and try again.`
			: "User not found",
		data: username ? { username } : undefined,
	});
}

export function assertMemberVisible(
	target: { id: string; isHidden: boolean; username?: string } | null,
	viewer: ViewerContext,
): asserts target is { id: string; isHidden: boolean; username?: string } {
	if (!target) {
		throwMemberNotFound();
	}
	if (!canViewMemberProfile(target, viewer)) {
		throwMemberNotFound(target.username);
	}
}

export function assertContentNotVisible(
	author: { id: string; isHidden: boolean },
	viewer: ViewerContext,
	message: string,
	data?: Record<string, unknown>,
): void {
	if (canViewMemberProfile(author, viewer)) {
		return;
	}

	throw new ORPCError("NOT_FOUND", { message, data });
}

export function assertActorMayUseSocialFeatures(
	user: { isHidden: boolean } | null,
): void {
	if (user?.isHidden) {
		throw new ORPCError("FORBIDDEN", {
			message: "This action is not available for your account.",
		});
	}
}

export async function loadActorSocialGate(
	userId: string,
	db: Database,
): Promise<void> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { isHidden: true },
	});
	assertActorMayUseSocialFeatures(user);
}

export function publicAuthorWhere(): Prisma.UserWhereInput {
	return visibleOnSiteUserWhere;
}
