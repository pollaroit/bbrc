/** Mirrors the tierlist enums in `post-tierlist.prisma` — keep in sync. */
export const POST_TIERLIST_ITEM_KINDS = [
	"text",
	"image",
	"book",
	"author",
] as const;
export type PostTierlistItemKind = (typeof POST_TIERLIST_ITEM_KINDS)[number];

export const POST_TIERLIST_ITEM_KIND_LABELS: Record<
	PostTierlistItemKind,
	string
> = {
	text: "Text",
	image: "Image",
	book: "Book",
	author: "Author",
};

export const TIERLIST_MIN_TIERS = 2;
export const TIERLIST_MAX_TIERS = 8;
/** Items across all tiers. Items that are not in a tier are never published. */
export const TIERLIST_MAX_ITEMS = 60;
export const TIERLIST_MAX_TIER_NAME = 20;
export const TIERLIST_MAX_ITEM_LABEL = 40;

/**
 * Theme colour keys a tier can use, one per possible tier so all eight can
 * differ. These are keys, never colours: the screen maps each to its theme
 * token (`bg-<key>/10 text-<key>-ink`), so every palette stays readable.
 */
export const TIERLIST_COLORS = [
	"destructive",
	"orange",
	"warning",
	"success",
	"teal",
	"info",
	"violet",
	"pink",
] as const;
export type TierlistColor = (typeof TIERLIST_COLORS)[number];

export function isTierlistColor(value: string): value is TierlistColor {
	return (TIERLIST_COLORS as readonly string[]).includes(value);
}

export const DEFAULT_TIERLIST_TIERS: readonly {
	name: string;
	color: TierlistColor;
}[] = [
	{ name: "S", color: "violet" },
	{ name: "A", color: "success" },
	{ name: "B", color: "info" },
	{ name: "C", color: "warning" },
	{ name: "D", color: "destructive" },
];

/** What a member places: one thing, of one kind. Book and author are picked from the catalog. */
export type TierlistItemDraft = {
	kind: PostTierlistItemKind;
	/** Text items: the text. Image items: an optional caption. Others: ignored (the name is used). */
	label?: string | null;
	/** Image items: a file in our own storage. */
	imageUrl?: string | null;
	bookSlug?: string | null;
	authorSlug?: string | null;
};

export type TierlistTierDraft = {
	name: string;
	color: string;
	/** In the order they appear in the tier. */
	items: TierlistItemDraft[];
};

/** Lower-case, single-spaced text, so "Dune " and "dune" are the same item. */
export function normalizeTierlistText(value: string | null | undefined) {
	return (value ?? "").trim().replace(/\s+/g, " ");
}

/** The same thing cannot be placed twice (in any tier). */
export function tierlistItemDedupeKey(item: TierlistItemDraft): string | null {
	switch (item.kind) {
		case "text": {
			const text = normalizeTierlistText(item.label).toLowerCase();
			return text ? `text:${text}` : null;
		}
		case "image":
			return item.imageUrl ? `image:${item.imageUrl}` : null;
		case "book":
			return item.bookSlug ? `book:${item.bookSlug}` : null;
		case "author":
			return item.authorSlug ? `author:${item.authorSlug}` : null;
	}
}

/** Everything wrong with a tierlist setup, in plain words. Empty means it can be published. */
export function tierlistSetupProblems(tiers: TierlistTierDraft[]): string[] {
	const problems: string[] = [];

	if (tiers.length < TIERLIST_MIN_TIERS || tiers.length > TIERLIST_MAX_TIERS) {
		problems.push(
			`A tierlist has ${TIERLIST_MIN_TIERS} to ${TIERLIST_MAX_TIERS} tiers.`,
		);
	}

	const tierNames = new Set<string>();
	for (const tier of tiers) {
		const name = normalizeTierlistText(tier.name);
		if (!name) {
			problems.push("Every tier needs a name.");
		} else if (name.length > TIERLIST_MAX_TIER_NAME) {
			problems.push(
				`Tier names can be up to ${TIERLIST_MAX_TIER_NAME} characters.`,
			);
		} else if (tierNames.has(name.toLowerCase())) {
			problems.push(`Two tiers are called "${name}".`);
		}
		tierNames.add(name.toLowerCase());

		if (!isTierlistColor(tier.color)) {
			problems.push(`"${name || "A tier"}" has a colour we do not know.`);
		}
	}

	const seen = new Set<string>();
	let total = 0;
	for (const tier of tiers) {
		for (const item of tier.items) {
			total += 1;

			const label = normalizeTierlistText(item.label);
			if (label.length > TIERLIST_MAX_ITEM_LABEL) {
				problems.push(
					`Item text can be up to ${TIERLIST_MAX_ITEM_LABEL} characters.`,
				);
			}
			if (item.kind === "text" && !label) {
				problems.push("A text item cannot be empty.");
			}
			if (item.kind === "image" && !item.imageUrl) {
				problems.push("An image item needs its picture.");
			}
			if (item.kind === "book" && !item.bookSlug) {
				problems.push("A book item needs a book.");
			}
			if (item.kind === "author" && !item.authorSlug) {
				problems.push("An author item needs an author.");
			}

			const key = tierlistItemDedupeKey(item);
			if (key) {
				if (seen.has(key)) {
					problems.push("The same item is placed twice.");
				}
				seen.add(key);
			}
		}
	}

	if (total === 0) {
		problems.push("Place at least one item in a tier.");
	}
	if (total > TIERLIST_MAX_ITEMS) {
		problems.push(`A tierlist can have up to ${TIERLIST_MAX_ITEMS} items.`);
	}

	return [...new Set(problems)];
}
