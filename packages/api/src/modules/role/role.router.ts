import { roleProcedure } from "../../procedures";
import { noAudit } from "../audit/audit-middleware";
import { SetRoleInputSchema, SetRoleOutputSchema } from "./role.schema";
import { setMemberRole } from "./role.service";

export const roleRouter = {
	/**
	 * Open to admins and super admins; what each may do is decided by the rules in
	 * `packages/shared/src/roles.ts`, not by this guard.
	 */
	set: roleProcedure("admin", "super_admin")
		.input(SetRoleInputSchema)
		.use(noAudit("written inside the change's own transaction (setMemberRole)"))
		.output(SetRoleOutputSchema)
		.handler(async ({ input, context }) =>
			setMemberRole(context.db, context.session.user, input),
		),
};
