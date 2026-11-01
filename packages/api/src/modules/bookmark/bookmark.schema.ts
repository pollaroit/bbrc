import {
	BookmarkResourceTypeSchema,
	BookmarkSchema,
	BookSchema,
	CommentSchema,
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	FeedbackSchema,
	PostSchema,
} from "@bbrc/schemas";
import type { z } from "zod";
import zod from "zod";
import { CommentListItemSchema } from "../comment/comment.schema";
import {
	PostAuthorSchema,
	PostListItemSchema,
	postAuthorFields,
} from "../post/post.schema";
import {
	bookmarkListFiltersSchema,
	bookmarkListSorting,
} from "./bookmark.listing";

function refineBookmarkTarget(
	value: { postSlug?: string; commentSlug?: string },
	ctx: zod.RefinementCtx,
	pathPrefix: (string | number)[] = [],
): void {
	const targets = [
		value.postSlug != null && value.postSlug !== "",
		value.commentSlug != null && value.commentSlug !== "",
	].filter(Boolean);

	if (targets.length !== 1) {
		ctx.addIssue({
			code: "custom",
			message: "Provide exactly one of postSlug or commentSlug",
			path: [...pathPrefix, "postSlug"],
		});
	}
}

export const BookmarkListItemSchema = zod.object({
	user: PostAuthorSchema,
	bookmarkedAt: BookmarkSchema.shape.createdAt,
});

export const GetBookmarkListInputSchema = CursorPaginationInputSchema.extend(
	bookmarkListSorting.inputSchema.shape,
)
	.extend({
		postSlug: PostSchema.shape.slug.optional(),
		commentSlug: CommentSchema.shape.slug.optional(),
	})
	.superRefine((value, ctx) => {
		refineBookmarkTarget(value, ctx);
	});

export const GetBookmarkListOutputSchema = CursorPaginationOutputSchema(
	BookmarkListItemSchema,
);

export const SavedBookmarkCommentSchema = CommentListItemSchema.extend({
	postSlug: PostSchema.shape.slug.nullable(),
	bookSlug: BookSchema.shape.slug.nullable(),
	feedbackSlug: FeedbackSchema.shape.slug.nullable(),
	postAllowBookmarks: zod.boolean(),
});

export const SavedBookmarkItemSchema = zod.object({
	id: BookmarkSchema.shape.id,
	bookmarkedAt: BookmarkSchema.shape.createdAt,
	resourceCreatedAt: BookmarkSchema.shape.resourceCreatedAt,
	kind: BookmarkResourceTypeSchema,
	unavailable: zod.boolean().optional(),
	post: PostListItemSchema.optional(),
	comment: SavedBookmarkCommentSchema.optional(),
});

export const ListSavedBookmarksInputSchema = bookmarkListFiltersSchema
	.extend(CursorPaginationInputSchema.shape)
	.extend(bookmarkListSorting.inputSchema.shape);

export const ListSavedBookmarksOutputSchema = CursorPaginationOutputSchema(
	SavedBookmarkItemSchema,
);

export const ToggleBookmarkInputSchema = zod
	.object({
		postSlug: PostSchema.shape.slug.optional(),
		commentSlug: CommentSchema.shape.slug.optional(),
	})
	.superRefine((value, ctx) => refineBookmarkTarget(value, ctx));

export const SetBookmarkInputSchema = ToggleBookmarkInputSchema.extend({
	bookmarked: zod.boolean(),
});

export const ToggleBookmarkOutputSchema = zod.object({
	bookmarked: zod.boolean(),
	bookmarkCount: zod.number().int().min(0),
});

export const GetViewerBookmarksInputSchema = zod.object({
	postSlugs: zod.array(PostSchema.shape.slug).max(200).default([]),
	commentSlugs: zod.array(CommentSchema.shape.slug).max(200).default([]),
});

export const GetViewerBookmarksOutputSchema = zod.object({
	postSlugs: zod.array(PostSchema.shape.slug),
	commentSlugs: zod.array(CommentSchema.shape.slug),
});

export const GetBookmarkCountsInputSchema = zod.object({
	postSlugs: zod.array(PostSchema.shape.slug).max(200).default([]),
	commentSlugs: zod.array(CommentSchema.shape.slug).max(200).default([]),
});

export const GetBookmarkCountsOutputSchema = zod.object({
	posts: zod.record(PostSchema.shape.slug, zod.number().int().min(0)),
	comments: zod.record(CommentSchema.shape.slug, zod.number().int().min(0)),
});

export type GetBookmarkListInput = z.infer<typeof GetBookmarkListInputSchema>;
export type GetBookmarkListOutput = z.infer<typeof GetBookmarkListOutputSchema>;
export type ListSavedBookmarksInput = z.infer<
	typeof ListSavedBookmarksInputSchema
>;
export type ListSavedBookmarksOutput = z.infer<
	typeof ListSavedBookmarksOutputSchema
>;
export type ToggleBookmarkInput = z.infer<typeof ToggleBookmarkInputSchema>;
export type SetBookmarkInput = z.infer<typeof SetBookmarkInputSchema>;
export type ToggleBookmarkOutput = z.infer<typeof ToggleBookmarkOutputSchema>;
export type GetViewerBookmarksInput = z.infer<
	typeof GetViewerBookmarksInputSchema
>;
export type GetViewerBookmarksOutput = z.infer<
	typeof GetViewerBookmarksOutputSchema
>;
export type GetBookmarkCountsInput = z.infer<
	typeof GetBookmarkCountsInputSchema
>;
export type GetBookmarkCountsOutput = z.infer<
	typeof GetBookmarkCountsOutputSchema
>;

export const bookmarkListSelect = {
	id: true,
	createdAt: true,
	user: { select: postAuthorFields },
} as const;
