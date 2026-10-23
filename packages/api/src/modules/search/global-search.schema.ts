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
	"goal",
	"series",
] as const;

export const GlobalSearchHitTypeSchema = z.enum(globalSearchHitTypes);

export const GlobalSearchHitActionSchema = z.object({
	label: z.string().min(1),
	href: z.string().min(1),
});

export const GlobalSearchMediaSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("cover"), coverId: z.number().int() }),
	z.object({ kind: z.literal("avatar"), url: z.string(), name: z.string() }),
	z.object({
		kind: z.literal("collage"),
		coverIds: z.array(z.number().int()).min(1).max(4),
	}),
	z.object({ kind: z.literal("image"), url: z.string() }),
	z.object({
		kind: z.literal("document"),
		format: z.enum(["pdf", "docx", "epub"]).nullable(),
	}),
]);

export const GlobalSearchHitSchema = z.object({
	type: GlobalSearchHitTypeSchema,
	title: z.string(),
	description: z.string(),
	href: z.string(),
	action: GlobalSearchHitActionSchema.optional(),
	/** Thumbnail to show instead of the type icon, when the item has one. */
	media: GlobalSearchMediaSchema.optional(),
});

export const GlobalSearchInputSchema = z.object({
	query: z.string().trim().min(2).max(100),
	/** Search only these kinds of items (used by the `@` members-only prefix). */
	types: z.array(GlobalSearchHitTypeSchema).min(1).optional(),
});

export const GlobalSearchOutputSchema = z.object({
	items: z.array(GlobalSearchHitSchema).max(20),
});

export type GlobalSearchHitType = z.infer<typeof GlobalSearchHitTypeSchema>;
export type GlobalSearchHit = z.infer<typeof GlobalSearchHitSchema>;
export type GlobalSearchMedia = z.infer<typeof GlobalSearchMediaSchema>;
export type GlobalSearchInput = z.infer<typeof GlobalSearchInputSchema>;
export type GlobalSearchOutput = z.infer<typeof GlobalSearchOutputSchema>;
