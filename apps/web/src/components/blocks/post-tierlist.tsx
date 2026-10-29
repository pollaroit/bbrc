"use client";

import type { PostTierlistView } from "@bbrc/api/modules/post-tierlist/post-tierlist.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { SpoilerContentGate } from "@/components/blocks/spoiler-content-gate";
import {
	TierlistTileFace,
	type TierlistTileItem,
	tierlistItemName,
} from "@/components/blocks/tierlist-tile";
import { authClient } from "@/lib/auth-client";
import { tierColorClasses } from "@/lib/tierlist-colors";
import { cn } from "@/lib/utils";

/** In a feed a long tierlist is cut to this many tiles, with a button for the rest. */
const FEED_TILE_LIMIT = 12;

const GRID =
	"grid flex-1 grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] content-start gap-1 p-1 sm:grid-cols-[repeat(auto-fill,minmax(4rem,1fr))]";

type PostTierlistProps = {
	tierlist: PostTierlistView;
	/** A feed card: long lists are cut short. The post page shows everything. */
	compact?: boolean;
	className?: string;
};

/**
 * A post's tierlist behind the same spoiler cover as its text: revealing one
 * reveals the other.
 */
export function PostTierlistSection({
	slug,
	isSpoiler,
	...props
}: PostTierlistProps & { slug: string; isSpoiler: boolean }) {
	const session = authClient.useSession();
	return (
		<SpoilerContentGate
			username={session.data?.user.username ?? null}
			kind="post"
			identifier={slug}
			isSpoiler={isSpoiler}
		>
			<PostTierlist {...props} />
		</SpoilerContentGate>
	);
}

/** A published tierlist. It is read-only for everyone, the author included. */
export function PostTierlist({
	tierlist,
	compact = false,
	className,
}: PostTierlistProps) {
	const [expanded, setExpanded] = useState(false);
	const [picture, setPicture] = useState<TierlistTileItem | null>(null);

	const cut = compact && !expanded && tierlist.itemCount > FEED_TILE_LIMIT;
	let budget = cut ? FEED_TILE_LIMIT : Number.POSITIVE_INFINITY;

	return (
		<section
			aria-label="Tierlist"
			className={cn("flex min-w-0 flex-col gap-1", className)}
		>
			{tierlist.tiers.map((tier) => {
				const shown = tier.items.slice(0, Math.max(budget, 0));
				budget -= shown.length;
				if (cut && shown.length === 0 && tier.items.length > 0) return null;

				return (
					<div
						key={tier.id}
						className="flex min-h-[4.25rem] border border-border"
					>
						<div
							className={cn(
								"flex w-14 shrink-0 items-center justify-center border-r p-1 text-center font-heading font-semibold text-xs leading-tight [overflow-wrap:anywhere] sm:w-20 sm:text-sm",
								tierColorClasses(tier.color).label,
							)}
						>
							{tier.name}
						</div>
						<ul className={GRID}>
							{shown.map((item) => (
								<li key={item.id} className="min-w-0">
									<TierlistTile item={item} onOpenPicture={setPicture} />
								</li>
							))}
						</ul>
					</div>
				);
			})}

			{cut ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="self-start"
					onClick={() => setExpanded(true)}
				>
					Show all {tierlist.itemCount} items
				</Button>
			) : null}

			<Dialog
				open={picture != null}
				onOpenChange={(open) => {
					if (!open) setPicture(null);
				}}
			>
				<DialogContent className="max-w-md gap-3">
					<DialogTitle className="sr-only">
						{picture ? tierlistItemName(picture) : "Picture"}
					</DialogTitle>
					<DialogDescription className="sr-only">
						A picture from the tierlist.
					</DialogDescription>
					{picture?.imageUrl ? (
						// biome-ignore lint/performance/noImgElement: a member upload from our own storage.
						<img
							src={picture.imageUrl}
							alt={picture.label?.trim() || "Tierlist picture"}
							className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
						/>
					) : null}
					{picture?.label?.trim() ? (
						<p className="text-center text-sm">{picture.label.trim()}</p>
					) : null}
				</DialogContent>
			</Dialog>
		</section>
	);
}

function TierlistTile({
	item,
	onOpenPicture,
}: {
	item: TierlistTileItem;
	onOpenPicture: (item: TierlistTileItem) => void;
}) {
	const face = <TierlistTileFace item={item} />;
	const focus =
		"block w-full outline-offset-2 transition-opacity hover:opacity-85 focus-visible:outline-2";

	if (item.kind === "book" && item.book) {
		return (
			<Link
				href={`/books/${item.book.slug}` as Route}
				className={focus}
				aria-label={tierlistItemName(item)}
			>
				{face}
			</Link>
		);
	}
	if (item.kind === "author" && item.author) {
		return (
			<Link
				href={`/authors/${item.author.slug}` as Route}
				className={focus}
				aria-label={tierlistItemName(item)}
			>
				{face}
			</Link>
		);
	}
	if (item.kind === "image" && item.imageUrl) {
		return (
			<button
				type="button"
				className={focus}
				aria-label={`Open picture: ${tierlistItemName(item)}`}
				onClick={() => onOpenPicture(item)}
			>
				{face}
			</button>
		);
	}
	return face;
}
