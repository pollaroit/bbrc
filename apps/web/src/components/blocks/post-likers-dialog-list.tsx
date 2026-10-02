"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { UserPanel } from "@/components/blocks/user-panel";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc } from "@/utils/orpc";

type PostLikersDialogListProps = {
	postSlug: string;
	enabled: boolean;
};

export function PostLikersDialogList({
	postSlug,
	enabled,
}: PostLikersDialogListProps) {
	const query = useInfiniteQuery({
		...orpc.like.getLikeList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				postSlug,
				limit: 20,
				sortBy: "createdAt",
				sortDirection: "desc",
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
		enabled,
	});

	const likers = query.data?.pages.flatMap((page) => page.items) ?? [];

	return (
		<InfiniteScroll
			className="flex flex-col gap-2"
			hasNextPage={query.hasNextPage}
			isFetchingNextPage={query.isFetchingNextPage}
			fetchNextPage={() => {
				void query.fetchNextPage();
			}}
			isPending={query.isPending}
			isError={query.isError}
			error={query.error}
			onRetry={() => {
				void query.refetch();
			}}
			isEmpty={likers.length === 0}
			emptyTitle="No likes yet"
			emptyDescription="Be the first to like this post."
			loadingContent={
				<div className="flex flex-col gap-2" aria-hidden>
					{Array.from({ length: 4 }, (_, index) => (
						<Skeleton key={index} className="h-12 w-full" />
					))}
				</div>
			}
			endMessage="End of list."
		>
			<ul className="flex flex-col gap-2">
				{likers.map((entry) => (
					<li key={`${entry.user.username}-${entry.likedAt.toString()}`}>
						<Link
							href={`/users/${entry.user.username}` as Route}
							className="flex items-center justify-between gap-3 border px-3 py-2 transition-colors hover:bg-muted/40"
						>
							<UserPanel user={entry.user} className="min-w-0" />
							<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
								{formatDateTime(entry.likedAt)}
							</span>
						</Link>
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
