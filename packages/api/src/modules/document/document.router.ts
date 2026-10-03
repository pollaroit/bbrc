import {
	adminProcedure,
	notBannedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	ApproveDocumentInputSchema,
	ApproveDocumentOutputSchema,
	DeleteDocumentInputSchema,
	DeleteDocumentOutputSchema,
	GetDocumentForEditInputSchema,
	GetDocumentForEditOutputSchema,
	ListApprovedDocumentsByBookInputSchema,
	ListApprovedDocumentsByBookOutputSchema,
	ListMyDocumentsOutputSchema,
	ListPendingDocumentsOutputSchema,
	RejectDocumentInputSchema,
	RejectDocumentOutputSchema,
	UpdateDocumentInputSchema,
	UpdateDocumentOutputSchema,
} from "./document.schema";
import {
	approveDocument,
	deleteDocument,
	getDocumentForEdit,
	listApprovedDocumentsByBook,
	listMyDocuments,
	listPendingDocuments,
	rejectDocument,
	updateDocumentMetadata,
} from "./document.service";

export const documentRouter = {
	listApprovedByBook: publicProcedure
		.input(ListApprovedDocumentsByBookInputSchema)
		.output(ListApprovedDocumentsByBookOutputSchema)
		.handler(async ({ input, context }) =>
			listApprovedDocumentsByBook(input.bookSlug, context.db),
		),
	getForEdit: notBannedProcedure
		.input(GetDocumentForEditInputSchema)
		.output(GetDocumentForEditOutputSchema)
		.handler(async ({ input, context }) =>
			getDocumentForEdit(
				input.bookSlug,
				input.documentSlug,
				context.session,
				context.db,
			),
		),
	update: notBannedProcedure
		.input(UpdateDocumentInputSchema)
		.output(UpdateDocumentOutputSchema)
		.handler(async ({ input, context }) =>
			updateDocumentMetadata(input, context.session, context.db, context),
		),
	delete: notBannedProcedure
		.input(DeleteDocumentInputSchema)
		.output(DeleteDocumentOutputSchema)
		.handler(async ({ input, context }) =>
			deleteDocument(input, context.session, context.db, context),
		),
	listPending: adminProcedure
		.output(ListPendingDocumentsOutputSchema)
		.handler(async ({ context }) => listPendingDocuments(context.db)),
	listMine: notBannedProcedure
		.output(ListMyDocumentsOutputSchema)
		.handler(async ({ context }) =>
			listMyDocuments(context.session.user.id, context.db),
		),
	approve: adminProcedure
		.input(ApproveDocumentInputSchema)
		.output(ApproveDocumentOutputSchema)
		.handler(async ({ input, context }) =>
			approveDocument(input, context.db, context),
		),
	reject: adminProcedure
		.input(RejectDocumentInputSchema)
		.output(RejectDocumentOutputSchema)
		.handler(async ({ input, context }) =>
			rejectDocument(input, context.db, context),
		),
};
