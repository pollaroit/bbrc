import type { Prisma } from "@bbrc/db";
import {
	BookSchema,
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
	PostSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import z from "zod";
import {
	adminPostListFiltersSchema,
	adminPostListRanging,
	adminPostListSearching,
	adminPostListSorting,
	postAttachmentKindValues,
} from "./admin-post.listing";

export const AdminPostRankingItemSchema = z.object({
	slug: PostSchema.shape.slug,
	authorUsername: UserSchema.shape.username,
	contentPreview: z.string(),
	metric: z.number(),
	secondaryMetric: z.number().optional(),
});

export const AdminPostOverviewOutputSchema = z.object({
	kpis: z.object({
		totalPosts: z.number().int().min(0),
		withImage: z.number().int().min(0),
		withAttachedBook: z.number().int().min(0),
		withAttachment: z.number().int().min(0),
		edited: z.number().int().min(0),
		totalLikes: z.number().int().min(0),
		totalComments: z.number().int().min(0),
		distinctAuthors: z.number().int().min(0),
		postedLast7Days: z.number().int().min(0),
		postedLast30Days: z.number().int().min(0),
	}),
	postsByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	rankings: z.object({
		mostLiked: z.array(AdminPostRankingItemSchema),
		mostCommented: z.array(AdminPostRankingItemSchema),
		longestContent: z.array(AdminPostRankingItemSchema),
		mostEdited: z.array(AdminPostRankingItemSchema),
		mostAuthors: z.array(
			z.object({
				authorUsername: UserSchema.shape.username,
				metric: z.number(),
			}),
		),
	}),
});

export type AdminPostOverviewOutput = z.infer<
	typeof AdminPostOverviewOutputSchema
>;

const adminPostListQueryShape = adminPostListFiltersSchema
	.extend(adminPostListSorting.inputSchema.shape)
	.extend(adminPostListRanging.inputSchema.shape)
	.extend(adminPostListSearching.inputSchema.shape);

const adminPostQueryRefine = (
	value: { rangeMin?: Date; rangeMax?: Date },
	ctx: z.RefinementCtx,
) => {
	refineRangingBounds(
		{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
		ctx,
	);
};

export const GetAdminPostOverviewInputSchema = adminPostListFiltersSchema
	.extend(adminPostListRanging.inputSchema.shape)
	.extend(adminPostListSearching.inputSchema.shape)
	.partial()
	.superRefine(adminPostQueryRefine)
	.default({});

export type GetAdminPostOverviewInput = z.infer<
	typeof GetAdminPostOverviewInputSchema
>;

export const ListAdminPostsInputSchema = adminPostListQueryShape
	.extend(OffsetPaginationInputSchema.shape)
	.superRefine(adminPostQueryRefine);

export const AdminPostListCountsSchema = z.object({
	likes: z.number().int().min(0),
	comments: z.number().int().min(0),
});

export const AdminPostListItemSchema = PostSchema.pick({
	id: true,
	slug: true,
	content: true,
	imageUrl: true,
	createdAt: true,
	updatedAt: true,
	editedAt: true,
}).extend({
	contentLength: z.number().int().min(0),
	author: UserSchema.pick({
		username: true,
		name: true,
		image: true,
	}),
	attachedBook: BookSchema.pick({
		slug: true,
		title: true,
	}).nullable(),
	attachmentKind: z.enum(postAttachmentKindValues).nullable(),
	counts: AdminPostListCountsSchema,
});

export const ListAdminPostsOutputSchema = OffsetPaginationOutputSchema(
	AdminPostListItemSchema,
);

export type ListAdminPostsInput = z.infer<typeof ListAdminPostsInputSchema>;
export type ListAdminPostsOutput = z.infer<typeof ListAdminPostsOutputSchema>;

export const GetAdminPostStatsInputSchema = adminPostListFiltersSchema
	.extend(adminPostListRanging.inputSchema.shape)
	.partial()
	.default({});

export const AdminPostStatsPointSchema = z.object({
	label: z.string(),
	value: z.number(),
});

export const GetAdminPostStatsOutputSchema = z.object({
	postsByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	attachmentKindMix: z.array(
		z.object({
			kind: z.enum(postAttachmentKindValues),
			count: z.number().int().min(0),
		}),
	),
	contentLengthHistogram: z.array(AdminPostStatsPointSchema),
	engagementFunnel: z.array(
		z.object({
			stage: z.string(),
			count: z.number().int().min(0),
		}),
	),
	likesHistogram: z.array(AdminPostStatsPointSchema),
});

export type GetAdminPostStatsInput = z.infer<
	typeof GetAdminPostStatsInputSchema
>;
export type GetAdminPostStatsOutput = z.infer<
	typeof GetAdminPostStatsOutputSchema
>;

export const adminPostListSelect = {
	id: true,
	slug: true,
	content: true,
	imageUrl: true,
	createdAt: true,
	updatedAt: true,
	editedAt: true,
	author: {
		select: {
			username: true,
			name: true,
			image: true,
		},
	},
	attachedBook: {
		select: {
			slug: true,
			title: true,
		},
	},
	attachment: {
		select: {
			kind: true,
		},
	},
	_count: {
		select: {
			likes: true,
			comments: true,
		},
	},
} as const satisfies Prisma.PostSelect;
