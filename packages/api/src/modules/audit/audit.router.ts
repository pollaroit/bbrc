import { superAdminProcedure } from "../../procedures";
import {
	ListAuditLogInputSchema,
	ListAuditLogOutputSchema,
} from "./audit.schema";
import { listAuditLog } from "./audit.service";
import { noAudit } from "./audit-middleware";

export const auditRouter = {
	/** Reading the log is not itself logged. */
	list: superAdminProcedure
		.input(ListAuditLogInputSchema)
		.use(noAudit("read only"))
		.output(ListAuditLogOutputSchema)
		.handler(async ({ input, context }) => listAuditLog(context.db, input)),
};
