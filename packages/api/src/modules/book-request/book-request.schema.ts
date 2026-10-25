import { isOpenLibraryOlid } from "@bbrc/shared";
import { z } from "zod";

export const CreateBookRequestInputSchema = z.object({
	olid: z
		.string()
		.trim()
		.refine((value) => isOpenLibraryOlid(value), {
			message: "Invalid Open Library work ID",
		})
		.transform((value) => value.toUpperCase()),
	title: z
		.string()
		.trim()
		.min(1, "Title is required")
		.max(500, "Title must be at most 500 characters"),
	authors: z
		.array(z.string().trim().min(1))
		.max(20, "At most 20 authors")
		.default([]),
	/** Why the member wants it (shown to admins). */
	note: z
		.string()
		.trim()
		.max(200, "Note must be at most 200 characters")
		.optional(),
});

export const CreateBookRequestOutputSchema = z.object({
	id: z.string().uuid(),
});

export type CreateBookRequestInput = z.infer<
	typeof CreateBookRequestInputSchema
>;
export type CreateBookRequestOutput = z.infer<
	typeof CreateBookRequestOutputSchema
>;

const PendingBookRequestItemSchema = z.object({
	id: z.string().uuid(),
	olid: z.string(),
	title: z.string(),
	authors: z.array(z.string()),
	createdAt: z.coerce.date(),
	note: z.string().nullable(),
	/** Members who said "me too" (the requester not included). */
	upvoteCount: z.number().int().nonnegative(),
	requester: z.object({
		username: z.string(),
		name: z.string().nullable(),
	}),
});

export const ListPendingBookRequestsOutputSchema = z.object({
	count: z.number().int().nonnegative(),
	items: z.array(PendingBookRequestItemSchema),
});

export type ListPendingBookRequestsOutput = z.infer<
	typeof ListPendingBookRequestsOutputSchema
>;

export const BookRequestStatusSchema = z.enum([
	"pending",
	"accepted",
	"rejected",
]);

export const MyBookRequestItemSchema = z.object({
	id: z.string().uuid(),
	olid: z.string(),
	title: z.string(),
	authors: z.array(z.string()),
	status: BookRequestStatusSchema,
	createdAt: z.coerce.date(),
	acceptanceNotes: z.string().nullable(),
	rejectionReason: z.string().nullable(),
	bookSlug: z.string().nullable(),
	note: z.string().nullable(),
	upvoteCount: z.number().int().nonnegative(),
});

export const ListMyBookRequestsOutputSchema = z.object({
	count: z.number().int().nonnegative(),
	items: z.array(MyBookRequestItemSchema),
});

export type ListMyBookRequestsOutput = z.infer<
	typeof ListMyBookRequestsOutputSchema
>;

export const RejectBookRequestInputSchema = z.object({
	id: z.string().uuid(),
	rejectionReason: z
		.string()
		.trim()
		.min(1, "Rejection reason is required")
		.max(200, "Rejection reason must be at most 200 characters long"),
});

export const RejectBookRequestOutputSchema = z.object({
	id: z.string().uuid(),
});

export type RejectBookRequestInput = z.infer<
	typeof RejectBookRequestInputSchema
>;
export type RejectBookRequestOutput = z.infer<
	typeof RejectBookRequestOutputSchema
>;

/** What every member sees: the open requests, ranked by "me too". */
export const OpenBookRequestItemSchema = PendingBookRequestItemSchema.extend({
	viewerUpvoted: z.boolean(),
	isMine: z.boolean(),
});

export const ListOpenBookRequestsOutputSchema = z.object({
	count: z.number().int().nonnegative(),
	items: z.array(OpenBookRequestItemSchema),
});

export const UpvoteBookRequestInputSchema = z.object({
	id: z.string().uuid(),
	upvoted: z.boolean(),
});

export const UpvoteBookRequestOutputSchema = z.object({
	id: z.string().uuid(),
	upvoted: z.boolean(),
	upvoteCount: z.number().int().nonnegative(),
});

export type ListOpenBookRequestsOutput = z.infer<
	typeof ListOpenBookRequestsOutputSchema
>;
export type UpvoteBookRequestInput = z.infer<
	typeof UpvoteBookRequestInputSchema
>;
export type UpvoteBookRequestOutput = z.infer<
	typeof UpvoteBookRequestOutputSchema
>;
