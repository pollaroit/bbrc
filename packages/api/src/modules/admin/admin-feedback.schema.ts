import type { Prisma } from "@bbrc/db";
import {
	BookSchema,
	FeedbackSchema,
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import z from "zod";
import {
	adminFeedbackListFiltersSchema,
	adminFeedbackListRanging,
	adminFeedbackListSearching,
	adminFeedbackListSorting,
} from "./admin-feedback.listing";

export const AdminFeedbackRankingItemSchema = z.object({
	slug: FeedbackSchema.shape.slug,
	rating: FeedbackSchema.shape.rating,
	metric: z.number(),
	secondaryMetric: z.number().optional(),
	bookTitle: z.string(),
	authorUsername: UserSchema.shape.username,
});

export const AdminFeedbackOverviewOutputSchema = z.object({
	kpis: z.object({
		totalFeedbacks: z.number().int().min(0),
		averageRating: z.number().min(0),
		medianRating: z.number().min(0),
		withComments: z.number().int().min(0),
		withLikes: z.number().int().min(0),
		inPosts: z.number().int().min(0),
		distinctBooksReviewed: z.number().int().min(0),
		distinctReviewers: z.number().int().min(0),
		submittedLast7Days: z.number().int().min(0),
		submittedLast30Days: z.number().int().min(0),
	}),
	feedbacksByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	rankings: z.object({
		highestRated: z.array(AdminFeedbackRankingItemSchema),
		lowestRated: z.array(AdminFeedbackRankingItemSchema),
		mostLiked: z.array(AdminFeedbackRankingItemSchema),
		mostCommented: z.array(AdminFeedbackRankingItemSchema),
		longestReviews: z.array(AdminFeedbackRankingItemSchema),
		shortestReviews: z.array(AdminFeedbackRankingItemSchema),
		mostPostAttachments: z.array(AdminFeedbackRankingItemSchema),
		highestEngagement: z.array(AdminFeedbackRankingItemSchema),
		onLongestBooks: z.array(AdminFeedbackRankingItemSchema),
	}),
});

export type AdminFeedbackOverviewOutput = z.infer<
	typeof AdminFeedbackOverviewOutputSchema
>;

const adminFeedbackListQueryShape = adminFeedbackListFiltersSchema
	.extend(adminFeedbackListSorting.inputSchema.shape)
	.extend(adminFeedbackListRanging.inputSchema.shape)
	.extend(adminFeedbackListSearching.inputSchema.shape);

const adminFeedbackQueryRefine = (
	value: {
		rangeMin?: Date;
		rangeMax?: Date;
		minRating?: number;
		maxRating?: number;
		minBookPages?: number;
		maxBookPages?: number;
	},
	ctx: z.RefinementCtx,
) => {
	refineRangingBounds(
		{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
		ctx,
	);

	if (
		value.maxRating != null &&
		value.minRating != null &&
		value.maxRating < value.minRating
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum rating must be greater than or equal to minimum",
			path: ["maxRating"],
		});
	}

	if (
		value.maxBookPages != null &&
		value.minBookPages != null &&
		value.maxBookPages < value.minBookPages
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum book pages must be greater than or equal to minimum",
			path: ["maxBookPages"],
		});
	}
};

export const GetAdminFeedbackOverviewInputSchema =
	adminFeedbackListFiltersSchema
		.extend(adminFeedbackListRanging.inputSchema.shape)
		.extend(adminFeedbackListSearching.inputSchema.shape)
		.partial()
		.superRefine(adminFeedbackQueryRefine)
		.default({});

export type GetAdminFeedbackOverviewInput = z.infer<
	typeof GetAdminFeedbackOverviewInputSchema
>;

export const ListAdminFeedbacksInputSchema = adminFeedbackListQueryShape
	.extend(OffsetPaginationInputSchema.shape)
	.superRefine(adminFeedbackQueryRefine);

export const AdminFeedbackListCountsSchema = z.object({
	likes: z.number().int().min(0),
	comments: z.number().int().min(0),
	postAttachments: z.number().int().min(0),
});

export const AdminFeedbackListItemSchema = FeedbackSchema.pick({
	id: true,
	slug: true,
	rating: true,
	review: true,
	createdAt: true,
	updatedAt: true,
}).extend({
	reviewLength: z.number().int().min(0),
	author: UserSchema.pick({
		username: true,
		name: true,
		image: true,
	}),
	book: BookSchema.pick({
		slug: true,
		title: true,
		pages: true,
		status: true,
		averageRating: true,
		coverId: true,
	}),
	counts: AdminFeedbackListCountsSchema,
});

export const ListAdminFeedbacksOutputSchema = OffsetPaginationOutputSchema(
	AdminFeedbackListItemSchema,
);

export type ListAdminFeedbacksInput = z.infer<
	typeof ListAdminFeedbacksInputSchema
>;
export type ListAdminFeedbacksOutput = z.infer<
	typeof ListAdminFeedbacksOutputSchema
>;

export const GetAdminFeedbackStatsInputSchema = adminFeedbackListFiltersSchema
	.extend(adminFeedbackListRanging.inputSchema.shape)
	.partial()
	.default({});

export const AdminFeedbackStatsPointSchema = z.object({
	label: z.string(),
	value: z.number(),
});

export const GetAdminFeedbackStatsOutputSchema = z.object({
	ratingDistribution: z.array(AdminFeedbackStatsPointSchema),
	feedbacksByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	reviewLengthHistogram: z.array(AdminFeedbackStatsPointSchema),
	engagementFunnel: z.array(
		z.object({
			stage: z.string(),
			count: z.number().int().min(0),
		}),
	),
	reviewedBookPagesHistogram: z.array(AdminFeedbackStatsPointSchema),
});

export type GetAdminFeedbackStatsInput = z.infer<
	typeof GetAdminFeedbackStatsInputSchema
>;
export type GetAdminFeedbackStatsOutput = z.infer<
	typeof GetAdminFeedbackStatsOutputSchema
>;

export const adminFeedbackListSelect = {
	id: true,
	slug: true,
	rating: true,
	review: true,
	createdAt: true,
	updatedAt: true,
	author: {
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
			pages: true,
			status: true,
			averageRating: true,
			coverId: true,
		},
	},
	_count: {
		select: {
			likes: true,
			comments: true,
			postAttachments: true,
		},
	},
} as const satisfies Prisma.FeedbackSelect;
