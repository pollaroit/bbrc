"use client";

/**
 * Small pieces shared by the request and discover components:
 * - `RequestCover`: a 2:3 cover thumbnail (Open Library cover id, or a quiet placeholder).
 * - `MeTooButton`: the optimistic "Me too N" toggle.
 * - `useMeToo`: the mutation behind it. It updates every list that shows the
 *   request at once (open board, admin inbox, "Members want this" lane) and
 *   rolls back on failure.
 */

import type { DiscoverLane } from "@bbrc/api/modules/book-discover/book-discover.schema";
import { Button } from "@bbrc/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { BookOpen, ThumbsUp } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

export function RequestCover({
	coverId,
	title,
	className,
}: {
	coverId: number | null;
	title: string;
	className?: string;
}) {
	const src = bookCoverUrl(coverId, "M");
	return (
		<span
			className={cn(
				"relative block aspect-2/3 w-12 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10 sm:w-14",
				className,
			)}
		>
			{src ? (
				<Image src={src} alt="" fill className="object-cover" sizes="56px" />
			) : (
				<span
					className="flex size-full items-center justify-center text-muted-foreground"
					title={title}
				>
					<BookOpen className="size-4" aria-hidden />
				</span>
			)}
		</span>
	);
}

type MeTooVars = { id: string; upvoted: boolean };

export function useMeToo() {
	const openOptions = orpc.bookRequest.listOpen.queryOptions();
	const pendingOptions = orpc.bookRequest.listPending.queryOptions();
	const laneKey = orpc.bookDiscover.lane.queryKey({
		input: { id: "member_wants" },
	});

	return useMutation(
		orpc.bookRequest.upvote.mutationOptions({
			onMutate: async ({ id, upvoted }: MeTooVars) => {
				await Promise.all([
					queryClient.cancelQueries({ queryKey: openOptions.queryKey }),
					queryClient.cancelQueries({ queryKey: pendingOptions.queryKey }),
					queryClient.cancelQueries({ queryKey: laneKey }),
				]);
				const previous = {
					open: queryClient.getQueryData(openOptions.queryKey),
					pending: queryClient.getQueryData(pendingOptions.queryKey),
					lane: queryClient.getQueryData(laneKey),
				};
				const delta = upvoted ? 1 : -1;

				queryClient.setQueryData(openOptions.queryKey, (current) =>
					current
						? {
								...current,
								items: current.items.map((item) =>
									item.id === id
										? {
												...item,
												viewerUpvoted: upvoted,
												upvoteCount: Math.max(0, item.upvoteCount + delta),
											}
										: item,
								),
							}
						: current,
				);
				queryClient.setQueryData(pendingOptions.queryKey, (current) =>
					current
						? {
								...current,
								items: current.items.map((item) =>
									item.id === id
										? {
												...item,
												upvoteCount: Math.max(0, item.upvoteCount + delta),
											}
										: item,
								),
							}
						: current,
				);
				queryClient.setQueryData<DiscoverLane | undefined>(
					laneKey,
					(current) =>
						current
							? {
									...current,
									items: current.items.map((item) =>
										item.request?.id === id
											? {
													...item,
													request: {
														...item.request,
														upvoteCount: Math.max(
															0,
															item.request.upvoteCount + delta,
														),
													},
												}
											: item,
									),
								}
							: current,
				);
				return { previous };
			},
			onError: (error, _vars, context) => {
				if (context) {
					queryClient.setQueryData(openOptions.queryKey, context.previous.open);
					queryClient.setQueryData(
						pendingOptions.queryKey,
						context.previous.pending,
					);
					queryClient.setQueryData(laneKey, context.previous.lane);
				}
				toast.error(error.message ?? "Could not save that.");
			},
			onSettled: () =>
				Promise.all([
					queryClient.invalidateQueries({ queryKey: openOptions.queryKey }),
					queryClient.invalidateQueries({ queryKey: pendingOptions.queryKey }),
					queryClient.invalidateQueries({ queryKey: laneKey }),
					queryClient.invalidateQueries({
						queryKey: orpc.bookRequest.listMine.key(),
					}),
				]),
		}),
	);
}

/** "Me too" with the count. Not shown for your own request (use `YourRequestTag`). */
export function MeTooButton({
	requestId,
	active,
	count,
	size = "sm",
}: {
	requestId: string;
	active: boolean;
	count: number;
	size?: "sm" | "default";
}) {
	const meToo = useMeToo();
	return (
		<Button
			type="button"
			size={size}
			variant={active ? "default" : "outline"}
			aria-pressed={active}
			onClick={() => meToo.mutate({ id: requestId, upvoted: !active })}
			className="tabular-nums"
		>
			<ThumbsUp data-icon="inline-start" aria-hidden />
			Me too
			<span
				className={cn(
					"text-2xs",
					active ? "text-primary-foreground/80" : "text-muted-foreground",
				)}
			>
				{count}
			</span>
		</Button>
	);
}

export function YourRequestTag({ count }: { count: number }) {
	return (
		<span className="inline-flex items-center gap-1.5 border border-border px-2 py-1 text-muted-foreground text-xs">
			Your request
			{count > 0 ? (
				<span className="text-foreground tabular-nums">
					· {count} {count === 1 ? "me too" : "me toos"}
				</span>
			) : null}
		</span>
	);
}

export function formatAuthors(authors: string[]) {
	return authors.length > 0 ? authors.join(", ") : "Unknown author";
}
