import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { appError, type ErrorKey, type ErrorParams } from "../../lib/app-error";

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
	throw username
		? appError("NOT_FOUND", "user.notFoundByUsername", {
				params: { username },
				data: { username },
			})
		: appError("NOT_FOUND", "user.notFound");
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

/**
 * What to say when content is hidden because its author is: an error key with parameters
 * (preferred, translated by the request's language) or, for code not converted yet, plain text.
 */
export type ContentNotVisibleMessage =
	| string
	| { key: ErrorKey; params?: ErrorParams };

export function assertContentNotVisible(
	author: { id: string; isHidden: boolean },
	viewer: ViewerContext,
	message: ContentNotVisibleMessage,
	data?: Record<string, unknown>,
): void {
	if (canViewMemberProfile(author, viewer)) {
		return;
	}

	if (typeof message === "string") {
		throw new ORPCError("NOT_FOUND", { message, data });
	}
	throw appError("NOT_FOUND", message.key, { params: message.params, data });
}

export function assertActorMayUseSocialFeatures(
	user: { isHidden: boolean } | null,
): void {
	if (user?.isHidden) {
		throw appError("FORBIDDEN", "user.actionUnavailable");
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
