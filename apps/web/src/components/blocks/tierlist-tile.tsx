import type { PostTierlistView } from "@bbrc/api/modules/post-tierlist/post-tierlist.schema";
import Image from "next/image";
import { bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

export type TierlistTileItem =
	PostTierlistView["tiers"][number]["items"][number];

/** A short name for screen readers and tooltips. */
export function tierlistItemName(item: TierlistTileItem): string {
	if (item.kind === "image") return item.label?.trim() || "Picture";
	return item.label?.trim() || "Item";
}

/**
 * What one tile looks like: always a 2:3 portrait, whatever it is. A book is
 * its cover, an author their photo (or an initial), an image the picture with
 * its caption, and text a card with the words.
 */
export function TierlistTileFace({
	item,
	className,
}: {
	item: TierlistTileItem;
	className?: string;
}) {
	const name = tierlistItemName(item);
	const frame =
		"relative block aspect-2/3 w-full overflow-hidden bg-muted ring-1 ring-foreground/10";

	if (item.kind === "book") {
		const cover = bookCoverUrl(item.book?.coverId, "M");
		return (
			<span className={cn(frame, className)} title={name}>
				{cover ? (
					<Image
						src={cover}
						alt={name}
						fill
						className="object-cover"
						sizes="96px"
					/>
				) : (
					<TileWords text={name} />
				)}
			</span>
		);
	}

	if (item.kind === "author") {
		const photo = item.author?.photoUrl;
		return (
			<span className={cn(frame, className)} title={name}>
				{photo ? (
					<Image
						src={photo}
						alt={name}
						fill
						className="object-cover"
						sizes="96px"
					/>
				) : (
					<span className="absolute inset-0 grid place-items-center font-heading font-semibold text-2xl text-muted-foreground">
						{name.charAt(0).toUpperCase()}
					</span>
				)}
				<Caption text={name} />
			</span>
		);
	}

	if (item.kind === "image") {
		return (
			<span className={cn(frame, className)} title={name}>
				{item.imageUrl ? (
					// biome-ignore lint/performance/noImgElement: a small member upload from our own storage.
					<img
						src={item.imageUrl}
						alt={item.label?.trim() || "Tierlist picture"}
						className="absolute inset-0 size-full object-cover"
						loading="lazy"
						decoding="async"
					/>
				) : null}
				{item.label?.trim() ? <Caption text={item.label.trim()} /> : null}
			</span>
		);
	}

	return (
		<span className={cn(frame, "bg-card", className)} title={name}>
			<TileWords text={name} />
		</span>
	);
}

function TileWords({ text }: { text: string }) {
	return (
		<span className="absolute inset-0 grid place-items-center p-1 text-center font-medium text-2xs leading-tight [overflow-wrap:anywhere]">
			<span className="line-clamp-5">{text}</span>
		</span>
	);
}

function Caption({ text }: { text: string }) {
	return (
		<span className="absolute inset-x-0 bottom-0 bg-background/85 px-1 py-0.5 text-center text-3xs leading-tight">
			<span className="line-clamp-2 [overflow-wrap:anywhere]">{text}</span>
		</span>
	);
}
