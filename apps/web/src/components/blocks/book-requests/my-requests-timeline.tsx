"use client";

/**
 * `MyRequestsTimeline({ className? })`
 * The signed-in member's own requests as a status timeline: Pending (with the
 * "me too" count), Added (with the admin's note and a link to the book) or
 * Declined (with the reason).
 */

import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { formatAuthors } from "@/components/blocks/book-requests/request-shared";
import { RelativeTime } from "@/components/blocks/relative-time";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const STATUS = {
	pending: {
		label: "Waiting for an admin",
		Icon: Clock,
		dot: "bg-warning/15 text-warning-ink border-warning/40",
	},
	accepted: {
		label: "Added to the library",
		Icon: Check,
		dot: "bg-success/15 text-success-ink border-success/40",
	},
	rejected: {
		label: "Declined",
		Icon: X,
		dot: "bg-destructive/10 text-destructive border-destructive/40",
	},
} as const;

export function MyRequestsTimeline({ className }: { className?: string }) {
	const { data, isPending, isError } = useQuery(
		orpc.bookRequest.listMine.queryOptions(),
	);

	if (isPending) {
		return (
			<div className={cn("flex flex-col gap-3", className)} aria-hidden>
				{Array.from({ length: 2 }, (_, index) => (
					<Skeleton key={index} className="h-16 w-full" />
				))}
			</div>
		);
	}
	if (isError) {
		return (
			<p className={cn("text-destructive text-sm", className)}>
				Could not load your requests.
			</p>
		);
	}
	if (data.items.length === 0) {
		return (
			<p className={cn("text-muted-foreground text-sm", className)}>
				You have not requested a book yet. Your requests and what happened to
				them will appear here.
			</p>
		);
	}

	return (
		<ol className={cn("relative flex flex-col gap-4", className)}>
			{data.items.map((item, index) => {
				const status = STATUS[item.status];
				const last = index === data.items.length - 1;
				return (
					<li key={item.id} className="relative flex gap-3">
						{!last ? (
							<span
								className="absolute start-3 top-7 -bottom-4 w-px bg-border"
								aria-hidden
							/>
						) : null}
						<span
							className={cn(
								"relative z-1 flex size-6 shrink-0 items-center justify-center border",
								status.dot,
							)}
						>
							<status.Icon className="size-3.5" aria-hidden />
						</span>
						<div className="flex min-w-0 flex-1 flex-col gap-1 pb-1">
							<p className="font-medium text-sm leading-snug">{item.title}</p>
							<p className="text-muted-foreground text-xs">
								{formatAuthors(item.authors)} ·{" "}
								<RelativeTime date={item.createdAt} />
							</p>
							<p className="text-sm">
								{status.label}
								{item.status === "pending" && item.upvoteCount > 0
									? ` · ${item.upvoteCount} ${item.upvoteCount === 1 ? "member says" : "members say"} me too`
									: ""}
							</p>
							{item.note ? (
								<p className="text-muted-foreground text-xs">
									Your note: “{item.note}”
								</p>
							) : null}
							{item.status === "accepted" ? (
								<>
									{item.acceptanceNotes ? (
										<p className="border-border border-s-2 ps-2 text-sm leading-snug">
											{item.acceptanceNotes}
										</p>
									) : null}
									{item.bookSlug ? (
										<Link
											href={`/books/${item.bookSlug}` as Route}
											className="w-fit text-sm underline underline-offset-4"
										>
											Open the book
										</Link>
									) : null}
								</>
							) : null}
							{item.status === "rejected" && item.rejectionReason ? (
								<p className="border-destructive/40 border-s-2 ps-2 text-sm leading-snug">
									{item.rejectionReason}
								</p>
							) : null}
						</div>
					</li>
				);
			})}
		</ol>
	);
}
