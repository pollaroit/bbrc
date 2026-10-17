"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FeedbackListSort } from "@/components/blocks/feedback-list-sort";
import { UserFeedbackCard } from "@/components/blocks/user-feedback-card";
import { authClient } from "@/lib/auth-client";
import {
	feedbackListParamsToQuery,
	useFeedbackListSearchParams,
} from "@/lib/feedback/feedback-list-search-params";
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
	const { data: session } = authClient.useSession();
	const isOwnProfile = session?.user.username === username;

	const [searchParams, setSearchParams] = useFeedbackListSearchParams();
	const { sortBy, sortDirection } = feedbackListParamsToQuery({
		feedbackMinRating: searchParams.feedbackMinRating,
		sortBy: searchParams.sortBy,
		sortDirection: searchParams.sortDirection,
	});

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
				sortBy,
				sortDirection,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const items = data?.pages.flatMap((page) => page.items) ?? [];

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-end gap-2 border border-border bg-muted/15 p-3">
				<FeedbackListSort
					sortBy={sortBy}
					sortDirection={sortDirection}
					onSortByChange={(value) => setSearchParams({ sortBy: value })}
					onSortDirectionChange={(value) =>
						setSearchParams({ sortDirection: value })
					}
				/>
			</div>
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
						<li key={item.slug}>
							<UserFeedbackCard item={item} showEdit={isOwnProfile} />
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
