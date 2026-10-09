import type { Prisma } from "@bbrc/db";
import {
	BookStatusSchema,
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
	SittingSchema,
	SittingStatusSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import z from "zod";
import { SittingStoredDeadlineSchema } from "../sitting/sitting.schema";
import {
	adminSittingListFiltersSchema,
	adminSittingListRanging,
	adminSittingListSearching,
	adminSittingListSorting,
} from "./admin-sitting.listing";

export const AdminSittingRankingItemSchema = z.object({
	slug: SittingSchema.shape.slug,
	status: SittingStatusSchema,
	metric: z.number(),
	secondaryMetric: z.number().optional(),
	label: z.string().optional(),
});

export const AdminSittingOverviewOutputSchema = z.object({
	kpis: z.object({
		totalSittings: z.number().int().min(0),
		ongoing: z.number().int().min(0),
		voting: z.number().int().min(0),
		reading: z.number().int().min(0),
		finished: z.number().int().min(0),
		withSelectedBook: z.number().int().min(0),
		telegramAnnounced: z.number().int().min(0),
		overdueVotingDeadlines: z.number().int().min(0),
		startedLast30Days: z.number().int().min(0),
		finishedLast30Days: z.number().int().min(0),
	}),
	sittingsByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	rankings: z.object({
		mostParticipants: z.array(AdminSittingRankingItemSchema),
		mostPollVotes: z.array(AdminSittingRankingItemSchema),
		mostCompletedReaders: z.array(AdminSittingRankingItemSchema),
		mostPostAttachments: z.array(AdminSittingRankingItemSchema),
		longestReadingPhase: z.array(AdminSittingRankingItemSchema),
		leastParticipants: z.array(AdminSittingRankingItemSchema),
		mostDistinctVoters: z.array(AdminSittingRankingItemSchema),
		mostDnfParticipants: z.array(AdminSittingRankingItemSchema),
		highestCompletionRate: z.array(AdminSittingRankingItemSchema),
		soonestVotingDeadlines: z.array(AdminSittingRankingItemSchema),
	}),
});

export type AdminSittingOverviewOutput = z.infer<
	typeof AdminSittingOverviewOutputSchema
>;

const adminSittingListQueryShape = adminSittingListFiltersSchema
	.extend(adminSittingListSorting.inputSchema.shape)
	.extend(adminSittingListRanging.inputSchema.shape)
	.extend(adminSittingListSearching.inputSchema.shape);

const adminSittingQueryRefine = (
	value: {
		rangeMin?: Date;
		rangeMax?: Date;
		minSelectedBookPages?: number;
		maxSelectedBookPages?: number;
	},
	ctx: z.RefinementCtx,
) => {
	refineRangingBounds(
		{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
		ctx,
	);

	if (
		value.maxSelectedBookPages != null &&
		value.minSelectedBookPages != null &&
		value.maxSelectedBookPages < value.minSelectedBookPages
	) {
		ctx.addIssue({
			code: "custom",
			message:
				"Maximum selected book pages must be greater than or equal to minimum",
			path: ["maxSelectedBookPages"],
		});
	}
};

export const GetAdminSittingOverviewInputSchema = adminSittingListFiltersSchema
	.extend(adminSittingListRanging.inputSchema.shape)
	.extend(adminSittingListSearching.inputSchema.shape)
	.partial()
	.superRefine(adminSittingQueryRefine)
	.default({});

export type GetAdminSittingOverviewInput = z.infer<
	typeof GetAdminSittingOverviewInputSchema
>;

export const ListAdminSittingsInputSchema = adminSittingListQueryShape
	.extend(OffsetPaginationInputSchema.shape)
	.superRefine(adminSittingQueryRefine);

export const AdminSittingListCountsSchema = z.object({
	participants: z.number().int().min(0),
	activeParticipants: z.number().int().min(0),
	completedParticipants: z.number().int().min(0),
	dnfParticipants: z.number().int().min(0),
	pollOptions: z.number().int().min(0),
	pollVotes: z.number().int().min(0),
	postAttachments: z.number().int().min(0),
});

export const AdminSittingListItemSchema = SittingSchema.pick({
	id: true,
	slug: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	readingStartedAt: true,
	midtermAt: true,
}).extend({
	deadline: SittingStoredDeadlineSchema,
	telegramPollAnnounced: z.boolean(),
	selectedBook: z
		.object({
			slug: z.string(),
			title: z.string(),
			pages: z.number().int(),
			status: BookStatusSchema,
		})
		.nullable(),
	pollSlug: z.string().nullable(),
	counts: AdminSittingListCountsSchema,
});

export const ListAdminSittingsOutputSchema = OffsetPaginationOutputSchema(
	AdminSittingListItemSchema,
);

export type ListAdminSittingsInput = z.infer<
	typeof ListAdminSittingsInputSchema
>;
export type ListAdminSittingsOutput = z.infer<
	typeof ListAdminSittingsOutputSchema
>;

export const GetAdminSittingStatsInputSchema = adminSittingListFiltersSchema
	.extend(adminSittingListRanging.inputSchema.shape)
	.partial()
	.default({});

export const AdminSittingStatsPointSchema = z.object({
	label: z.string(),
	value: z.number(),
});

export const GetAdminSittingStatsOutputSchema = z.object({
	statusDistribution: z.array(
		z.object({
			status: SittingStatusSchema,
			count: z.number().int().min(0),
		}),
	),
	sittingsByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	participationMix: z.array(AdminSittingStatsPointSchema),
	pollVoteHistogram: z.array(AdminSittingStatsPointSchema),
	selectedBookPagesHistogram: z.array(AdminSittingStatsPointSchema),
	engagementFunnel: z.array(
		z.object({
			stage: z.string(),
			count: z.number().int().min(0),
		}),
	),
});

export type GetAdminSittingStatsInput = z.infer<
	typeof GetAdminSittingStatsInputSchema
>;
export type GetAdminSittingStatsOutput = z.infer<
	typeof GetAdminSittingStatsOutputSchema
>;

export const adminSittingListSelect = {
	id: true,
	slug: true,
	status: true,
	deadline: true,
	createdAt: true,
	updatedAt: true,
	readingStartedAt: true,
	midtermAt: true,
	telegramPollOpenSentAt: true,
	selectedBook: {
		select: {
			slug: true,
			title: true,
			pages: true,
			status: true,
		},
	},
	poll: {
		select: {
			slug: true,
			_count: { select: { options: true } },
		},
	},
	_count: {
		select: {
			participants: true,
			postAttachments: true,
		},
	},
} as const satisfies Prisma.SittingSelect;
