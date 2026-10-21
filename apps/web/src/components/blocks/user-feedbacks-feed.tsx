"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { MemberProfileFeedbackCard } from "@/components/blocks/member-profile-feedback-card";
import { authClient } from "@/lib/auth-client";
import {
	hasActiveUserFeedbackFilters,
	toUserFeedbackListCallInput,
	useUserFeedbackListingSearchParams,
} from "@/lib/listing/user-feedbacks-listing";
import { orpc } from "@/utils/orpc";

function UserFeedbacksFeedSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>
			{Array.from({ length: 4 }, (_, index) => (
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

	const [params] = useUserFeedbackListingSearchParams();
	const listInput = useMemo(
		() => toUserFeedbackListCallInput(params),
		[params],
	);
	const filtered = hasActiveUserFeedbackFilters(params);

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
				...listInput,
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
					{total} review{total === 1 ? "" : "s"}
					{filtered ? " match your filters" : ""}
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
				emptyTitle={
					filtered ? "No reviews match these filters" : "No reviews yet"
				}
				emptyDescription={
					filtered
						? "Try clearing filters or changing your search."
						: "Book reviews from this member will appear here."
				}
				loadingContent={<UserFeedbacksFeedSkeleton />}
				endMessage="End of reviews."
			>
				<ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{items.map((item) => (
						<li key={item.slug}>
							<MemberProfileFeedbackCard item={item} showEdit={isOwnProfile} />
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
