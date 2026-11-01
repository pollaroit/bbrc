import { adminProcedure, notBannedProcedure } from "../../procedures";
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
	create: notBannedProcedure
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
	list: adminProcedure
		.input(ListReportsInputSchema)
		.output(ListReportsOutputSchema)
		.handler(async ({ input, context }) => listReports(context.db, input)),
	openCount: adminProcedure
		.output(OpenReportCountOutputSchema)
		.handler(async ({ context }) => ({
			count: await countOpenReportGroups(context.db),
		})),
	act: adminProcedure
		.input(ActOnReportInputSchema)
		.output(ActOnReportOutputSchema)
		.handler(async ({ input, context }) =>
			actOnReport(context.db, context.session.user.id, input),
		),
};
