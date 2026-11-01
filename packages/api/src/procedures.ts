import type { Session } from "@bbrc/auth";
import { hasRoleAtLeast, isSuperAdmin, type Role, roleOf } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import type { UserStatus } from "../../db/prisma/generated/enums";
import { o } from "./o";

export const publicProcedure = o;

/**
 * The context a signed-in procedure adds. A named type (not the session object spelled out)
 * keeps every procedure's declaration short: written out, the session alone repeats in each
 * one, and `appRouter` then grows past what the compiler will print.
 */
export interface SignedInContext {
	session: Session;
}

function signedIn(session: Session | null): SignedInContext {
	return { session: session as Session };
}

const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "You must be logged in to access this resource.",
		});
	}

	return next({ context: signedIn(context.session) });
});

const requireStatuses = (...statuses: UserStatus[]) =>
	o.middleware(async ({ context, next }) => {
		if (!context.session?.user) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "You must be logged in to access this resource.",
			});
		}

		if (!statuses.includes(context.session.user.status as UserStatus)) {
			throw new ORPCError("FORBIDDEN", {
				message:
					"You are not authorized to access this resource, because of your status.",
			});
		}

		return next({ context: signedIn(context.session) });
	});

/**
 * Lets a request through only when the signed-in user passes `allowed`. The one place
 * that turns a role rule into a guard, so a new rule is a new procedure below and
 * nothing else.
 */
const requireRole = (
	allowed: (user: Session["user"]) => boolean,
	message: string,
) =>
	o.middleware(async ({ context, next }) => {
		if (!context.session?.user) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "You must be logged in to access this resource.",
			});
		}

		if (!allowed(context.session.user)) {
			throw new ORPCError("FORBIDDEN", { message });
		}

		return next({ context: signedIn(context.session) });
	});

export const protectedProcedure = publicProcedure.use(requireAuth);

/** Today's "admin": the only role with any permission beyond an ordinary member's. */
export const superAdminProcedure = protectedProcedure.use(
	requireRole(
		(user) => isSuperAdmin(user),
		"You must be a super admin to access this resource.",
	),
);

/** Any of the given roles. For things a role other than super admin may do (see `roles.ts`). */
export const roleProcedure = (...roles: Role[]) =>
	protectedProcedure.use(
		requireRole(
			(user) => roles.includes(roleOf(user)),
			"You do not have the role needed to access this resource.",
		),
	);

/** This role or any role above it. */
export const minRoleProcedure = (role: Role) =>
	protectedProcedure.use(
		requireRole(
			(user) => hasRoleAtLeast(user, role),
			"You do not have the role needed to access this resource.",
		),
	);
export const statusesProcedure = (...statuses: UserStatus[]) =>
	protectedProcedure.use(requireStatuses(...statuses));

export const notBannedProcedure = statusesProcedure("active", "warned");
export const activeProcedure = statusesProcedure("active");
