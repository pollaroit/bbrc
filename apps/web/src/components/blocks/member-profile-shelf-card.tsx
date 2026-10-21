import type { ListShelvesByUsernameOutput } from "@bbrc/api/modules/shelf/shelf.schema";
import { Badge } from "@bbrc/ui/components/badge";
import type { Route } from "next";
import Link from "next/link";
import { RelativeTime } from "@/components/blocks/relative-time";
import { ShelfCover } from "@/components/blocks/shelf-cover";

type Shelf = ListShelvesByUsernameOutput["items"][number];

type MemberProfileShelfCardProps = {
	shelf: Shelf;
	username: string;
	/** Owners also see non-active statuses. */
	showStatus?: boolean;
	/** Static look-alike for the editor: no links. */
	preview?: boolean;
};

export function MemberProfileShelfCard({
	shelf,
	username,
	showStatus = false,
	preview = false,
}: MemberProfileShelfCardProps) {
	return (
		<article className="relative flex h-full gap-3 border border-border p-3 transition-colors hover:bg-muted/40">
			<ShelfCover
				coverIds={shelf.coverPreviewCoverIds}
				coverImageUrl={shelf.coverImageUrl}
				size="md"
				className="self-start"
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<h3 className="font-medium text-sm leading-snug">
						{preview ? (
							shelf.title
						) : (
							<Link
								href={`/users/${username}/shelves/${shelf.slug}` as Route}
								className="after:absolute after:inset-0"
							>
								{shelf.title}
							</Link>
						)}
					</h3>
					<Badge variant={shelf.type === "ordered" ? "secondary" : "outline"}>
						{shelf.type === "ordered" ? "Ranked" : "List"}
					</Badge>
					{showStatus && shelf.status !== "active" ? (
						<Badge variant="outline" className="capitalize">
							{shelf.status}
						</Badge>
					) : null}
				</div>
				{shelf.description ? (
					<p className="line-clamp-2 text-muted-foreground text-sm">
						{shelf.description}
					</p>
				) : null}
				<p className="mt-auto text-muted-foreground text-xs tabular-nums">
					{shelf.bookCount} {shelf.bookCount === 1 ? "book" : "books"} · updated{" "}
					<RelativeTime
						date={shelf.updatedAt}
						className="text-muted-foreground text-xs"
					/>
				</p>
			</div>
		</article>
	);
}
