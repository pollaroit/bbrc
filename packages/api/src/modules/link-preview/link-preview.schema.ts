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
	zod.object({ kind: zod.literal("author"), slug: zod.string().max(200) }),
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
		"author",
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

/** Outside links: what the page told us about itself, from our cache (see `link-unfurl`). */
export const ExternalLinkPreviewSchema = zod.object({
	/** The link, tidied (no tracking parameters), as the cache knows it. */
	url: zod.string(),
	/** "example.com". */
	host: zod.string(),
	/** `none` when the page gave nothing or could not be reached: show the plain card. */
	status: zod.enum(["ok", "none"]),
	title: zod.string().nullable(),
	description: zod.string().nullable(),
	siteName: zod.string().nullable(),
	/** Our own small copy of the page's picture, never the other site's address. */
	imageUrl: zod.string().nullable(),
});

export const ResolveExternalLinkPreviewsInputSchema = zod.object({
	urls: zod.array(zod.string().url().max(2048)).min(1).max(12),
});

export const ResolveExternalLinkPreviewsOutputSchema = zod.object({
	/** In the order of the request. */
	items: zod.array(ExternalLinkPreviewSchema),
});

export type ExternalLinkPreview = zod.infer<typeof ExternalLinkPreviewSchema>;
