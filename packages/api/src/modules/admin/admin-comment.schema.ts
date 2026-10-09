import type { Prisma } from "@bbrc/db";
import {
	BookSchema,
	CommentSchema,
	FeedbackSchema,
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
	PostSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import z from "zod";
import {
	adminCommentContextValues,
	adminCommentListFiltersSchema,
	adminCommentListRanging,
	adminCommentListSearching,
	adminCommentListSorting,
} from "./admin-comment.listing";

export const AdminCommentContextSchema = z.enum(adminCommentContextValues);

export const AdminCommentRankingItemSchema = z.object({
	slug: CommentSchema.shape.slug,
	authorUsername: UserSchema.shape.username,
	contentPreview: z.string(),
	context: AdminCommentContextSchema,
	contextLabel: z.string(),
	metric: z.number(),
	secondaryMetric: z.number().optional(),
});

export const AdminCommentOverviewOutputSchema = z.object({
	kpis: z.object({
		totalComments: z.number().int().min(0),
		onPosts: z.number().int().min(0),
		onFeedbacks: z.number().int().min(0),
		replies: z.number().int().min(0),
		topLevel: z.number().int().min(0),
		withImage: z.number().int().min(0),
		edited: z.number().int().min(0),
		totalLikes: z.number().int().min(0),
		totalReplies: z.number().int().min(0),
		distinctAuthors: z.number().int().min(0),
		postedLast7Days: z.number().int().min(0),
		postedLast30Days: z.number().int().min(0),
	}),
	commentsByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	rankings: z.object({
		mostLiked: z.array(AdminCommentRankingItemSchema),
		mostReplies: z.array(AdminCommentRankingItemSchema),
		longestContent: z.array(AdminCommentRankingItemSchema),
		mostEdited: z.array(AdminCommentRankingItemSchema),
		mostAuthors: z.array(
			z.object({
				authorUsername: UserSchema.shape.username,
				metric: z.number(),
			}),
		),
	}),
});

export type AdminCommentOverviewOutput = z.infer<
	typeof AdminCommentOverviewOutputSchema
>;

const adminCommentListQueryShape = adminCommentListFiltersSchema
	.extend(adminCommentListSorting.inputSchema.shape)
	.extend(adminCommentListRanging.inputSchema.shape)
	.extend(adminCommentListSearching.inputSchema.shape);

const adminCommentQueryRefine = (
	value: { rangeMin?: Date; rangeMax?: Date },
	ctx: z.RefinementCtx,
) => {
	refineRangingBounds(
		{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
		ctx,
	);
};

export const GetAdminCommentOverviewInputSchema = adminCommentListFiltersSchema
	.extend(adminCommentListRanging.inputSchema.shape)
	.extend(adminCommentListSearching.inputSchema.shape)
	.partial()
	.superRefine(adminCommentQueryRefine)
	.default({});

export type GetAdminCommentOverviewInput = z.infer<
	typeof GetAdminCommentOverviewInputSchema
>;

export const ListAdminCommentsInputSchema = adminCommentListQueryShape
	.extend(OffsetPaginationInputSchema.shape)
	.superRefine(adminCommentQueryRefine);

export const AdminCommentListContextSchema = z.object({
	type: AdminCommentContextSchema,
	postSlug: PostSchema.shape.slug.nullable(),
	feedbackSlug: FeedbackSchema.shape.slug.nullable(),
	bookSlug: BookSchema.shape.slug.nullable(),
	bookTitle: BookSchema.shape.title.nullable(),
});

export const AdminCommentListCountsSchema = z.object({
	likes: z.number().int().min(0),
	replies: z.number().int().min(0),
});

export const AdminCommentListItemSchema = CommentSchema.pick({
	id: true,
	slug: true,
	content: true,
	imageUrl: true,
	createdAt: true,
	updatedAt: true,
	editedAt: true,
	depth: true,
}).extend({
	contentLength: z.number().int().min(0),
	author: UserSchema.pick({
		username: true,
		name: true,
		image: true,
	}),
	parentSlug: CommentSchema.shape.slug.nullable(),
	context: AdminCommentListContextSchema,
	counts: AdminCommentListCountsSchema,
});

export const ListAdminCommentsOutputSchema = OffsetPaginationOutputSchema(
	AdminCommentListItemSchema,
);

export type ListAdminCommentsInput = z.infer<
	typeof ListAdminCommentsInputSchema
>;
export type ListAdminCommentsOutput = z.infer<
	typeof ListAdminCommentsOutputSchema
>;

export const GetAdminCommentStatsInputSchema = adminCommentListFiltersSchema
	.extend(adminCommentListRanging.inputSchema.shape)
	.partial()
	.default({});

export const AdminCommentStatsPointSchema = z.object({
	label: z.string(),
	value: z.number(),
});

export const GetAdminCommentStatsOutputSchema = z.object({
	commentsByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	contextMix: z.array(
		z.object({
			context: AdminCommentContextSchema,
			count: z.number().int().min(0),
		}),
	),
	depthHistogram: z.array(AdminCommentStatsPointSchema),
	likesHistogram: z.array(AdminCommentStatsPointSchema),
	engagementFunnel: z.array(
		z.object({
			stage: z.string(),
			count: z.number().int().min(0),
		}),
	),
});

export type GetAdminCommentStatsInput = z.infer<
	typeof GetAdminCommentStatsInputSchema
>;
export type GetAdminCommentStatsOutput = z.infer<
	typeof GetAdminCommentStatsOutputSchema
>;

export const adminCommentListSelect = {
	id: true,
	slug: true,
	content: true,
	imageUrl: true,
	createdAt: true,
	updatedAt: true,
	editedAt: true,
	depth: true,
	author: {
		select: {
			username: true,
			name: true,
			image: true,
		},
	},
	parent: {
		select: {
			slug: true,
		},
	},
	post: {
		select: {
			slug: true,
		},
	},
	feedback: {
		select: {
			slug: true,
			book: {
				select: {
					slug: true,
					title: true,
				},
			},
		},
	},
	_count: {
		select: {
			likes: true,
			replies: true,
		},
	},
} as const satisfies Prisma.CommentSelect;
