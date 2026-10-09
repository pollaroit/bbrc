"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { UserMemberReadCard } from "@/components/blocks/user-member-read-card";
import { orpc } from "@/utils/orpc";

const PAGE_LIMIT = 12;

function UserReadsFeedSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-hidden>
			{Array.from({ length: 4 }, (_, index) => (
				<Skeleton key={index} className="h-36 w-full" />
			))}
		</div>
	);
}

type UserReadsFeedProps = {
	username: string;
};

export function UserReadsFeed({ username }: UserReadsFeedProps) {
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
			emptyTitle="No books marked read yet"
			emptyDescription="When this member marks books as read, they appear here with dates and editions."
			loadingContent={<UserReadsFeedSkeleton />}
			endMessage="End of read list."
		>
			<ul className="flex flex-col gap-4">
				{items.map((item) => (
					<li key={item.book.slug}>
						<UserMemberReadCard item={item} />
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
