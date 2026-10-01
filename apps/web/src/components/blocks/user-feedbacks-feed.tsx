"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { UserFeedbackCard } from "@/components/blocks/user-feedback-card";
import { orpc } from "@/utils/orpc";

const PAGE_LIMIT = 10;

function UserFeedbacksFeedSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-hidden>
			{Array.from({ length: 3 }, (_, index) => (
				<Skeleton key={index} className="h-36 w-full" />
			))}
		</div>
	);
}

type UserFeedbacksFeedProps = {
	username: string;
};

export function UserFeedbacksFeed({ username }: UserFeedbacksFeedProps) {
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
		orpc.feedback.getUserFeedbackList.infiniteOptions({
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
			emptyTitle="No feedback yet"
			emptyDescription="Book reviews from this member will appear here."
			loadingContent={<UserFeedbacksFeedSkeleton />}
			endMessage="End of feedback list."
		>
			<ul className="flex flex-col gap-4">
				{items.map((item) => (
					<li key={item.id}>
						<UserFeedbackCard item={item} />
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
