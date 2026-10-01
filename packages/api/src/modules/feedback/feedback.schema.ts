import {
	BookSchema,
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	FeedbackSchema,
	UserSchema,
} from "@bbrc/schemas";
import type { z } from "zod";
import zod from "zod";

export const BookFeedbackReviewSchema = zod.object({
	authorId: UserSchema.shape.id,
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: UserSchema.shape.image,
	rating: FeedbackSchema.shape.rating,
	review: FeedbackSchema.shape.review,
	createdAt: zod.coerce.date(),
});

export const GetBookFeedbackListInputSchema = BookSchema.shape.slug;

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
	rating: FeedbackSchema.shape.rating,
	review: FeedbackSchema.shape.review,
});

export const CreateFeedbackOutputSchema = zod.object({
	id: FeedbackSchema.shape.id,
	xpAwarded: zod.number().int().min(0),
});

export type CreateFeedbackInput = z.infer<typeof CreateFeedbackInputSchema>;
export type CreateFeedbackOutput = z.infer<typeof CreateFeedbackOutputSchema>;

export const UserFeedbackBookSchema = BookSchema.pick({
	slug: true,
	title: true,
	authors: true,
	coverId: true,
});

export const UserFeedbackListItemSchema = zod.object({
	id: FeedbackSchema.shape.id,
	rating: FeedbackSchema.shape.rating,
	review: FeedbackSchema.shape.review,
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
	rating: true,
	review: true,
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
