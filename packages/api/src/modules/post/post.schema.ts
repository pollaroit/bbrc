import {
	BookSchema,
	CommentSchema,
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	PostSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import type { z } from "zod";
import zod from "zod";
import type { getBookListFields } from "../book/book.schema";
import {
	postListFiltersSchema,
	postListRanging,
	postListSearching,
	postListSorting,
} from "./post.listing";

export {
	postAttachedBookWhere,
	postAuthorUsernameWhere,
	postListFiltersSchema,
	postListRanging,
	postListSearching,
	postListSorting,
	postRangeableFields,
	postSearchableFields,
	postSortableFields,
} from "./post.listing";

/** Author embed on posts and comment previews. */
export const postAuthorFields = {
	username: true,
	name: true,
	image: true,
} as const;

export const PostAuthorSchema = UserSchema.pick(postAuthorFields);

/** Book card when a post references library catalog. */
export const postAttachedBookFields = {
	slug: true,
	title: true,
	authors: true,
	coverId: true,
} as const satisfies {
	[K in keyof typeof getBookListFields]?: true;
};

export const PostAttachedBookSchema = BookSchema.pick(postAttachedBookFields);

/** Short comment row shown under a post on the home feed. */
export const PostCommentPreviewSchema = zod.object({
	slug: CommentSchema.shape.slug,
	content: CommentSchema.shape.content,
	createdAt: zod.coerce.date(),
	author: PostAuthorSchema,
	likeCount: zod.number().int().min(0),
	likedByMe: zod.boolean(),
});

export const PostListItemSchema = PostSchema.pick({
	slug: true,
	content: true,
	createdAt: true,
	editedAt: true,
}).extend({
	author: PostAuthorSchema,
	attachedBook: PostAttachedBookSchema.nullable(),
	likeCount: zod.number().int().min(0),
	commentCount: zod.number().int().min(0),
	likedByMe: zod.boolean(),
	topComments: zod.array(PostCommentPreviewSchema).max(3),
});

/** LIST — composed as a concrete ZodObject so oRPC clients get input autocomplete. */
export const GetPostListInputSchema = postListFiltersSchema
	.extend(CursorPaginationInputSchema.shape)
	.extend(postListSorting.inputSchema.shape)
	.extend(postListRanging.inputSchema.shape)
	.extend(postListSearching.inputSchema.shape)
	.superRefine((value, ctx) => {
		refineRangingBounds(
			{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
			ctx,
		);
	});

export const getPostListFields = {
	slug: true,
	content: true,
	createdAt: true,
	editedAt: true,
	author: {
		select: postAuthorFields,
	},
	attachedBook: {
		select: postAttachedBookFields,
	},
	_count: {
		select: {
			likes: true,
			comments: true,
		},
	},
} as const;

export const GetPostListOutputSchema =
	CursorPaginationOutputSchema(PostListItemSchema);

export type GetPostListInput = z.infer<typeof GetPostListInputSchema>;
export type GetPostListOutput = z.infer<typeof GetPostListOutputSchema>;
export type PostListItem = z.infer<typeof PostListItemSchema>;

/** CREATE */
export const CreatePostInputSchema = PostSchema.pick({
	content: true,
}).extend({
	attachedBookSlug: BookSchema.shape.slug.optional(),
});

export const CreatePostOutputSchema = PostSchema.pick({
	slug: true,
}).extend({
	xpAwarded: zod.number().int().min(0),
});

export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;
export type CreatePostOutput = z.infer<typeof CreatePostOutputSchema>;

/** GET BY SLUG */
export const GetPostBySlugInputSchema = PostSchema.shape.slug;

export const GetPostBySlugOutputSchema = PostSchema.omit({
	id: true,
	authorId: true,
	attachedBookId: true,
	updatedAt: true,
}).extend({
	author: PostAuthorSchema,
	attachedBook: PostAttachedBookSchema.nullable(),
	likeCount: zod.number().int().min(0),
	commentCount: zod.number().int().min(0),
	likedByMe: zod.boolean(),
});

export type GetPostBySlugInput = z.infer<typeof GetPostBySlugInputSchema>;
export type GetPostBySlugOutput = z.infer<typeof GetPostBySlugOutputSchema>;

/** UPDATE */
export const UpdatePostInputSchema = PostSchema.pick({
	slug: true,
	content: true,
})
	.partial({ content: true })
	.extend({
		/** Omit to leave unchanged; pass `null` to detach the book. */
		attachedBookSlug: BookSchema.shape.slug.nullish(),
	})
	.required({ slug: true });

export const UpdatePostOutputSchema = PostSchema.pick({
	slug: true,
});

export type UpdatePostInput = z.infer<typeof UpdatePostInputSchema>;
export type UpdatePostOutput = z.infer<typeof UpdatePostOutputSchema>;

/** DELETE */
export const DeletePostInputSchema = PostSchema.pick({
	slug: true,
});

export const DeletePostOutputSchema = zod.object({
	slug: PostSchema.shape.slug,
	deleted: zod.literal(true),
});

export type DeletePostInput = z.infer<typeof DeletePostInputSchema>;
export type DeletePostOutput = z.infer<typeof DeletePostOutputSchema>;

/** Prisma select for slug lookups (author checks, edits). */
export const getPostBySlugFields = {
	id: true,
	slug: true,
	content: true,
	createdAt: true,
	updatedAt: true,
	editedAt: true,
	authorId: true,
	attachedBookId: true,
	author: {
		select: postAuthorFields,
	},
	attachedBook: {
		select: postAttachedBookFields,
	},
} as const;
