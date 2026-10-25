import { describeViewTarget } from "@bbrc/api/modules/view/view.service";
import type { ViewResourceKind } from "@bbrc/shared";
import type { Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth, db } from "@/services";

/** The item, looked up once per request however many parts of the page ask. */
export const loadInsightsTarget = cache(
	(resource: ViewResourceKind, ref: string) =>
		describeViewTarget(db, resource, ref),
);

/**
 * Lets only the people who may see insights through: admins, the author (a
 * shelf's owner and collaborators), the member themselves for their own profile,
 * and any signed-in member for a book. Everyone else goes back to the item.
 */
export async function requireInsightsAccess(
	resource: ViewResourceKind,
	ref: string,
) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		redirect("/sign-in" as Route);
	}

	const target = await loadInsightsTarget(resource, ref);
	if (!target) {
		notFound();
	}

	const userId = session.user.id;
	const allowed =
		session.user.isAdmin === true ||
		resource === "book" ||
		target.ownerId === userId ||
		target.collaboratorIds.includes(userId);
	if (!allowed) {
		redirect(target.href as Route);
	}

	return target;
}
