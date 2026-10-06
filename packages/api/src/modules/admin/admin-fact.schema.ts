import {
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
} from "@bbrc/schemas";
import { z } from "zod";

export const FactCategorySchema = z.enum([
	"general",
	"history",
	"science",
	"literature",
	"philosophy",
]);

export type FactCategory = z.infer<typeof FactCategorySchema>;

export const FactConfidenceSchema = z.enum(["low", "medium", "high"]);

export type FactConfidence = z.infer<typeof FactConfidenceSchema>;

const httpsUrlSchema = z
	.string()
	.url()
	.refine((value) => value.startsWith("https://"), {
		message: "Source must be an HTTPS URL",
	});

export const GenerateAdminFactDraftInputSchema = z
	.object({
		category: FactCategorySchema.optional(),
		topic: z.string().trim().min(1).max(200).optional(),
	})
	.default({});

export type GenerateAdminFactDraftInput = z.infer<
	typeof GenerateAdminFactDraftInputSchema
>;

export const AdminFactDraftSchema = z.object({
	fact: z.string().trim().min(1).max(2000),
	category: FactCategorySchema,
	source: httpsUrlSchema,
	confidence: FactConfidenceSchema,
});

export type AdminFactDraft = z.infer<typeof AdminFactDraftSchema>;

export const GenerateAdminFactDraftOutputSchema = AdminFactDraftSchema;

export type GenerateAdminFactDraftOutput = z.infer<
	typeof GenerateAdminFactDraftOutputSchema
>;

/** JSON schema subset for Gemini structured output. */
export const adminFactDraftGeminiSchema = {
	type: "object",
	properties: {
		fact: {
			type: "string",
			description:
				"One interesting, accurate fact in clear English (1–3 sentences).",
		},
		category: {
			type: "string",
			enum: FactCategorySchema.options,
		},
		source: {
			type: "string",
			description:
				"HTTPS URL to a reputable reference (Wikipedia, museum, journal, etc.).",
		},
		confidence: {
			type: "string",
			enum: FactConfidenceSchema.options,
			description: "How confident you are the fact and source are correct.",
		},
	},
	required: ["fact", "category", "source", "confidence"],
} as const;

const optionalHttpsImageSchema = z
	.string()
	.trim()
	.url()
	.refine((value) => value.startsWith("https://"), {
		message: "Image must be an HTTPS URL",
	})
	.optional()
	.or(z.literal("").transform(() => undefined));

export const CreateAdminFactInputSchema = z.object({
	body: z.string().trim().min(1).max(2000),
	category: FactCategorySchema,
	source: httpsUrlSchema,
	image: optionalHttpsImageSchema,
	confidence: FactConfidenceSchema,
	publish: z.boolean().default(false),
});

export type CreateAdminFactInput = z.infer<typeof CreateAdminFactInputSchema>;

export const AdminFactRecordSchema = z.object({
	id: z.string().uuid(),
	body: z.string(),
	category: FactCategorySchema,
	source: httpsUrlSchema,
	image: z.string().url().nullable(),
	confidence: FactConfidenceSchema,
	createdAt: z.coerce.date(),
	publishedAt: z.coerce.date().nullable(),
	createdBy: z.object({
		id: z.string(),
		name: z.string(),
		username: z.string(),
	}),
	likeCount: z.number().int().min(0),
	impressionCount: z.number().int().min(0),
});

export type AdminFactRecord = z.infer<typeof AdminFactRecordSchema>;

export const CreateAdminFactOutputSchema = AdminFactRecordSchema;

export const ListAdminFactsInputSchema = OffsetPaginationInputSchema.extend({
	status: z.enum(["all", "draft", "published"]).default("all"),
});

export type ListAdminFactsInput = z.infer<typeof ListAdminFactsInputSchema>;

export const ListAdminFactsOutputSchema = OffsetPaginationOutputSchema(
	AdminFactRecordSchema,
);

export type ListAdminFactsOutput = z.infer<typeof ListAdminFactsOutputSchema>;

export const AdminFactIdInputSchema = z.object({
	id: z.string().uuid(),
});

export type AdminFactIdInput = z.infer<typeof AdminFactIdInputSchema>;

export const PublishAdminFactOutputSchema = AdminFactRecordSchema;
export const DeleteAdminFactOutputSchema = z.object({ ok: z.literal(true) });

export const DEFAULT_FACT_GENERATION_BATCH = 10;

export const BatchCreateAdminFactItemSchema = z.object({
	body: z.string().trim().min(1).max(2000),
	category: FactCategorySchema,
	source: httpsUrlSchema,
	confidence: FactConfidenceSchema,
});

export const BatchCreateAdminFactsInputSchema = z.object({
	items: z.array(BatchCreateAdminFactItemSchema).min(1).max(50),
	publish: z.boolean().default(false),
});

export type BatchCreateAdminFactsInput = z.infer<
	typeof BatchCreateAdminFactsInputSchema
>;

export const BatchCreateAdminFactsOutputSchema = z.object({
	created: z.array(AdminFactRecordSchema),
});

export type BatchCreateAdminFactsOutput = z.infer<
	typeof BatchCreateAdminFactsOutputSchema
>;

export const AdminFactMemberEventSchema = z.object({
	user: z.object({
		id: z.string(),
		name: z.string(),
		username: z.string(),
		image: z.string().nullable(),
	}),
	createdAt: z.coerce.date(),
});

export type AdminFactMemberEvent = z.infer<typeof AdminFactMemberEventSchema>;

export const ListAdminFactEngagementInputSchema = AdminFactIdInputSchema.merge(
	OffsetPaginationInputSchema,
);

export type ListAdminFactEngagementInput = z.infer<
	typeof ListAdminFactEngagementInputSchema
>;

export const ListAdminFactEngagementOutputSchema = OffsetPaginationOutputSchema(
	AdminFactMemberEventSchema,
);

export type ListAdminFactEngagementOutput = z.infer<
	typeof ListAdminFactEngagementOutputSchema
>;

export type AdminFactStreamEvent =
	| { type: "meta"; targetCount: number }
	| { type: "fact"; index: number; draft: AdminFactDraft }
	| { type: "error"; index: number; message: string }
	| { type: "done" };
