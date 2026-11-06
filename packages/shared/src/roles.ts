/*
 * Roles: the ONE place that knows them. To add a role, add it to `ROLES` (in
 * rank order, lowest first), give it a rank and metadata below, and say who may
 * assign it in `ASSIGNABLE_BY`. Everything else (the API guards, the admin user
 * list, the badge, the tests) reads from here.
 *
 * `super_admin` is the only role that can be set outside the app: it can only
 * be given in the database, and nobody can change it through the app.
 */

/** Lowest first. Mirrors `Role` in `auth.prisma`: keep the two in step. */
export const ROLES = ["user", "moderator", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = {
	user: 0,
	moderator: 1,
	admin: 2,
	super_admin: 3,
};

/**
 * Anything that carries a role: a session user, a database row, a viewer. The
 * role is a plain string on a session (the auth library does not know our
 * enum), so anything that is not a real role counts as `user`: a missing or
 * stale role can only ever mean less access, never more.
 */
export type HasRole = { role?: string | null };

/** Someone acting: their id and the role they act with. The one shape every service takes instead of its own `{ id, isAdmin }`. */
export type RoleActor = { id: string } & HasRole;

export function isRole(value: unknown): value is Role {
	return (
		typeof value === "string" && (ROLES as readonly string[]).includes(value)
	);
}

export function roleOf(
	subject: Role | HasRole | string | null | undefined,
): Role {
	const value =
		subject != null && typeof subject === "object" ? subject.role : subject;
	return isRole(value) ? value : "user";
}

export function hasRoleAtLeast(
	subject: Role | HasRole | string | null | undefined,
	role: Role,
): boolean {
	return ROLE_RANK[roleOf(subject)] >= ROLE_RANK[role];
}

/**
 * The library's catalogue: adding, editing, hiding and removing books, their editions
 * and the requests for them. Admins and super admins; everything else about running the
 * club (members, reports, sittings, the audit log, authors, series) stays with super admins.
 */
export function canManageBooks(
	subject: Role | HasRole | string | null | undefined,
): boolean {
	return hasRoleAtLeast(subject, "admin");
}

/** Today's "admin": the one role with every permission the app has. */
export function isSuperAdmin(
	subject: Role | HasRole | string | null | undefined,
): boolean {
	return roleOf(subject) === "super_admin";
}

/** How a role is shown. `tone` names a theme token the screens map to a colour. */
export const ROLE_META: Record<
	Role,
	{
		label: string;
		description: string;
		tone: "info" | "violet" | "warning" | null;
	}
> = {
	user: { label: "Member", description: "A regular member.", tone: null },
	moderator: {
		label: "Moderator",
		description: "Helps look after the club.",
		tone: "info",
	},
	admin: {
		label: "Admin",
		description: "Runs parts of the club.",
		tone: "violet",
	},
	super_admin: {
		label: "Super admin",
		description: "Has every permission. Set in the database only.",
		tone: "warning",
	},
};

/** Roles that can be given through the app, and who may give each. `super_admin` is in no list. */
const ASSIGNABLE_BY: Record<Role, readonly Role[]> = {
	user: ["admin", "super_admin"],
	moderator: ["admin", "super_admin"],
	admin: ["super_admin"],
	super_admin: [],
};

/** Roles whose holders can change other members' roles at all. */
export function canManageRoles(actor: HasRole | null | undefined): boolean {
	return ROLES.some((role) => ASSIGNABLE_BY[role].includes(roleOf(actor)));
}

/**
 * The roles `actor` may give `target` right now.
 * - Nobody can change a `super_admin`, or their own role, through the app.
 * - A super admin can set any other member to user, moderator or admin.
 * - An admin can only move members between user and moderator, and cannot
 *   touch another admin.
 */
export function assignableRoles(
	actor: (HasRole & { id: string }) | null | undefined,
	target: HasRole & { id: string },
): Role[] {
	if (!actor || actor.id === target.id) return [];
	const current = roleOf(target);
	// What the actor can do to someone who holds `current` today.
	if (!ASSIGNABLE_BY[current].includes(roleOf(actor))) return [];
	return ROLES.filter(
		(next) => next !== current && ASSIGNABLE_BY[next].includes(roleOf(actor)),
	);
}

export function canAssignRole(
	actor: (HasRole & { id: string }) | null | undefined,
	target: HasRole & { id: string },
	next: Role,
): boolean {
	return assignableRoles(actor, target).includes(next);
}
