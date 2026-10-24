import { CommentSchema, PostSchema } from "@bbrc/schemas";
import { ALLOWED_IMAGE_MIME_TYPES } from "@bbrc/storage";
import { z } from "zod";

export const ImageUploadBodySchema = z.object({
	contentType: z.enum(ALLOWED_IMAGE_MIME_TYPES),
	contentLength: z.number().int().positive(),
});

export const ImageUploadInitOutputSchema = z.object({
	key: z.string().min(1),
	publicUrl: z.string().url(),
	maxSize: z.number().int().positive(),
});

export const ImageCommitOutputSchema = z.object({
	publicUrl: z.string().url(),
});

export const PostSlugImageInputSchema = ImageUploadBodySchema.extend({
	postSlug: PostSchema.shape.slug,
});

export const CommentSlugImageInputSchema = ImageUploadBodySchema.extend({
	commentSlug: CommentSchema.shape.slug,
});

export const ShelfSlugImageInputSchema = ImageUploadBodySchema.extend({
	/** Owner of the shelf when the member is a collaborator rather than the owner. */
	ownerUsername: z.string().min(3).max(20).optional(),
	shelfSlug: z.string().min(3).max(60),
});

export const PostSlugOnlySchema = z.object({
	postSlug: PostSchema.shape.slug,
});

export const CommentSlugOnlySchema = z.object({
	commentSlug: CommentSchema.shape.slug,
});

export const ShelfSlugOnlySchema = z.object({
	ownerUsername: z.string().min(3).max(20).optional(),
	shelfSlug: z.string().min(3).max(60),
});
