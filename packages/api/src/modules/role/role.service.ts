import type { Database } from "@bbrc/db";
import {
	assignableRoles,
	canAssignRole,
	isSuperAdmin,
	type RoleActor,
	roleOf,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { recordAudit } from "../audit/audit.service";
import { actorOf } from "../audit/audit-middleware";
import type { SetRoleInput, SetRoleOutput } from "./role.schema";

/** Why a role change was refused, in words the person who tried can act on. */
function refusalFor(actor: RoleActor, target: RoleActor, next: string): string {
	if (actor.id === target.id) return "You cannot change your own role.";
	if (isSuperAdmin(target))
		return "A super admin's role cannot be changed here.";
	if (next === "super_admin") return "Nobody can be made a super admin here.";
	if (roleOf(target) === "admin" && !isSuperAdmin(actor)) {
		return "Only a super admin can change an admin's role.";
	}
	return "You are not allowed to give that role.";
}

/**
 * Sets a member's role, if the actor may (see `assignableRoles`). The change is
 * made only while the member still holds the role we checked against, so two
 * people changing the same member at once cannot slip past the rules.
 */
export async function setMemberRole(
	db: Database,
	actor: RoleActor & { name?: string | null; username?: string | null },
	input: SetRoleInput,
): Promise<SetRoleOutput> {
	const target = await db.user.findUnique({
		where: { username: input.username },
		select: { id: true, name: true, username: true, role: true },
	});
	if (!target) {
		throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	}
	if (!canAssignRole(actor, target, input.role)) {
		throw new ORPCError("FORBIDDEN", {
			message: refusalFor(actor, target, input.role),
		});
	}

	const previousRole = target.role;
	// The change and its audit entry stand or fall together.
	await db.$transaction(async (tx) => {
		const changed = await tx.user.updateMany({
			where: { id: target.id, role: previousRole },
			data: { role: input.role },
		});
		if (changed.count !== 1) {
			throw new ORPCError("CONFLICT", {
				message: "Their role changed while you were doing this. Try again.",
			});
		}
		await recordAudit(tx, {
			actor: actorOf(actor),
			action: "member.role_changed",
			target: { type: "member", id: target.id, label: target.name },
			metadata: { from: previousRole, to: input.role },
		});
	});
	return { username: target.username, role: input.role };
}

/** The roles an actor may give a member right now (for screens that offer them). */
export function rolesOfferedTo(actor: RoleActor, target: RoleActor) {
	return assignableRoles(actor, target);
}
