import z from "zod";

export const globalSearchHitTypes = [
	"book",
	"user",
	"post",
	"feedback",
	"comment",
	"shelf",
	"document",
	"author",
] as const;

export const GlobalSearchHitTypeSchema = z.enum(globalSearchHitTypes);

export const GlobalSearchHitActionSchema = z.object({
	label: z.string().min(1),
	href: z.string().min(1),
});

export const GlobalSearchHitSchema = z.object({
	type: GlobalSearchHitTypeSchema,
	title: z.string(),
	description: z.string(),
	href: z.string(),
	action: GlobalSearchHitActionSchema.optional(),
});

export const GlobalSearchInputSchema = z.object({
	query: z.string().trim().min(2).max(100),
});

export const GlobalSearchOutputSchema = z.object({
	items: z.array(GlobalSearchHitSchema).max(10),
});

export type GlobalSearchHitType = z.infer<typeof GlobalSearchHitTypeSchema>;
export type GlobalSearchHit = z.infer<typeof GlobalSearchHitSchema>;
export type GlobalSearchInput = z.infer<typeof GlobalSearchInputSchema>;
export type GlobalSearchOutput = z.infer<typeof GlobalSearchOutputSchema>;
