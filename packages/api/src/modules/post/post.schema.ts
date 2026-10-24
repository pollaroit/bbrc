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
import {
	CreatePollInputSchema,
	PostPollViewSchema,
} from "../post-poll/post-poll.schema";
import {
	postListFiltersSchema,
	postListRanging,
	postListSearching,
	postListSorting,
} from "./post.listing";
import {
	PostAttachmentInputSchema,
	PostAttachmentOutputSchema,
	postAttachedBookCardFields,
	postAttachmentSelect,
} from "./post-attachment.schema";

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

/** @deprecated Use `postAttachedBookCardFields` / book attachment card. */
export const postAttachedBookFields = postAttachedBookCardFields;

/** @deprecated Use `PostAttachmentOutput` book variant. */
export const PostAttachedBookSchema = BookSchema.pick(
	postAttachedBookCardFields,
);

/** Short comment row shown under a post on the home feed. */
export const PostCommentPreviewSchema = zod.object({
	slug: CommentSchema.shape.slug,
	content: CommentSchema.shape.content,
	imageUrl: CommentSchema.shape.imageUrl,
	isSpoiler: CommentSchema.shape.isSpoiler,
	createdAt: zod.coerce.date(),
	author: PostAuthorSchema,
	likeCount: zod.number().int().min(0),
	likedByMe: zod.boolean(),
});

export const PostListItemSchema = PostSchema.pick({
	slug: true,
	content: true,
	imageUrl: true,
	isSpoiler: true,
	createdAt: true,
	editedAt: true,
	allowLikes: true,
	allowComments: true,
	allowShares: true,
}).extend({
	author: PostAuthorSchema,
	attachment: PostAttachmentOutputSchema.nullable(),
	poll: PostPollViewSchema.nullable(),
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
	imageUrl: true,
	isSpoiler: true,
	allowLikes: true,
	allowComments: true,
	allowShares: true,
	createdAt: true,
	editedAt: true,
	author: {
		select: postAuthorFields,
	},
	attachedBook: {
		select: postAttachedBookCardFields,
	},
	attachment: {
		select: postAttachmentSelect,
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
})
	.extend({
		isSpoiler: PostSchema.shape.isSpoiler.optional(),
		allowLikes: PostSchema.shape.allowLikes.optional(),
		allowComments: PostSchema.shape.allowComments.optional(),
		allowShares: PostSchema.shape.allowShares.optional(),
		attachedBookSlug: BookSchema.shape.slug.optional(),
	})
	.extend({
		attachment: PostAttachmentInputSchema.optional(),
		/** A poll replaces every other attachment and the image. */
		poll: CreatePollInputSchema.optional(),
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
	attachment: PostAttachmentOutputSchema.nullable(),
	poll: PostPollViewSchema.nullable(),
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
	isSpoiler: true,
	allowLikes: true,
	allowComments: true,
	allowShares: true,
})
	.partial({
		content: true,
		isSpoiler: true,
		allowLikes: true,
		allowComments: true,
		allowShares: true,
	})
	.extend({
		/** Omit to leave unchanged; pass `null` to detach the book. */
		attachedBookSlug: BookSchema.shape.slug.nullish(),
		attachment: PostAttachmentInputSchema.nullish(),
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

/** PREVIEW ATTACHMENT (compose / share-in-post) */
export const PreviewPostAttachmentInputSchema = PostAttachmentInputSchema;
export const PreviewPostAttachmentOutputSchema = PostAttachmentOutputSchema;

export type PreviewPostAttachmentInput = z.infer<
	typeof PreviewPostAttachmentInputSchema
>;
export type PreviewPostAttachmentOutput = z.infer<
	typeof PreviewPostAttachmentOutputSchema
>;

/** Prisma select for slug lookups (author checks, edits). */
export const getPostBySlugFields = {
	id: true,
	slug: true,
	content: true,
	imageUrl: true,
	isSpoiler: true,
	allowLikes: true,
	allowComments: true,
	allowShares: true,
	createdAt: true,
	updatedAt: true,
	editedAt: true,
	authorId: true,
	attachedBookId: true,
	author: {
		select: postAuthorFields,
	},
	attachedBook: {
		select: postAttachedBookCardFields,
	},
	attachment: {
		select: postAttachmentSelect,
	},
} as const;
