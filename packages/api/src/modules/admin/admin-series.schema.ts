import type { Prisma } from "@bbrc/db";
import {
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import z from "zod";
import {
	adminSeriesListFiltersSchema,
	adminSeriesListRanging,
	adminSeriesListSearching,
	adminSeriesListSorting,
} from "./admin-series.listing";

export const AdminSeriesRankingItemSchema = z.object({
	slug: z.string(),
	title: z.string(),
	bookCount: z.number().int().min(0),
	metric: z.number(),
});

export const AdminSeriesOverviewOutputSchema = z.object({
	kpis: z.object({
		totalSeries: z.number().int().min(0),
		totalBooksInSeries: z.number().int().min(0),
		emptySeries: z.number().int().min(0),
		withDescription: z.number().int().min(0),
		avgBooksPerSeries: z.number().min(0),
		createdLast7Days: z.number().int().min(0),
		createdLast30Days: z.number().int().min(0),
	}),
	seriesByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	rankings: z.object({
		mostBooks: z.array(AdminSeriesRankingItemSchema),
		recentlyUpdated: z.array(AdminSeriesRankingItemSchema),
		emptySeries: z.array(AdminSeriesRankingItemSchema),
	}),
});

export type AdminSeriesOverviewOutput = z.infer<
	typeof AdminSeriesOverviewOutputSchema
>;

const adminSeriesQueryRefine = (
	value: { rangeMin?: Date; rangeMax?: Date },
	ctx: z.RefinementCtx,
) => {
	refineRangingBounds(
		{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
		ctx,
	);
};

export const GetAdminSeriesOverviewInputSchema = adminSeriesListFiltersSchema
	.extend(adminSeriesListRanging.inputSchema.shape)
	.extend(adminSeriesListSearching.inputSchema.shape)
	.partial()
	.superRefine(adminSeriesQueryRefine)
	.default({});

export type GetAdminSeriesOverviewInput = z.infer<
	typeof GetAdminSeriesOverviewInputSchema
>;

const adminSeriesListQueryShape = adminSeriesListFiltersSchema
	.extend(adminSeriesListSorting.inputSchema.shape)
	.extend(adminSeriesListRanging.inputSchema.shape)
	.extend(adminSeriesListSearching.inputSchema.shape);

export const ListAdminSeriesInputSchema = adminSeriesListQueryShape
	.extend(OffsetPaginationInputSchema.shape)
	.superRefine(adminSeriesQueryRefine);

export const AdminSeriesListItemSchema = z.object({
	slug: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
	bookCount: z.number().int().min(0),
});

export const ListAdminSeriesOutputSchema = OffsetPaginationOutputSchema(
	AdminSeriesListItemSchema,
);

export type ListAdminSeriesInput = z.infer<typeof ListAdminSeriesInputSchema>;
export type ListAdminSeriesOutput = z.infer<typeof ListAdminSeriesOutputSchema>;

export const GetAdminSeriesStatsInputSchema = adminSeriesListFiltersSchema
	.extend(adminSeriesListRanging.inputSchema.shape)
	.partial()
	.default({});

export const AdminSeriesStatsPointSchema = z.object({
	label: z.string(),
	value: z.number(),
});

export const GetAdminSeriesStatsOutputSchema = z.object({
	seriesByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	booksPerSeriesHistogram: z.array(AdminSeriesStatsPointSchema),
	coverageFunnel: z.array(
		z.object({
			stage: z.string(),
			count: z.number().int().min(0),
		}),
	),
});

export type GetAdminSeriesStatsInput = z.infer<
	typeof GetAdminSeriesStatsInputSchema
>;
export type GetAdminSeriesStatsOutput = z.infer<
	typeof GetAdminSeriesStatsOutputSchema
>;

export const adminSeriesListSelect = {
	slug: true,
	title: true,
	description: true,
	createdAt: true,
	updatedAt: true,
	_count: { select: { books: true } },
} as const satisfies Prisma.SeriesSelect;
