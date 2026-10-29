import type {
	CreateTierlistInput,
	PostTierlistView,
} from "@bbrc/api/modules/post-tierlist/post-tierlist.schema";
import {
	DEFAULT_TIERLIST_TIERS,
	normalizeTierlistText,
	type PostTierlistItemKind,
	TIERLIST_COLORS,
	TIERLIST_MAX_ITEMS,
	TIERLIST_MAX_TIERS,
	type TierlistColor,
	tierlistSetupProblems,
} from "@bbrc/shared";

/** One thing placed in a tier while the member is still building the list. */
export type TierlistDraftItem = {
	/** Local only; never sent. */
	id: string;
	kind: PostTierlistItemKind;
	/** Text, caption or name. */
	label: string;
	/** Image items: the uploaded picture. */
	imageUrl: string | null;
	bookSlug: string | null;
	authorSlug: string | null;
	/** For showing a book's cover or an author's photo while building. */
	coverId: number | null;
	photoUrl: string | null;
};

export type TierlistDraftTier = {
	id: string;
	name: string;
	color: TierlistColor;
	items: TierlistDraftItem[];
};

export type TierlistDraft = { tiers: TierlistDraftTier[] };

let nextId = 0;
export function newDraftId(prefix: string) {
	nextId += 1;
	return `${prefix}-${nextId}`;
}

export function emptyTierlistDraft(): TierlistDraft {
	return {
		tiers: DEFAULT_TIERLIST_TIERS.map((tier) => ({
			id: newDraftId("tier"),
			name: tier.name,
			color: tier.color,
			items: [],
		})),
	};
}

/** A colour no tier uses yet, or the first one when all are in use. */
export function unusedTierColor(draft: TierlistDraft): TierlistColor {
	const used = new Set(draft.tiers.map((tier) => tier.color));
	return (
		TIERLIST_COLORS.find((color) => !used.has(color)) ?? TIERLIST_COLORS[0]
	);
}

export function canAddTier(draft: TierlistDraft) {
	return draft.tiers.length < TIERLIST_MAX_TIERS;
}

export function tierlistDraftItemCount(draft: TierlistDraft) {
	return draft.tiers.reduce((sum, tier) => sum + tier.items.length, 0);
}

export function canAddItem(draft: TierlistDraft) {
	return tierlistDraftItemCount(draft) < TIERLIST_MAX_ITEMS;
}

function draftTiers(draft: TierlistDraft) {
	return draft.tiers.map((tier) => ({
		name: tier.name,
		color: tier.color,
		items: tier.items.map((item) => ({
			kind: item.kind,
			label: item.label,
			imageUrl: item.imageUrl,
			bookSlug: item.bookSlug,
			authorSlug: item.authorSlug,
		})),
	}));
}

/** The first thing stopping the list from being published, or null. */
export function tierlistDraftProblem(draft: TierlistDraft): string | null {
	return tierlistSetupProblems(draftTiers(draft))[0] ?? null;
}

export function tierlistDraftToInput(
	draft: TierlistDraft,
): CreateTierlistInput {
	return {
		tiers: draft.tiers.map((tier) => ({
			name: normalizeTierlistText(tier.name),
			color: tier.color,
			items: tier.items.map((item) => ({
				kind: item.kind,
				label: item.label,
				imageUrl: item.imageUrl,
				bookSlug: item.bookSlug,
				authorSlug: item.authorSlug,
			})),
		})),
	};
}

export function draftItemToView(
	item: TierlistDraftItem,
): PostTierlistView["tiers"][number]["items"][number] {
	return {
		id: item.id,
		kind: item.kind,
		label: item.label || null,
		imageUrl: item.imageUrl,
		book:
			item.kind === "book" && item.bookSlug
				? {
						slug: item.bookSlug,
						title: item.label,
						authors: [],
						coverId: item.coverId,
					}
				: null,
		author:
			item.kind === "author" && item.authorSlug
				? {
						slug: item.authorSlug,
						name: item.label,
						photoUrl: item.photoUrl,
					}
				: null,
	};
}

/** The draft as it will look once published, for the feed while the post is being saved. */
export function tierlistDraftToView(draft: TierlistDraft): PostTierlistView {
	return {
		tiers: draft.tiers.map((tier) => ({
			id: tier.id,
			name: normalizeTierlistText(tier.name),
			color: tier.color,
			items: tier.items.map(draftItemToView),
		})),
		itemCount: tierlistDraftItemCount(draft),
	};
}
