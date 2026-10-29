import {
	POST_TIERLIST_ITEM_KINDS,
	TIERLIST_MAX_ITEM_LABEL,
	TIERLIST_MAX_ITEMS,
	TIERLIST_MAX_TIER_NAME,
	TIERLIST_MAX_TIERS,
	TIERLIST_MIN_TIERS,
} from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

export const TierlistItemKindSchema = zod.enum(POST_TIERLIST_ITEM_KINDS);

export const TierlistItemInputSchema = zod.object({
	kind: TierlistItemKindSchema,
	/** Text items: the text. Image items: an optional caption. */
	label: zod.string().max(200).nullish(),
	/** Image items: a file in our own storage (uploaded with the `tierlist-image` target). */
	imageUrl: zod.string().max(2048).nullish(),
	bookSlug: zod.string().max(200).nullish(),
	authorSlug: zod.string().max(200).nullish(),
});

export const TierlistTierInputSchema = zod.object({
	name: zod.string().max(200),
	color: zod.string().max(40),
	/** In the order they appear in the tier. Items that are not in a tier are not sent. */
	items: zod.array(TierlistItemInputSchema).max(TIERLIST_MAX_ITEMS),
});

/** Created together with the post. It cannot be added or changed later. */
export const CreateTierlistInputSchema = zod.object({
	tiers: zod
		.array(TierlistTierInputSchema)
		.min(TIERLIST_MIN_TIERS)
		.max(TIERLIST_MAX_TIERS),
});

export type CreateTierlistInput = z.infer<typeof CreateTierlistInputSchema>;

export const TierlistItemViewSchema = zod.object({
	id: zod.string(),
	kind: TierlistItemKindSchema,
	/** Text, caption or name. Null for an image without a caption. */
	label: zod
		.string()
		.max(TIERLIST_MAX_ITEM_LABEL * 5)
		.nullable(),
	imageUrl: zod.string().nullable(),
	book: zod
		.object({
			slug: zod.string(),
			title: zod.string(),
			authors: zod.array(zod.string()),
			coverId: zod.number().nullable(),
		})
		.nullable(),
	author: zod
		.object({
			slug: zod.string(),
			name: zod.string(),
			photoUrl: zod.string().nullable(),
		})
		.nullable(),
});

export const TierlistTierViewSchema = zod.object({
	id: zod.string(),
	name: zod.string().max(TIERLIST_MAX_TIER_NAME * 5),
	color: zod.string(),
	items: zod.array(TierlistItemViewSchema),
});

export const PostTierlistViewSchema = zod.object({
	tiers: zod.array(TierlistTierViewSchema),
	itemCount: zod.number().int().min(0),
});

export type PostTierlistView = z.infer<typeof PostTierlistViewSchema>;
