import { ORPCError } from "@orpc/server";
import type { UserStatus } from "../../db/prisma/generated/enums";
import { o } from "./o";

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "You must be logged in to access this resource.",
		});
	}

	return next({
		context: {
			session: context.session,
		},
	});
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

		return next({
			context: {
				session: context.session,
			},
		});
	});

const requireAdmin = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "You must be logged in to access this resource.",
		});
	}

	if (!context.session.user.isAdmin) {
		throw new ORPCError("FORBIDDEN", {
			message: "You must be an admin to access this resource.",
		});
	}

	return next({
		context: {
			session: context.session,
		},
	});
});

export const protectedProcedure = publicProcedure.use(requireAuth);
export const adminProcedure = protectedProcedure.use(requireAdmin);
export const statusesProcedure = (...statuses: UserStatus[]) =>
	protectedProcedure.use(requireStatuses(...statuses));

export const notBannedProcedure = statusesProcedure("active", "warned");
export const activeProcedure = statusesProcedure("active");
