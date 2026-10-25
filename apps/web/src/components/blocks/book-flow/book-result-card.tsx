"use client";

import { openLibraryWorkKeyToOlid } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Check, Plus } from "lucide-react";
import Image from "next/image";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";
import { cn } from "@/lib/utils";
import { HotkeyChip } from "./book-flow-hotkeys-help";

/*
 * One search result as a catalogue card.
 *
 * - `workStatus(work, context)` says where a book stands: available, already in
 *   the library, blocked, or requested by a member.
 * - `isPickable(status, mode)` says whether it can be chosen. In "add" mode a
 *   requested book can still be added (that is how a request is answered); in
 *   "request" mode only available books can be requested. Books in the library
 *   or on the block list never can.
 * - `<BookResultCard>` props:
 *     work, status, mode
 *     id           DOM id (the search box points at it with aria-activedescendant)
 *     active       highlighted by the keyboard
 *     queued       already in the queue (shows "Already queued")
 *     onPick       choose the book
 *     onToggleQueue(work)  when given, shows the "Queue" toggle (add mode)
 *     trailing     extra node under the badges (e.g. a "me too" button)
 */

export type WorkStatus =
	| { kind: "available" }
	| { kind: "in_library" }
	| { kind: "blocked" }
	| { kind: "requested"; requestedBy: string };

export type BookFlowMode = "add" | "request";

export function workStatus(
	work: OpenLibrarySearchWork,
	context: {
		inCatalogOlids: ReadonlySet<string>;
		pendingByOlid: ReadonlyMap<string, string>;
		blockedOlids?: ReadonlySet<string>;
	},
): WorkStatus {
	const olid = openLibraryWorkKeyToOlid(work.workKey);
	if (!olid) return { kind: "blocked" };
	if (context.inCatalogOlids.has(olid)) return { kind: "in_library" };
	if (context.blockedOlids?.has(olid)) return { kind: "blocked" };
	const requestedBy = context.pendingByOlid.get(olid);
	if (requestedBy) return { kind: "requested", requestedBy };
	return { kind: "available" };
}

export function isPickable(status: WorkStatus, mode: BookFlowMode): boolean {
	if (status.kind === "available") return true;
	if (status.kind === "requested") return mode === "add";
	return false;
}

export function BookResultCard({
	work,
	status,
	mode,
	id,
	active = false,
	queued = false,
	onPick,
	onToggleQueue,
	trailing,
}: {
	work: OpenLibrarySearchWork;
	status: WorkStatus;
	mode: BookFlowMode;
	id?: string;
	active?: boolean;
	queued?: boolean;
	onPick: () => void;
	onToggleQueue?: (work: OpenLibrarySearchWork) => void;
	trailing?: React.ReactNode;
}) {
	const pickable = isPickable(status, mode);
	const src = bookCoverUrl(work.coverId, "M");
	const canQueue = onToggleQueue != null && pickable;

	return (
		<li
			id={id}
			data-active={active || undefined}
			className={cn(
				"relative flex border bg-card transition-colors",
				active
					? "border-foreground bg-muted/40 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-foreground"
					: "border-border",
				!pickable && "opacity-60",
			)}
		>
			<button
				type="button"
				disabled={!pickable}
				onClick={onPick}
				className={cn(
					"flex min-w-0 flex-1 items-start gap-3 p-3 text-start outline-none focus-visible:bg-muted/40 sm:gap-4 sm:p-3.5",
					pickable ? "hover:bg-muted/30" : "cursor-not-allowed",
				)}
			>
				<span className="relative block aspect-2/3 w-14 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10 sm:w-[4.5rem]">
					{src ? (
						<Image
							src={src}
							alt=""
							fill
							sizes="72px"
							className="object-cover"
						/>
					) : (
						<span className="flex size-full items-center justify-center px-1 text-center text-3xs text-muted-foreground leading-tight">
							No cover
						</span>
					)}
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-1">
					<span className="flex flex-wrap items-center gap-1.5">
						{status.kind === "in_library" ? (
							<Badge variant="secondary">In library</Badge>
						) : null}
						{status.kind === "blocked" ? (
							<Badge variant="destructive">Blocked</Badge>
						) : null}
						{status.kind === "requested" ? (
							<Badge variant="default">Requested by {status.requestedBy}</Badge>
						) : null}
						{queued ? <Badge variant="outline">Already queued</Badge> : null}
					</span>
					<span className="line-clamp-2 font-medium text-sm leading-snug sm:text-base">
						{work.title}
					</span>
					<span className="truncate text-muted-foreground text-xs sm:text-sm">
						{formatBookAuthors(work.authors)}
						{work.publishedIn != null ? ` · ${work.publishedIn}` : null}
					</span>
					{work.description ? (
						<span className="line-clamp-2 text-muted-foreground text-xs leading-relaxed max-sm:hidden">
							{work.description}
						</span>
					) : null}
					{trailing}
				</span>
			</button>
			<div className="flex shrink-0 flex-col items-end justify-between gap-2 border-border border-s p-2">
				{canQueue ? (
					<button
						type="button"
						aria-pressed={queued}
						aria-label={
							queued
								? `Remove ${work.title} from the queue`
								: `Add ${work.title} to the queue`
						}
						onClick={() => onToggleQueue?.(work)}
						className={cn(
							"inline-flex h-7 items-center gap-1 border px-2 text-2xs transition-colors focus-visible:outline-2 focus-visible:outline-ring",
							queued
								? "border-foreground bg-foreground text-background"
								: "border-border text-muted-foreground hover:text-foreground",
						)}
					>
						{queued ? (
							<Check className="size-3" aria-hidden />
						) : (
							<Plus className="size-3" aria-hidden />
						)}
						<span className="max-sm:sr-only">
							{queued ? "Queued" : "Queue"}
						</span>
					</button>
				) : (
					<span />
				)}
				{active && pickable ? <HotkeyChip id="pick" /> : null}
			</div>
		</li>
	);
}
