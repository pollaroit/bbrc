"use client";

/**
 * `RequestBoard({ isAdmin?, onAdd?(olid), className? })`
 * Every open request, ranked by "me too". Members toggle "Me too" (optimistic);
 * your own requests show "Your request". Admins also get an "Add" button that
 * calls `onAdd(olid)`.
 */

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
	formatAuthors,
	MeTooButton,
	YourRequestTag,
} from "@/components/blocks/book-requests/request-shared";
import { RelativeTime } from "@/components/blocks/relative-time";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export function RequestBoard({
	isAdmin = false,
	onAdd,
	className,
}: {
	isAdmin?: boolean;
	onAdd?: (olid: string) => void;
	className?: string;
}) {
	const { data, isPending, isError } = useQuery(
		orpc.bookRequest.listOpen.queryOptions(),
	);

	if (isPending) {
		return (
			<div className={cn("flex flex-col gap-2", className)} aria-hidden>
				{Array.from({ length: 3 }, (_, index) => (
					<Skeleton key={index} className="h-20 w-full" />
				))}
			</div>
		);
	}

	if (isError) {
		return (
			<p className={cn("text-destructive text-sm", className)}>
				Could not load the requests. Try again in a moment.
			</p>
		);
	}

	if (data.items.length === 0) {
		return (
			<div
				className={cn(
					"border border-border border-dashed p-6 text-center text-muted-foreground text-sm",
					className,
				)}
			>
				<p className="font-medium text-foreground">No open requests</p>
				<p className="mt-1">
					Ask for a book and it will show up here, where others can say “me
					too”.
				</p>
			</div>
		);
	}

	return (
		<ol
			className={cn(
				"flex flex-col divide-y divide-border border border-border",
				className,
			)}
		>
			{data.items.map((item, index) => {
				// A rank means something only while there are votes to rank by.
				const ranked = item.upvoteCount > 0;
				const requester =
					item.requester.name?.trim() || item.requester.username;
				return (
					<li
						key={item.id}
						className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4"
					>
						<div className="flex min-w-0 flex-1 items-start gap-3">
							<span
								className="w-6 shrink-0 pt-0.5 text-end font-heading font-semibold text-lg text-muted-foreground tabular-nums leading-none"
								aria-hidden={!ranked}
							>
								{ranked ? index + 1 : ""}
							</span>
							<div className="flex min-w-0 flex-col gap-1">
								<p className="font-medium text-sm leading-snug">{item.title}</p>
								<p className="text-muted-foreground text-xs">
									{formatAuthors(item.authors)}
								</p>
								{item.note ? (
									<p className="border-border border-s-2 ps-2 text-sm leading-snug">
										{item.note}
									</p>
								) : null}
								<p className="text-2xs text-muted-foreground">
									{requester} · <RelativeTime date={item.createdAt} />
								</p>
							</div>
						</div>
						<div className="flex shrink-0 flex-wrap items-center gap-2 ps-9 sm:ps-0">
							{item.isMine ? (
								<YourRequestTag count={item.upvoteCount} />
							) : (
								<MeTooButton
									requestId={item.id}
									active={item.viewerUpvoted}
									count={item.upvoteCount}
								/>
							)}
							{isAdmin && onAdd ? (
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => onAdd(item.olid)}
								>
									<Plus data-icon="inline-start" aria-hidden />
									Add
								</Button>
							) : null}
						</div>
					</li>
				);
			})}
		</ol>
	);
}
