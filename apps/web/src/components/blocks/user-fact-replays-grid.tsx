"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { parseAsInteger, useQueryState } from "nuqs";
import { FactCategoryBadge } from "@/components/blocks/fact-category-badge";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 24;

function replayViewerHref(username: string, factId: string) {
	return `/users/${username}/reels/${factId}` as Route;
}

function truncateBody(body: string, maxLength = 140) {
	if (body.length <= maxLength) {
		return body;
	}
	return `${body.slice(0, maxLength).trimEnd()}…`;
}

type UserFactReplaysGridProps = {
	username: string;
};

export function UserFactReplaysGrid({ username }: UserFactReplaysGridProps) {
	const [page, setPage] = useQueryState(
		"page",
		parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	);

	const listQuery = useQuery(
		orpc.fact.listUserSeenFacts.queryOptions({
			input: { username, page, limit: PAGE_SIZE },
		}),
	);

	if (listQuery.isPending) {
		return (
			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
				{Array.from({ length: 8 }, (_, index) => (
					<Skeleton key={index} className="aspect-[4/5] w-full" />
				))}
			</div>
		);
	}

	if (listQuery.isError) {
		return (
			<p className="text-destructive text-sm">{listQuery.error.message}</p>
		);
	}

	if (listQuery.data.items.length === 0) {
		return (
			<div className="border border-dashed px-6 py-12 text-center">
				<p className="font-medium text-sm">No replays yet</p>
				<p className="mt-1 text-muted-foreground text-sm">
					Facts show up here after they appear in the main reels feed.
				</p>
				<Button
					nativeButton={false}
					render={<Link href={"/reels" as Route} />}
					variant="outline"
					className="mt-4"
				>
					Open reels
				</Button>
			</div>
		);
	}

	const { metadata } = listQuery.data;

	return (
		<div className="flex flex-col gap-6">
			<p className="text-muted-foreground text-sm">
				Tap a card to open the full-screen reel and scroll through replays.
			</p>

			<ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
				{listQuery.data.items.map((item) => (
					<li key={item.id}>
						<Link
							href={replayViewerHref(username, item.id)}
							className="group flex aspect-[4/5] flex-col overflow-hidden border border-border bg-muted/20 transition-colors hover:bg-muted/40"
						>
							<div className="relative min-h-0 flex-1 bg-muted/40">
								{item.image ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={item.image}
										alt=""
										className="size-full object-cover object-center"
									/>
								) : (
									<div className="flex size-full items-center p-3">
										<p className="line-clamp-6 font-serif text-sm leading-snug">
											{truncateBody(item.body, 180)}
										</p>
									</div>
								)}
							</div>
							<div className="flex flex-col gap-2 border-border border-t p-3">
								<div className="flex items-center justify-between gap-2">
									<FactCategoryBadge category={item.category} />
									{item.viewerVote === "up" ? (
										<ThumbsUp
											className="size-4 shrink-0 text-muted-foreground"
											aria-label="You upvoted"
										/>
									) : item.viewerVote === "down" ? (
										<ThumbsDown
											className="size-4 shrink-0 text-muted-foreground"
											aria-label="You downvoted"
										/>
									) : null}
								</div>
								{item.image ? (
									<p className="line-clamp-3 font-serif text-sm leading-snug">
										{truncateBody(item.body)}
									</p>
								) : null}
							</div>
						</Link>
					</li>
				))}
			</ul>

			{metadata.totalPages > 1 ? (
				<div className="flex items-center justify-between gap-2 border border-border px-4 py-3">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => void setPage(page - 1)}
					>
						Previous
					</Button>
					<span className="text-muted-foreground text-sm tabular-nums">
						Page {page} of {metadata.totalPages}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={!metadata.hasNextPage}
						onClick={() => void setPage(page + 1)}
					>
						Next
					</Button>
				</div>
			) : null}
		</div>
	);
}
