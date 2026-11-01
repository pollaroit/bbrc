import { protectedProcedure, superAdminProcedure } from "../../procedures";
import { audited } from "../audit/audit-middleware";
import { loadViewer } from "../visibility/viewer";
import {
	ActOnReportInputSchema,
	ActOnReportOutputSchema,
	CreateReportInputSchema,
	CreateReportOutputSchema,
	ListReportsInputSchema,
	ListReportsOutputSchema,
	OpenReportCountOutputSchema,
} from "./report.schema";
import {
	actOnReport,
	countOpenReportGroups,
	createReport,
	listReports,
} from "./report.service";

export const reportRouter = {
	/** Any member who is not banned; they can only report what they may see. */
	create: protectedProcedure
		.input(CreateReportInputSchema)
		.output(CreateReportOutputSchema)
		.handler(async ({ input, context }) =>
			createReport(
				context.db,
				await loadViewer(context.db, context.session),
				context.session.user.id,
				input,
			),
		),
	list: superAdminProcedure
		.input(ListReportsInputSchema)
		.output(ListReportsOutputSchema)
		.handler(async ({ input, context }) => listReports(context.db, input)),
	openCount: superAdminProcedure
		.output(OpenReportCountOutputSchema)
		.handler(async ({ context }) => ({
			count: await countOpenReportGroups(context.db),
		})),
	act: superAdminProcedure
		.input(ActOnReportInputSchema)
		.use(
			// The report's own action history stays; this puts the decision in the shared log too.
			audited("report.decided", {
				target: ({ input }) => ({
					type: "report",
					id: input.targetId,
					label: `${input.target} report`,
				}),
				metadata: ({ input }) => ({
					decision: input.action,
					note: input.note ?? null,
				}),
			}),
		)
		.output(ActOnReportOutputSchema)
		.handler(async ({ input, context }) =>
			actOnReport(context.db, context.session.user.id, input),
		),
};
