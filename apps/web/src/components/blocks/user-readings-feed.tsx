"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { UserReadingCard } from "@/components/blocks/user-reading-card";
import { orpc } from "@/utils/orpc";

const PAGE_LIMIT = 10;

function UserReadingsFeedSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-hidden>
			{Array.from({ length: 3 }, (_, index) => (
				<Skeleton key={index} className="h-40 w-full rounded-xl" />
			))}
		</div>
	);
}

type UserReadingsFeedProps = {
	username: string;
};

export function UserReadingsFeed({ username }: UserReadingsFeedProps) {
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
		orpc.user.getUserParticipationList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				username,
				limit: PAGE_LIMIT,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const items = data?.pages.flatMap((page) => page.items) ?? [];

	return (
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
			emptyTitle="No readings yet"
			emptyDescription="When this member joins sittings, they will show up here."
			loadingContent={<UserReadingsFeedSkeleton />}
			endMessage="End of reading history."
		>
			<ul className="flex flex-col gap-4">
				{items.map((item) => (
					<li key={item.id}>
						<UserReadingCard item={item} />
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
