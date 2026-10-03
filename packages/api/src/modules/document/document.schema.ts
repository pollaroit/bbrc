import { DOCUMENT_LANGUAGE_CODES } from "@bbrc/shared";
import { z } from "zod";

export const DocumentLanguageSchema = z.enum(DOCUMENT_LANGUAGE_CODES, {
	message: "Choose a supported document language",
});

export const DocumentNameSchema = z
	.string()
	.trim()
	.min(2, "Name must be at least 2 characters long")
	.max(120, "Name must be at most 120 characters long");

export const DocumentStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const ApprovedDocumentItemSchema = z.object({
	slug: z.string(),
	name: z.string(),
	language: z.string(),
	documentUrl: z.string().url(),
	createdAt: z.coerce.date(),
	uploader: z.object({
		username: z.string(),
		name: z.string().nullable(),
	}),
});

export const ListApprovedDocumentsByBookInputSchema = z.object({
	bookSlug: z.string().min(1),
});

export const ListApprovedDocumentsByBookOutputSchema = z.object({
	items: z.array(ApprovedDocumentItemSchema),
});

export type ListApprovedDocumentsByBookOutput = z.infer<
	typeof ListApprovedDocumentsByBookOutputSchema
>;

export const UpdateDocumentInputSchema = z.object({
	bookSlug: z.string().min(1),
	documentSlug: z.string().min(1),
	name: DocumentNameSchema,
	language: DocumentLanguageSchema,
});

export const UpdateDocumentOutputSchema = z.object({
	slug: z.string(),
	status: DocumentStatusSchema,
});

export const GetDocumentForEditInputSchema = z.object({
	bookSlug: z.string().min(1),
	documentSlug: z.string().min(1),
});

export const GetDocumentForEditOutputSchema = z.object({
	slug: z.string(),
	name: z.string(),
	language: z.string(),
	status: DocumentStatusSchema,
	documentUrl: z.string().url(),
	bookSlug: z.string(),
});

export const DeleteDocumentInputSchema = z.object({
	bookSlug: z.string().min(1),
	documentSlug: z.string().min(1),
});

export const DeleteDocumentOutputSchema = z.object({
	slug: z.string(),
});

export const PendingDocumentItemSchema = z.object({
	id: z.string().uuid(),
	slug: z.string(),
	name: z.string(),
	language: z.string(),
	createdAt: z.coerce.date(),
	bookSlug: z.string(),
	bookTitle: z.string(),
	submitter: z.object({
		username: z.string(),
		name: z.string().nullable(),
	}),
});

export const ListPendingDocumentsOutputSchema = z.object({
	count: z.number().int().nonnegative(),
	items: z.array(PendingDocumentItemSchema),
});

export const ApproveDocumentInputSchema = z.object({
	id: z.string().uuid(),
	acceptanceNotes: z
		.string()
		.trim()
		.max(200, "Acceptance notes must be at most 200 characters long")
		.optional(),
});

export const ApproveDocumentOutputSchema = z.object({
	id: z.string().uuid(),
});

export const RejectDocumentInputSchema = z.object({
	id: z.string().uuid(),
	rejectionReason: z
		.string()
		.trim()
		.min(1, "Rejection reason is required")
		.max(200, "Rejection reason must be at most 200 characters long"),
});

export const RejectDocumentOutputSchema = z.object({
	id: z.string().uuid(),
});

export const MyDocumentItemSchema = z.object({
	id: z.string().uuid(),
	slug: z.string(),
	name: z.string(),
	language: z.string(),
	status: DocumentStatusSchema,
	createdAt: z.coerce.date(),
	bookSlug: z.string(),
	bookTitle: z.string(),
	acceptanceNotes: z.string().nullable(),
	rejectionReason: z.string().nullable(),
});

export const ListMyDocumentsOutputSchema = z.object({
	count: z.number().int().nonnegative(),
	items: z.array(MyDocumentItemSchema),
});

export type UpdateDocumentInput = z.infer<typeof UpdateDocumentInputSchema>;
export type UpdateDocumentOutput = z.infer<typeof UpdateDocumentOutputSchema>;
export type GetDocumentForEditOutput = z.infer<
	typeof GetDocumentForEditOutputSchema
>;
export type DeleteDocumentInput = z.infer<typeof DeleteDocumentInputSchema>;
export type DeleteDocumentOutput = z.infer<typeof DeleteDocumentOutputSchema>;
export type ListPendingDocumentsOutput = z.infer<
	typeof ListPendingDocumentsOutputSchema
>;
export type ListMyDocumentsOutput = z.infer<typeof ListMyDocumentsOutputSchema>;
export type ApproveDocumentInput = z.infer<typeof ApproveDocumentInputSchema>;
export type ApproveDocumentOutput = z.infer<typeof ApproveDocumentOutputSchema>;
export type RejectDocumentInput = z.infer<typeof RejectDocumentInputSchema>;
export type RejectDocumentOutput = z.infer<typeof RejectDocumentOutputSchema>;
