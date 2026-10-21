"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { MemberProfileReadCard } from "@/components/blocks/member-profile-read-card";
import {
	toUserReadsListCallInput,
	useUserReadsListingSearchParams,
} from "@/lib/listing/user-reads-listing";
import { orpc } from "@/utils/orpc";

const PAGE_LIMIT = 12;

function UserReadsFeedSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>
			{Array.from({ length: 4 }, (_, index) => (
				<Skeleton key={index} className="h-28 w-full" />
			))}
		</div>
	);
}

type UserReadsFeedProps = {
	username: string;
};

export function UserReadsFeed({ username }: UserReadsFeedProps) {
	const [params] = useUserReadsListingSearchParams();
	const listInput = useMemo(() => toUserReadsListCallInput(params), [params]);

	const {
		data,
		error,
		fetchNextPage,
		hasNextPage,
		isError,
		isFetchingNextPage,
		isPending,
		refetch,
	} = useInfiniteQuery(
		orpc.read.listForUser.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				username,
				...listInput,
				limit: PAGE_LIMIT,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const items = data?.pages.flatMap((page) => page.items) ?? [];
	const total = data?.pages[0]?.metadata.total;

	return (
		<div className="flex flex-col gap-4">
			{total != null ? (
				<p className="text-muted-foreground text-sm tabular-nums">
					{total} book{total === 1 ? "" : "s"} marked read
				</p>
			) : null}

			<InfiniteScroll
				className="flex flex-col gap-4"
				hasNextPage={hasNextPage}
				isFetchingNextPage={isFetchingNextPage}
				fetchNextPage={() => {
					void fetchNextPage();
				}}
				isPending={isPending}
				isError={isError}
				error={error}
				onRetry={() => {
					void refetch();
				}}
				isEmpty={items.length === 0}
				emptyTitle="No books match these filters"
				emptyDescription="Try clearing filters or search. When this member marks books as read, they appear here."
				loadingContent={<UserReadsFeedSkeleton />}
				endMessage="End of read list."
			>
				<ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{items.map((item) => (
						<li key={item.book.slug}>
							<MemberProfileReadCard item={item} />
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
