import {
	BookSchema,
	CursorPaginationInputSchema,
	CursorPaginationMetadataSchema,
	CursorPaginationOutputSchema,
	FeedbackSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import { isFeedbackRatingStep } from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";
import { PostAuthorSchema } from "../post/post.schema";
import { ReadEditionRefSchema } from "../read/read-edition-ref";
import {
	userFeedbackFiltersSchema,
	userFeedbackListRanging,
	userFeedbackListSearching,
	userFeedbackListSorting,
} from "./user-feedback.listing";

export const BookFeedbackReviewSchema = zod.object({
	slug: FeedbackSchema.shape.slug,
	authorId: UserSchema.shape.id,
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: UserSchema.shape.image,
	rating: FeedbackSchema.shape.rating,
	review: FeedbackSchema.shape.review,
	isSpoiler: FeedbackSchema.shape.isSpoiler,
	createdAt: zod.coerce.date(),
	likeCount: zod.number().int().min(0),
	likedByMe: zod.boolean(),
	commentCount: zod.number().int().min(0),
	/** The edition the author read, when they picked one. */
	readEdition: ReadEditionRefSchema.nullish(),
});

const FeedbackRatingStepSchema = FeedbackSchema.shape.rating.refine(
	isFeedbackRatingStep,
	{ message: "Rating must be in half-star steps from 0 to 5" },
);

export const FeedbackListSortBySchema = zod.enum(["createdAt", "rating"]);

export const FeedbackListSortDirectionSchema = zod.enum(["asc", "desc"]);

export const GetBookFeedbackListInputSchema = zod.object({
	bookSlug: BookSchema.shape.slug,
	minRating: FeedbackRatingStepSchema.optional(),
	sortBy: FeedbackListSortBySchema.optional(),
	sortDirection: FeedbackListSortDirectionSchema.optional(),
});

export const GetBookFeedbackListOutputSchema = zod.array(
	BookFeedbackReviewSchema,
);

export type GetBookFeedbackListOutput = z.infer<
	typeof GetBookFeedbackListOutputSchema
>;

export const GetBookFeedbackStateInputSchema = BookSchema.shape.slug;

export const GetBookFeedbackStateOutputSchema = zod.object({
	canSubmit: zod.boolean(),
	myFeedback: zod
		.object({
			slug: FeedbackSchema.shape.slug,
			rating: FeedbackSchema.shape.rating,
			review: FeedbackSchema.shape.review,
			isSpoiler: FeedbackSchema.shape.isSpoiler,
			createdAt: zod.coerce.date(),
		})
		.nullable(),
	hint: zod.string().nullable(),
});

export type GetBookFeedbackStateOutput = z.infer<
	typeof GetBookFeedbackStateOutputSchema
>;

export const CreateFeedbackInputSchema = zod.object({
	bookSlug: BookSchema.shape.slug,
	rating: FeedbackRatingStepSchema,
	review: zod.string(),
	isSpoiler: FeedbackSchema.shape.isSpoiler.optional(),
});

export const CreateFeedbackOutputSchema = zod.object({
	slug: FeedbackSchema.shape.slug,
	xpAwarded: zod.number().int().min(0),
});

export type CreateFeedbackInput = z.infer<typeof CreateFeedbackInputSchema>;
export type CreateFeedbackOutput = z.infer<typeof CreateFeedbackOutputSchema>;

export const DeleteFeedbackInputSchema = BookSchema.shape.slug;

export const DeleteFeedbackOutputSchema = zod.object({
	deleted: zod.literal(true),
});

export type DeleteFeedbackInput = z.infer<typeof DeleteFeedbackInputSchema>;
export type DeleteFeedbackOutput = z.infer<typeof DeleteFeedbackOutputSchema>;

export const UpdateFeedbackInputSchema = CreateFeedbackInputSchema;

export const UpdateFeedbackOutputSchema = zod.object({
	slug: FeedbackSchema.shape.slug,
});

export type UpdateFeedbackInput = z.infer<typeof UpdateFeedbackInputSchema>;
export type UpdateFeedbackOutput = z.infer<typeof UpdateFeedbackOutputSchema>;

export const UserFeedbackBookSchema = BookSchema.pick({
	slug: true,
	title: true,
	authors: true,
	coverId: true,
});

export const UserFeedbackListItemSchema = zod.object({
	slug: FeedbackSchema.shape.slug,
	rating: FeedbackSchema.shape.rating,
	review: FeedbackSchema.shape.review,
	isSpoiler: FeedbackSchema.shape.isSpoiler,
	createdAt: zod.coerce.date(),
	likeCount: zod.number().int().min(0),
	commentCount: zod.number().int().min(0),
	book: UserFeedbackBookSchema,
	readEdition: ReadEditionRefSchema.nullish(),
});

export const GetUserFeedbackListInputSchema = userFeedbackFiltersSchema
	.extend(CursorPaginationInputSchema.shape)
	.extend({ username: UserSchema.shape.username })
	.extend(userFeedbackListSorting.inputSchema.shape)
	.extend(userFeedbackListRanging.inputSchema.shape)
	.extend(userFeedbackListSearching.inputSchema.shape)
	.superRefine((value, ctx) => {
		refineRangingBounds(
			{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
			ctx,
		);

		if (
			value.minRating != null &&
			value.maxRating != null &&
			value.maxRating < value.minRating
		) {
			ctx.addIssue({
				code: "custom",
				message: "Maximum rating must be at least the minimum",
				path: ["maxRating"],
			});
		}
	});

export const GetUserFeedbackListOutputSchema = CursorPaginationOutputSchema(
	UserFeedbackListItemSchema,
).extend({
	metadata: CursorPaginationMetadataSchema.extend({
		/** Matching reviews across all pages; only sent with the first page. */
		total: zod.number().int().min(0).optional(),
	}),
});

export type GetUserFeedbackListInput = z.infer<
	typeof GetUserFeedbackListInputSchema
>;
export type GetUserFeedbackListOutput = z.infer<
	typeof GetUserFeedbackListOutputSchema
>;

export const getUserFeedbackListFields = {
	id: true,
	bookId: true,
	slug: true,
	rating: true,
	review: true,
	isSpoiler: true,
	createdAt: true,
	_count: { select: { likes: true, comments: true } },
	book: {
		select: {
			slug: true,
			title: true,
			authors: true,
			coverId: true,
		},
	},
} as const;

/** GET BY SLUG (permalink page). */
export const GetFeedbackBySlugInputSchema = FeedbackSchema.shape.slug;

export const GetFeedbackBySlugOutputSchema = FeedbackSchema.pick({
	slug: true,
	review: true,
	isSpoiler: true,
	rating: true,
	createdAt: true,
}).extend({
	bookSlug: BookSchema.shape.slug,
	bookTitle: BookSchema.shape.title,
	author: PostAuthorSchema,
	likeCount: zod.number().int().min(0),
	likedByMe: zod.boolean(),
	commentCount: zod.number().int().min(0),
	sittingSlug: BookSchema.shape.slug.nullable(),
	readEdition: ReadEditionRefSchema.nullish(),
});

export type GetFeedbackBySlugInput = z.infer<
	typeof GetFeedbackBySlugInputSchema
>;
export type GetFeedbackBySlugOutput = z.infer<
	typeof GetFeedbackBySlugOutputSchema
>;

export const getFeedbackBySlugFields = {
	id: true,
	slug: true,
	review: true,
	isSpoiler: true,
	rating: true,
	createdAt: true,
	authorId: true,
	bookId: true,
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
		},
	},
	_count: {
		select: {
			likes: true,
			comments: true,
		},
	},
} as const;
