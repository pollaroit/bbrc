import type { Prisma } from "@bbrc/db";
import { FeedbackSchema, PostSchema, UserSchema } from "@bbrc/schemas";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const commentSortableFields = [
	"createdAt",
	"updatedAt",
	"editedAt",
	"likes._count",
] as const;

export const commentListSorting = defineSorting<
	typeof commentSortableFields,
	Prisma.CommentOrderByWithRelationInput
>(commentSortableFields, "createdAt", "desc", {
	orderBy: {
		"likes._count": (direction) => ({
			likes: { _count: direction },
		}),
	},
});

export const commentRangeableFields = [
	"createdAt",
	"updatedAt",
	"editedAt",
] as const;

export const commentListRanging = defineRanging<
	typeof commentRangeableFields,
	Prisma.CommentWhereInput
>(commentRangeableFields, "createdAt");

export const commentSearchableFields = [
	"content",
	"slug",
	"author.username",
] as const;

export const commentListSearching = defineSearching<
	typeof commentSearchableFields,
	Prisma.CommentWhereInput
>(commentSearchableFields, {
	where: {
		"author.username": (query) => ({
			author: {
				username: { contains: query, mode: "insensitive" },
			},
		}),
	},
});

export function refineCommentTarget(
	value: { postSlug?: string; feedbackSlug?: string },
	ctx: z.RefinementCtx,
): void {
	const hasPost = value.postSlug != null && value.postSlug !== "";
	const hasFeedback = value.feedbackSlug != null && value.feedbackSlug !== "";

	if (hasPost && hasFeedback) {
		ctx.addIssue({
			code: "custom",
			message: "Provide either postSlug or feedbackSlug, not both",
			path: ["feedbackSlug"],
		});
		return;
	}

	if (!hasPost && !hasFeedback) {
		ctx.addIssue({
			code: "custom",
			message: "Provide postSlug or feedbackSlug",
			path: ["postSlug"],
		});
	}
}

export const commentListFiltersSchema = z
	.object({
		postSlug: PostSchema.shape.slug.optional(),
		feedbackSlug: FeedbackSchema.shape.slug.optional(),
		authorUsername: UserSchema.shape.username,
	})
	.partial()
	.superRefine((value, ctx) => {
		refineCommentTarget(value, ctx);
	});

export function commentPostSlugWhere(
	postSlug: string,
): Prisma.CommentWhereInput {
	return {
		post: { slug: postSlug },
	};
}

export function commentFeedbackSlugWhere(
	feedbackSlug: string,
): Prisma.CommentWhereInput {
	return {
		feedback: { slug: feedbackSlug },
	};
}

export function commentAuthorUsernameWhere(
	username: string,
): Prisma.CommentWhereInput {
	return {
		author: { username },
	};
}
