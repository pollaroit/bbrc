import type { ShelfForBookListItemSchema } from "@bbrc/api/modules/shelf/shelf.schema";
import { Badge } from "@bbrc/ui/components/badge";
import type { Route } from "next";
import Link from "next/link";
import type { z } from "zod";
import { ShelfCover } from "@/components/blocks/shelf-cover";
import { cn } from "@/lib/utils";

export type ShelfGridCardShelf = z.infer<typeof ShelfForBookListItemSchema>;

type ShelfGridCardProps = {
	shelf: ShelfGridCardShelf;
	className?: string;
	showOwnerStatus?: boolean;
};

function shelfHref(username: string, slug: string) {
	return `/users/${username}/shelves/${slug}` as Route;
}

export function ShelfGridCard({
	shelf,
	className,
	showOwnerStatus = false,
}: ShelfGridCardProps) {
	const statusLabel =
		showOwnerStatus &&
		shelf.isOwner &&
		shelf.status &&
		shelf.status !== "active"
			? shelf.status
			: null;

	return (
		<Link
			href={shelfHref(shelf.owner.username, shelf.slug)}
			className={cn(
				"flex h-full flex-col gap-3 border border-border p-4 transition-colors",
				"hover:bg-muted/40",
				className,
			)}
		>
			<ShelfCover
				coverIds={shelf.coverPreviewCoverIds}
				coverImageUrl={shelf.coverImageUrl}
				size="md"
			/>
			<div className="flex flex-wrap items-center gap-2">
				<h2 className="font-semibold leading-snug">{shelf.title}</h2>
				{shelf.type === "ordered" ? (
					<Badge variant="secondary">Ranked</Badge>
				) : (
					<Badge variant="outline">List</Badge>
				)}
				{statusLabel ? (
					<Badge variant="outline" className="capitalize">
						{statusLabel}
					</Badge>
				) : null}
			</div>
			<p className="text-muted-foreground text-sm">
				by <span className="text-foreground">{shelf.owner.name}</span>{" "}
				<span className="tabular-nums">@{shelf.owner.username}</span>
			</p>
			{shelf.description ? (
				<p className="line-clamp-2 text-muted-foreground text-sm">
					{shelf.description}
				</p>
			) : null}
			<p className="mt-auto text-muted-foreground text-xs tabular-nums">
				{shelf.bookCount} {shelf.bookCount === 1 ? "book" : "books"}
			</p>
		</Link>
	);
}

export const shelvesGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
