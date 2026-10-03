import { isSlug } from "@bbrc/shared";
import {
	ALLOWED_DOCUMENT_MIME_TYPES,
	ALLOWED_IMAGE_MIME_TYPES,
	MAX_DOCUMENT_SIZE,
	MAX_IMAGE_SIZE,
} from "@bbrc/storage";
import { z } from "zod";

const imageMimeSchema = z.enum(ALLOWED_IMAGE_MIME_TYPES);
const documentMimeSchema = z.enum(ALLOWED_DOCUMENT_MIME_TYPES);

const contentLengthSchema = z.number().int().positive();

const slugSchema = z.string().refine(isSlug, "Invalid slug");

export const InitUploadInputSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("avatar"),
		contentType: imageMimeSchema,
		contentLength: contentLengthSchema.max(MAX_IMAGE_SIZE),
	}),
	z.object({
		kind: z.literal("post-image"),
		postSlug: slugSchema,
		contentType: imageMimeSchema,
		contentLength: contentLengthSchema.max(MAX_IMAGE_SIZE),
	}),
	z.object({
		kind: z.literal("comment-image"),
		commentSlug: slugSchema,
		contentType: imageMimeSchema,
		contentLength: contentLengthSchema.max(MAX_IMAGE_SIZE),
	}),
	z.object({
		kind: z.literal("shelf-cover"),
		shelfSlug: slugSchema,
		contentType: imageMimeSchema,
		contentLength: contentLengthSchema.max(MAX_IMAGE_SIZE),
	}),
	z.object({
		kind: z.literal("book-document"),
		bookSlug: slugSchema,
		documentSlug: slugSchema,
		contentType: documentMimeSchema,
		contentLength: contentLengthSchema.max(MAX_DOCUMENT_SIZE),
	}),
]);

export type InitUploadInput = z.infer<typeof InitUploadInputSchema>;

export const InitUploadOutputSchema = z.object({
	key: z.string().min(1),
	publicUrl: z.string().url(),
	maxSize: z.number().int().positive(),
});

export const CommitUploadInputSchema = z.object({
	key: z.string().min(1),
	contentType: z.union([imageMimeSchema, documentMimeSchema]),
	contentLength: contentLengthSchema,
});

export type CommitUploadInput = z.infer<typeof CommitUploadInputSchema>;

export const CommitUploadOutputSchema = z.object({
	key: z.string().min(1),
	publicUrl: z.string().url(),
	contentLength: z.number().int().positive(),
	contentType: z.string().optional(),
});
