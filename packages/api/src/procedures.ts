import type { Session } from "@bbrc/auth";
import { hasRoleAtLeast, isSuperAdmin, type Role, roleOf } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { o } from "./o";

export const publicProcedure = o;

/** Marks a role guard so the audit coverage test can tell gated procedures from open ones. */
export const ROLE_GATED = Symbol.for("bbrc.roleGated");

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

/**
 * Lets a request through only when the signed-in user passes `allowed`. The one place
 * that turns a role rule into a guard, so a new rule is a new procedure below and
 * nothing else.
 */
const requireRole = (
	allowed: (user: Session["user"]) => boolean,
	message: string,
) => {
	const guard = o.middleware(async ({ context, next }) => {
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
	// Lets `audit-coverage.test.ts` find every procedure behind a role.
	return Object.assign(guard, { [ROLE_GATED]: true });
};

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
