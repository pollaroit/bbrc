import zod from "zod";

export const InternalLinkRefSchema = zod.discriminatedUnion("kind", [
	zod.object({ kind: zod.literal("book"), slug: zod.string().max(200) }),
	zod.object({ kind: zod.literal("post"), slug: zod.string().max(200) }),
	zod.object({
		kind: zod.literal("comment_on_post"),
		postSlug: zod.string().max(200),
		slug: zod.string().max(200),
	}),
	zod.object({
		kind: zod.literal("comment_on_feedback"),
		bookSlug: zod.string().max(200),
		feedbackSlug: zod.string().max(200),
		slug: zod.string().max(200),
	}),
	zod.object({
		kind: zod.literal("feedback"),
		bookSlug: zod.string().max(200),
		slug: zod.string().max(200),
	}),
	zod.object({ kind: zod.literal("user"), username: zod.string().max(60) }),
	zod.object({
		kind: zod.literal("shelf"),
		username: zod.string().max(60),
		slug: zod.string().max(200),
	}),
	zod.object({ kind: zod.literal("sitting"), slug: zod.string().max(200) }),
]);

export const LinkPreviewImageSchema = zod.discriminatedUnion("type", [
	zod.object({ type: zod.literal("cover"), coverId: zod.number().nullable() }),
	zod.object({
		type: zod.literal("avatar"),
		name: zod.string(),
		image: zod.string().nullable(),
	}),
	zod.object({
		type: zod.literal("mosaic"),
		coverIds: zod.array(zod.number().nullable()),
		imageUrl: zod.string().nullable(),
	}),
]);

export const LinkPreviewSchema = zod.object({
	/** The in-app path the preview is for. */
	href: zod.string(),
	kind: zod.enum([
		"book",
		"post",
		"comment_on_post",
		"comment_on_feedback",
		"feedback",
		"user",
		"shelf",
		"sitting",
	]),
	/** Human name of the kind: "Book", "Review", "Shelf". */
	kindLabel: zod.string(),
	/** `unavailable` when it is gone or not visible to this viewer. */
	status: zod.enum(["ok", "unavailable"]),
	title: zod.string(),
	subtitle: zod.string().nullable(),
	excerpt: zod.string().nullable(),
	meta: zod.array(zod.string()),
	image: LinkPreviewImageSchema.nullable(),
});

export const ResolveLinkPreviewsInputSchema = zod.object({
	refs: zod.array(InternalLinkRefSchema).min(1).max(12),
});

export const ResolveLinkPreviewsOutputSchema = zod.object({
	items: zod.array(LinkPreviewSchema),
});

export type LinkPreview = zod.infer<typeof LinkPreviewSchema>;
export type InternalLinkRefInput = zod.infer<typeof InternalLinkRefSchema>;
