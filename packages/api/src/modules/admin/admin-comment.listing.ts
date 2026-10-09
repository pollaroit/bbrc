import type { Prisma } from "@bbrc/db";
import { FeedbackSchema, PostSchema, UserSchema } from "@bbrc/schemas";
import z from "zod";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";
import {
	commentListRanging,
	commentSortableFields,
} from "../comment/comment.listing";

export const adminCommentContextValues = ["post", "feedback"] as const;

export const adminCommentSortableFields = [
	...commentSortableFields,
	"replies._count",
] as const;

export const adminCommentListSorting = defineSorting<
	typeof adminCommentSortableFields,
	Prisma.CommentOrderByWithRelationInput
>(adminCommentSortableFields, "createdAt", "desc", {
	orderBy: {
		"likes._count": (direction) => ({
			likes: { _count: direction },
		}),
		"replies._count": (direction) => ({
			replies: { _count: direction },
		}),
	},
});

export { commentListRanging as adminCommentListRanging };

export const adminCommentSearchableFields = [
	"content",
	"slug",
	"author.username",
	"post.slug",
	"feedback.slug",
] as const;

export const adminCommentListSearching = defineSearching<
	typeof adminCommentSearchableFields,
	Prisma.CommentWhereInput
>(adminCommentSearchableFields, {
	where: {
		"author.username": (query) => ({
			author: { username: { contains: query, mode: "insensitive" } },
		}),
		"post.slug": (query) => ({
			post: { slug: { contains: query, mode: "insensitive" } },
		}),
		"feedback.slug": (query) => ({
			feedback: { slug: { contains: query, mode: "insensitive" } },
		}),
	},
});

export const adminCommentListFiltersSchema = z
	.object({
		authorUsername: UserSchema.shape.username,
		contexts: z.array(z.enum(adminCommentContextValues)),
		postSlugs: z.array(PostSchema.shape.slug),
		feedbackSlugs: z.array(FeedbackSchema.shape.slug),
		authorUsernames: z.array(UserSchema.shape.username),
		isReply: z.boolean(),
		depths: z.array(z.number().int().min(0).max(4)),
		hasImage: z.boolean(),
		wasEdited: z.boolean(),
		minLikes: z.number().int().min(0),
		minReplies: z.number().int().min(0),
		minContentLength: z.number().int().min(1),
	})
	.partial();

export type AdminCommentListFilters = z.infer<
	typeof adminCommentListFiltersSchema
>;

export function adminCommentContextWhere(
	contexts: (typeof adminCommentContextValues)[number][],
): Prisma.CommentWhereInput | undefined {
	if (contexts.length === 0) {
		return undefined;
	}
	const parts: Prisma.CommentWhereInput[] = [];
	if (contexts.includes("post")) {
		parts.push({ postId: { not: null } });
	}
	if (contexts.includes("feedback")) {
		parts.push({ feedbackId: { not: null } });
	}
	if (parts.length === 1) {
		return parts[0];
	}
	return { OR: parts };
}
