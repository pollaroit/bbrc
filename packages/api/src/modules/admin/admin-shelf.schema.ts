import type { Prisma } from "@bbrc/db";
import {
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
	ShelfSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import z from "zod";
import { ShelfStatusSchema, ShelfTypeSchema } from "../shelf/shelf.schema";
import {
	adminShelfListFiltersSchema,
	adminShelfListRanging,
	adminShelfListSearching,
	adminShelfListSorting,
} from "./admin-shelf.listing";

export const AdminShelfRankingItemSchema = z.object({
	slug: ShelfSchema.shape.slug,
	title: ShelfSchema.shape.title,
	status: ShelfStatusSchema,
	type: ShelfTypeSchema,
	ownerUsername: UserSchema.shape.username,
	metric: z.number(),
	secondaryMetric: z.number().optional(),
});

export const AdminShelfOverviewOutputSchema = z.object({
	kpis: z.object({
		totalShelves: z.number().int().min(0),
		active: z.number().int().min(0),
		draft: z.number().int().min(0),
		archived: z.number().int().min(0),
		withCoverOverride: z.number().int().min(0),
		orderedType: z.number().int().min(0),
		distinctOwners: z.number().int().min(0),
		totalBooksOnShelves: z.number().int().min(0),
		createdLast7Days: z.number().int().min(0),
		createdLast30Days: z.number().int().min(0),
	}),
	shelvesByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	rankings: z.object({
		mostBooks: z.array(AdminShelfRankingItemSchema),
		mostPostAttachments: z.array(AdminShelfRankingItemSchema),
		recentlyUpdated: z.array(AdminShelfRankingItemSchema),
		emptyShelves: z.array(AdminShelfRankingItemSchema),
		largestActive: z.array(AdminShelfRankingItemSchema),
	}),
});

export type AdminShelfOverviewOutput = z.infer<
	typeof AdminShelfOverviewOutputSchema
>;

const adminShelfListQueryShape = adminShelfListFiltersSchema
	.extend(adminShelfListSorting.inputSchema.shape)
	.extend(adminShelfListRanging.inputSchema.shape)
	.extend(adminShelfListSearching.inputSchema.shape);

const adminShelfQueryRefine = (
	value: { rangeMin?: Date; rangeMax?: Date },
	ctx: z.RefinementCtx,
) => {
	refineRangingBounds(
		{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
		ctx,
	);
};

export const GetAdminShelfOverviewInputSchema = adminShelfListFiltersSchema
	.extend(adminShelfListRanging.inputSchema.shape)
	.extend(adminShelfListSearching.inputSchema.shape)
	.partial()
	.superRefine(adminShelfQueryRefine)
	.default({});

export type GetAdminShelfOverviewInput = z.infer<
	typeof GetAdminShelfOverviewInputSchema
>;

export const ListAdminShelvesInputSchema = adminShelfListQueryShape
	.extend(OffsetPaginationInputSchema.shape)
	.superRefine(adminShelfQueryRefine);

export const AdminShelfListCountsSchema = z.object({
	books: z.number().int().min(0),
	postAttachments: z.number().int().min(0),
});

export const AdminShelfListItemSchema = ShelfSchema.pick({
	id: true,
	slug: true,
	title: true,
	description: true,
	coverImageUrl: true,
	status: true,
	type: true,
	createdAt: true,
	updatedAt: true,
}).extend({
	owner: UserSchema.pick({
		username: true,
		name: true,
		image: true,
	}),
	counts: AdminShelfListCountsSchema,
});

export const ListAdminShelvesOutputSchema = OffsetPaginationOutputSchema(
	AdminShelfListItemSchema,
);

export type ListAdminShelvesInput = z.infer<typeof ListAdminShelvesInputSchema>;
export type ListAdminShelvesOutput = z.infer<
	typeof ListAdminShelvesOutputSchema
>;

export const GetAdminShelfStatsInputSchema = adminShelfListFiltersSchema
	.extend(adminShelfListRanging.inputSchema.shape)
	.partial()
	.default({});

export const AdminShelfStatsPointSchema = z.object({
	label: z.string(),
	value: z.number(),
});

export const GetAdminShelfStatsOutputSchema = z.object({
	statusDistribution: z.array(
		z.object({
			status: ShelfStatusSchema,
			count: z.number().int().min(0),
		}),
	),
	typeDistribution: z.array(
		z.object({
			type: ShelfTypeSchema,
			count: z.number().int().min(0),
		}),
	),
	shelvesByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	booksPerShelfHistogram: z.array(AdminShelfStatsPointSchema),
	engagementFunnel: z.array(
		z.object({
			stage: z.string(),
			count: z.number().int().min(0),
		}),
	),
});

export type GetAdminShelfStatsInput = z.infer<
	typeof GetAdminShelfStatsInputSchema
>;
export type GetAdminShelfStatsOutput = z.infer<
	typeof GetAdminShelfStatsOutputSchema
>;

export const adminShelfListSelect = {
	id: true,
	slug: true,
	title: true,
	description: true,
	coverImageUrl: true,
	status: true,
	type: true,
	createdAt: true,
	updatedAt: true,
	user: {
		select: {
			username: true,
			name: true,
			image: true,
		},
	},
	_count: {
		select: {
			books: true,
			postAttachments: true,
		},
	},
} as const satisfies Prisma.ShelfSelect;
