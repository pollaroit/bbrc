"use client";

import type { ViewSourceName } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Lock } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useImpressionRef } from "@/components/blocks/track-impression";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

type Member = { username: string; name: string; image: string | null };

export type ShelfCatalogCardShelf = {
	slug: string;
	title: string;
	description: string | null;
	coverImageUrl: string | null;
	coverPreviewCoverIds: (number | null)[];
	type: "ordered" | "unordered";
	status?: "draft" | "active" | "archived";
	/** Private shelves get a lock badge (only people who can open one ever see it). */
	visibility?: "public" | "private";
	bookCount: number;
	owner: Member;
	collaborators: Member[];
	collaboratorCount: number;
};

/** A few book covers standing on a plank, or the shelf's own cover image. */
function Plank({
	coverIds,
	coverImageUrl,
}: {
	coverIds: (number | null)[];
	coverImageUrl: string | null;
}) {
	if (coverImageUrl) {
		return (
			<div className="relative h-32 w-full overflow-hidden border-foreground border-b-4 bg-muted">
				<Image
					src={coverImageUrl}
					alt=""
					fill
					className="object-cover"
					sizes="(min-width: 1024px) 33vw, 100vw"
				/>
			</div>
		);
	}

	// Slightly different widths so the covers read as books of different sizes.
	const widths = ["w-14", "w-16", "w-12", "w-[3.75rem]"] as const;

	return (
		<div className="flex h-32 items-end gap-1.5 border-foreground border-b-4 bg-muted/40 px-4">
			{widths.map((width, index) => {
				const coverId = coverIds[index];
				const src = bookCoverUrl(coverId);
				return (
					<span
						key={width}
						className={cn(
							"relative block aspect-2/3 shrink-0 overflow-hidden",
							width,
							src
								? "bg-muted ring-1 ring-foreground/15"
								: "border border-border border-dashed",
						)}
					>
						{src ? (
							<Image
								src={src}
								alt=""
								fill
								className="object-cover"
								sizes="64px"
							/>
						) : null}
					</span>
				);
			})}
		</div>
	);
}

function CollaboratorsLine({
	shelf,
}: {
	shelf: Pick<ShelfCatalogCardShelf, "collaborators" | "collaboratorCount">;
}) {
	const { collaborators, collaboratorCount } = shelf;
	if (collaboratorCount === 0) {
		return null;
	}

	const names = collaborators.slice(0, 2).map((person) => person.name);
	const rest = collaboratorCount - names.length;

	return (
		<span className="flex min-w-0 items-center gap-2">
			<span className="flex shrink-0 -space-x-1.5" aria-hidden>
				{collaborators.slice(0, 3).map((person) => (
					<UserAvatar
						key={person.username}
						user={person}
						className="size-5 ring-2 ring-background"
					/>
				))}
			</span>
			<span className="truncate text-muted-foreground text-xs">
				with {names.join(", ")}
				{rest > 0 ? ` +${rest}` : ""}
			</span>
		</span>
	);
}

export function ShelfCatalogCard({
	shelf,
	showStatus = false,
	className,
	impressionSource = "shelves",
}: {
	shelf: ShelfCatalogCardShelf;
	/** Show draft and archived labels (for the owner's own views). */
	showStatus?: boolean;
	className?: string;
	/** Where the card is listed, for view counts. */
	impressionSource?: ViewSourceName;
}) {
	const href = `/users/${shelf.owner.username}/shelves/${shelf.slug}` as Route;
	const countImpression = useImpressionRef(
		"shelf",
		`${shelf.owner.username}/${shelf.slug}`,
		impressionSource,
	);

	return (
		<article
			ref={countImpression}
			className={cn(
				"group relative flex h-full flex-col border border-border bg-card transition-colors hover:border-foreground/50",
				className,
			)}
		>
			<Plank
				coverIds={shelf.coverPreviewCoverIds}
				coverImageUrl={shelf.coverImageUrl}
			/>

			<div className="flex flex-1 flex-col gap-3 p-4">
				<div className="flex flex-col gap-1.5">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<h2 className="font-heading font-semibold text-base leading-snug">
							<Link href={href} className="after:absolute after:inset-0">
								{shelf.title}
							</Link>
						</h2>
						{shelf.type === "ordered" ? (
							<Badge variant="secondary">Ranked</Badge>
						) : null}
						{shelf.visibility === "private" ? (
							<Badge variant="outline" className="gap-1">
								<Lock aria-hidden />
								Private
							</Badge>
						) : null}
						{showStatus && shelf.status && shelf.status !== "active" ? (
							<Badge variant="outline" className="capitalize">
								{shelf.status}
							</Badge>
						) : null}
					</div>
					{shelf.description ? (
						<p className="line-clamp-2 text-muted-foreground text-sm leading-relaxed">
							{shelf.description}
						</p>
					) : null}
				</div>

				<div className="mt-auto flex flex-col gap-2 border-border border-t pt-3">
					<span className="flex items-center gap-2 text-sm">
						<UserAvatar user={shelf.owner} className="size-5" />
						<span className="min-w-0 truncate">
							<span className="font-medium">{shelf.owner.name}</span>
							<span className="ps-1.5 text-muted-foreground text-xs">
								@{shelf.owner.username}
							</span>
						</span>
					</span>
					<div className="flex items-center justify-between gap-3">
						<CollaboratorsLine shelf={shelf} />
						<span className="ms-auto shrink-0 text-muted-foreground text-xs tabular-nums">
							{shelf.bookCount} {shelf.bookCount === 1 ? "book" : "books"}
						</span>
					</div>
				</div>
			</div>
		</article>
	);
}

export const shelvesGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
