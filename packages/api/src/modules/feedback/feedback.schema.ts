import {
	BookSchema,
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	FeedbackSchema,
	UserSchema,
} from "@bbrc/schemas";
import { isFeedbackRatingStep } from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";
import { PostAuthorSchema } from "../post/post.schema";

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
});

const FeedbackRatingStepSchema = FeedbackSchema.shape.rating.refine(
	isFeedbackRatingStep,
	{ message: "Rating must be in half-star steps from 0 to 5" },
);

export const GetBookFeedbackListInputSchema = zod.object({
	bookSlug: BookSchema.shape.slug,
	minRating: FeedbackRatingStepSchema.optional(),
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
	review: FeedbackSchema.shape.review,
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
	book: UserFeedbackBookSchema,
});

export const GetUserFeedbackListInputSchema =
	CursorPaginationInputSchema.extend({
		username: UserSchema.shape.username,
	});

export const GetUserFeedbackListOutputSchema = CursorPaginationOutputSchema(
	UserFeedbackListItemSchema,
);

export type GetUserFeedbackListInput = z.infer<
	typeof GetUserFeedbackListInputSchema
>;
export type GetUserFeedbackListOutput = z.infer<
	typeof GetUserFeedbackListOutputSchema
>;

export const getUserFeedbackListFields = {
	id: true,
	slug: true,
	rating: true,
	review: true,
	isSpoiler: true,
	createdAt: true,
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
