import {
	CommentSchema,
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	LikeSchema,
	LikeSourceSchema,
	PostSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import type { z } from "zod";
import zod from "zod";
import { PostAuthorSchema, postAuthorFields } from "../post/post.schema";
import {
	likeListFiltersSchema,
	likeListRanging,
	likeListSearching,
	likeListSorting,
} from "./like.listing";

export {
	likeListFiltersSchema,
	likeListRanging,
	likeListSearching,
	likeListSorting,
	likeListTargetWhere,
	likeOnCommentWhere,
	likeOnPostWhere,
	likeRangeableFields,
	likeSearchableFields,
	likeSortableFields,
} from "./like.listing";

function refineLikeTarget(
	value: { postSlug?: string; commentSlug?: string },
	ctx: zod.RefinementCtx,
	pathPrefix: (string | number)[] = [],
): void {
	const hasPost = value.postSlug != null && value.postSlug !== "";
	const hasComment = value.commentSlug != null && value.commentSlug !== "";

	if (hasPost && hasComment) {
		ctx.addIssue({
			code: "custom",
			message: "Provide either postSlug or commentSlug, not both",
			path: [...pathPrefix, "commentSlug"],
		});
		return;
	}

	if (!hasPost && !hasComment) {
		ctx.addIssue({
			code: "custom",
			message: "Provide postSlug or commentSlug",
			path: [...pathPrefix, "postSlug"],
		});
	}
}

/** Member who liked a post or comment (likers dialog). */
export const LikeListItemSchema = zod.object({
	user: PostAuthorSchema,
	likedAt: LikeSchema.shape.createdAt,
});

/** LIST — likers for one post or one comment. */
export const GetLikeListInputSchema = likeListFiltersSchema
	.extend(CursorPaginationInputSchema.shape)
	.extend(likeListSorting.inputSchema.shape)
	.extend(likeListRanging.inputSchema.shape)
	.extend(likeListSearching.inputSchema.shape)
	.superRefine((value, ctx) => {
		refineRangingBounds(
			{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
			ctx,
		);
		refineLikeTarget(value, ctx);
	});

export const getLikeListFields = {
	createdAt: true,
	user: {
		select: postAuthorFields,
	},
} as const;

export const GetLikeListOutputSchema =
	CursorPaginationOutputSchema(LikeListItemSchema);

export type GetLikeListInput = z.infer<typeof GetLikeListInputSchema>;
export type GetLikeListOutput = z.infer<typeof GetLikeListOutputSchema>;

/** TOGGLE — like or unlike a post or comment. */
export const ToggleLikeInputSchema = zod
	.object({
		postSlug: PostSchema.shape.slug.optional(),
		commentSlug: CommentSchema.shape.slug.optional(),
	})
	.superRefine((value, ctx) => {
		refineLikeTarget(value, ctx);
	});

export const ToggleLikeOutputSchema = zod.object({
	source: LikeSourceSchema,
	liked: zod.boolean(),
	likeCount: zod.number().int().min(0),
});

export type ToggleLikeInput = z.infer<typeof ToggleLikeInputSchema>;
export type ToggleLikeOutput = z.infer<typeof ToggleLikeOutputSchema>;

/** Prisma select when resolving a user's existing like row. */
export const getLikeLookupFields = {
	id: true,
	source: true,
	userId: true,
	postId: true,
	commentId: true,
} as const;

export const getLikeCountFields = {
	_count: {
		select: {
			likes: true,
		},
	},
} as const;
