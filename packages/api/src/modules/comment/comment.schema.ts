import {
	CommentSchema,
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	PostSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import type { z } from "zod";
import zod from "zod";
import { PostAuthorSchema, postAuthorFields } from "../post/post.schema";
import {
	commentListFiltersSchema,
	commentListRanging,
	commentListSearching,
	commentListSorting,
} from "./comment.listing";

export {
	commentAuthorUsernameWhere,
	commentListFiltersSchema,
	commentListRanging,
	commentListSearching,
	commentListSorting,
	commentPostSlugWhere,
	commentRangeableFields,
	commentSearchableFields,
	commentSortableFields,
} from "./comment.listing";

export const CommentListItemSchema = CommentSchema.pick({
	slug: true,
	content: true,
	createdAt: true,
	editedAt: true,
	depth: true,
}).extend({
	parentSlug: CommentSchema.shape.slug.nullable(),
	author: PostAuthorSchema,
	likeCount: zod.number().int().min(0),
	likedByMe: zod.boolean(),
	replyCount: zod.number().int().min(0),
});

/** LIST — scoped to a single post (infinite scroll on post detail). */
export const GetCommentListInputSchema = commentListFiltersSchema
	.extend(CursorPaginationInputSchema.shape)
	.extend(commentListSorting.inputSchema.shape)
	.extend(commentListRanging.inputSchema.shape)
	.extend(commentListSearching.inputSchema.shape)
	.superRefine((value, ctx) => {
		refineRangingBounds(
			{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
			ctx,
		);
	});

export const getCommentListFields = {
	slug: true,
	content: true,
	createdAt: true,
	editedAt: true,
	depth: true,
	parent: {
		select: { slug: true },
	},
	author: {
		select: postAuthorFields,
	},
	_count: {
		select: {
			likes: true,
			replies: true,
		},
	},
} as const;

export const GetCommentListOutputSchema = CursorPaginationOutputSchema(
	CommentListItemSchema,
);

export type GetCommentListInput = z.infer<typeof GetCommentListInputSchema>;
export type GetCommentListOutput = z.infer<typeof GetCommentListOutputSchema>;
export type CommentListItem = z.infer<typeof CommentListItemSchema>;

/** CREATE */
export const CreateCommentInputSchema = zod.object({
	postSlug: PostSchema.shape.slug,
	content: CommentSchema.shape.content,
	parentSlug: CommentSchema.shape.slug.optional(),
});

export const CreateCommentOutputSchema = CommentSchema.pick({
	slug: true,
}).extend({
	xpAwarded: zod.number().int().min(0),
});

export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;
export type CreateCommentOutput = z.infer<typeof CreateCommentOutputSchema>;

/** GET BY SLUG */
export const GetCommentBySlugInputSchema = CommentSchema.shape.slug;

export const GetCommentBySlugOutputSchema = CommentSchema.omit({
	id: true,
	authorId: true,
	postId: true,
	parentId: true,
	updatedAt: true,
}).extend({
	postSlug: PostSchema.shape.slug,
	parentSlug: CommentSchema.shape.slug.nullable(),
	author: PostAuthorSchema,
	likeCount: zod.number().int().min(0),
	likedByMe: zod.boolean(),
	replyCount: zod.number().int().min(0),
});

export type GetCommentBySlugInput = z.infer<typeof GetCommentBySlugInputSchema>;
export type GetCommentBySlugOutput = z.infer<
	typeof GetCommentBySlugOutputSchema
>;

/** UPDATE */
export const UpdateCommentInputSchema = CommentSchema.pick({
	slug: true,
	content: true,
})
	.partial({ content: true })
	.required({ slug: true });

export const UpdateCommentOutputSchema = CommentSchema.pick({
	slug: true,
});

export type UpdateCommentInput = z.infer<typeof UpdateCommentInputSchema>;
export type UpdateCommentOutput = z.infer<typeof UpdateCommentOutputSchema>;

/** DELETE */
export const DeleteCommentInputSchema = CommentSchema.pick({
	slug: true,
});

export const DeleteCommentOutputSchema = zod.object({
	slug: CommentSchema.shape.slug,
	deleted: zod.literal(true),
});

export type DeleteCommentInput = z.infer<typeof DeleteCommentInputSchema>;
export type DeleteCommentOutput = z.infer<typeof DeleteCommentOutputSchema>;

/** Prisma select for slug lookups (author checks, edits). */
export const getCommentBySlugFields = {
	id: true,
	slug: true,
	content: true,
	createdAt: true,
	updatedAt: true,
	editedAt: true,
	depth: true,
	authorId: true,
	postId: true,
	parent: {
		select: { slug: true },
	},
	author: {
		select: postAuthorFields,
	},
	post: {
		select: {
			slug: true,
		},
	},
} as const;
