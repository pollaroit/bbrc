import type { Prisma } from "@bbrc/db";
import {
	BookSchema,
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import { DOCUMENT_LANGUAGE_CODES } from "@bbrc/shared";
import z from "zod";
import { DocumentStatusSchema } from "../document/document.schema";
import {
	adminDocumentListFiltersSchema,
	adminDocumentListRanging,
	adminDocumentListSearching,
	adminDocumentListSorting,
} from "./admin-document.listing";

export const AdminDocumentRankingItemSchema = z.object({
	slug: z.string(),
	name: z.string(),
	status: DocumentStatusSchema,
	language: z.string(),
	bookSlug: BookSchema.shape.slug,
	bookTitle: BookSchema.shape.title,
	submitterUsername: UserSchema.shape.username,
	metric: z.number(),
	secondaryMetric: z.number().optional(),
});

export const AdminDocumentOverviewOutputSchema = z.object({
	kpis: z.object({
		totalDocuments: z.number().int().min(0),
		pending: z.number().int().min(0),
		approved: z.number().int().min(0),
		rejected: z.number().int().min(0),
		distinctBooks: z.number().int().min(0),
		distinctSubmitters: z.number().int().min(0),
		withAcceptanceNotes: z.number().int().min(0),
		withRejectionReason: z.number().int().min(0),
		submittedLast7Days: z.number().int().min(0),
		submittedLast30Days: z.number().int().min(0),
	}),
	documentsByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	rankings: z.object({
		oldestPending: z.array(AdminDocumentRankingItemSchema),
		recentlySubmitted: z.array(AdminDocumentRankingItemSchema),
		mostByBook: z.array(AdminDocumentRankingItemSchema),
		mostBySubmitter: z.array(AdminDocumentRankingItemSchema),
	}),
});

export type AdminDocumentOverviewOutput = z.infer<
	typeof AdminDocumentOverviewOutputSchema
>;

const adminDocumentListQueryShape = adminDocumentListFiltersSchema
	.extend(adminDocumentListSorting.inputSchema.shape)
	.extend(adminDocumentListRanging.inputSchema.shape)
	.extend(adminDocumentListSearching.inputSchema.shape);

const adminDocumentQueryRefine = (
	value: { rangeMin?: Date; rangeMax?: Date },
	ctx: z.RefinementCtx,
) => {
	refineRangingBounds(
		{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
		ctx,
	);
};

export const GetAdminDocumentOverviewInputSchema =
	adminDocumentListFiltersSchema
		.extend(adminDocumentListRanging.inputSchema.shape)
		.extend(adminDocumentListSearching.inputSchema.shape)
		.partial()
		.superRefine(adminDocumentQueryRefine)
		.default({});

export type GetAdminDocumentOverviewInput = z.infer<
	typeof GetAdminDocumentOverviewInputSchema
>;

export const ListAdminDocumentsInputSchema = adminDocumentListQueryShape
	.extend(OffsetPaginationInputSchema.shape)
	.superRefine(adminDocumentQueryRefine);

export const AdminDocumentListItemSchema = z.object({
	id: z.string().uuid(),
	slug: z.string(),
	name: z.string(),
	language: z.string(),
	status: DocumentStatusSchema,
	acceptanceNotes: z.string().nullable(),
	rejectionReason: z.string().nullable(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	submitter: UserSchema.pick({
		username: true,
		name: true,
		image: true,
	}),
	book: BookSchema.pick({
		slug: true,
		title: true,
	}),
});

export const ListAdminDocumentsOutputSchema = OffsetPaginationOutputSchema(
	AdminDocumentListItemSchema,
);

export type ListAdminDocumentsInput = z.infer<
	typeof ListAdminDocumentsInputSchema
>;
export type ListAdminDocumentsOutput = z.infer<
	typeof ListAdminDocumentsOutputSchema
>;

export const GetAdminDocumentStatsInputSchema = adminDocumentListFiltersSchema
	.extend(adminDocumentListRanging.inputSchema.shape)
	.partial()
	.default({});

export const AdminDocumentStatsPointSchema = z.object({
	label: z.string(),
	value: z.number(),
});

export const GetAdminDocumentStatsOutputSchema = z.object({
	statusDistribution: z.array(
		z.object({
			status: DocumentStatusSchema,
			count: z.number().int().min(0),
		}),
	),
	languageMix: z.array(
		z.object({
			language: z.enum(DOCUMENT_LANGUAGE_CODES),
			count: z.number().int().min(0),
		}),
	),
	documentsByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	reviewFunnel: z.array(
		z.object({
			stage: z.string(),
			count: z.number().int().min(0),
		}),
	),
});

export type GetAdminDocumentStatsInput = z.infer<
	typeof GetAdminDocumentStatsInputSchema
>;
export type GetAdminDocumentStatsOutput = z.infer<
	typeof GetAdminDocumentStatsOutputSchema
>;

export const adminDocumentListSelect = {
	id: true,
	slug: true,
	name: true,
	language: true,
	status: true,
	acceptanceNotes: true,
	rejectionReason: true,
	createdAt: true,
	updatedAt: true,
	user: {
		select: {
			username: true,
			name: true,
			image: true,
		},
	},
	book: {
		select: {
			slug: true,
			title: true,
		},
	},
} as const satisfies Prisma.DocumentSelect;
