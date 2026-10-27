import type { Session } from "@bbrc/auth";
import type { UserStatus } from "../../db/prisma/generated/enums";
import { appError } from "./lib/app-error";
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
		throw appError("UNAUTHORIZED", "common.notSignedIn");
	}

	return next({ context: signedIn(context.session) });
});

const requireStatuses = (...statuses: UserStatus[]) =>
	o.middleware(async ({ context, next }) => {
		if (!context.session?.user) {
			throw appError("UNAUTHORIZED", "common.notSignedIn");
		}

		if (!statuses.includes(context.session.user.status as UserStatus)) {
			throw appError("FORBIDDEN", "common.statusNotAllowed");
		}

		return next({ context: signedIn(context.session) });
	});

const requireAdmin = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw appError("UNAUTHORIZED", "common.notSignedIn");
	}

	if (!context.session.user.isAdmin) {
		throw appError("FORBIDDEN", "common.adminOnly");
	}

	return next({ context: signedIn(context.session) });
});

export const protectedProcedure = publicProcedure.use(requireAuth);
export const adminProcedure = protectedProcedure.use(requireAdmin);
export const statusesProcedure = (...statuses: UserStatus[]) =>
	protectedProcedure.use(requireStatuses(...statuses));

export const notBannedProcedure = statusesProcedure("active", "warned");
export const activeProcedure = statusesProcedure("active");
