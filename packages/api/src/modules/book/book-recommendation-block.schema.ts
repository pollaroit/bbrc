import { isOpenLibraryOlid } from "@bbrc/shared";
import { z } from "zod";

export const BlockOpenLibraryWorkInputSchema = z.object({
	olid: z
		.string()
		.trim()
		.refine((value) => isOpenLibraryOlid(value), {
			message: "Invalid Open Library work ID",
		})
		.transform((value) => value.toUpperCase()),
	title: z.string().trim().max(255).optional(),
});

export const UnblockOpenLibraryWorkInputSchema = z.object({
	olid: z
		.string()
		.trim()
		.refine((value) => isOpenLibraryOlid(value), {
			message: "Invalid Open Library work ID",
		})
		.transform((value) => value.toUpperCase()),
});

export const BlockedOpenLibraryWorkItemSchema = z.object({
	olid: z.string(),
	title: z.string().nullable(),
	createdAt: z.coerce.date(),
	blockedBy: z.object({
		username: z.string(),
		name: z.string(),
	}),
});

export const ListBlockedOpenLibraryWorksOutputSchema = z.object({
	count: z.number().int().nonnegative(),
	items: z.array(BlockedOpenLibraryWorkItemSchema),
});

export const OpenLibraryOlidResultSchema = z.object({
	olid: z.string(),
});

export type BlockOpenLibraryWorkInput = z.infer<
	typeof BlockOpenLibraryWorkInputSchema
>;
export type ListBlockedOpenLibraryWorksOutput = z.infer<
	typeof ListBlockedOpenLibraryWorksOutputSchema
>;
