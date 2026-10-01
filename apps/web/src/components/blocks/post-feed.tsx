"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { PostCard } from "@/components/blocks/post-card";
import { orpc } from "@/utils/orpc";

const POST_FEED_LIMIT = 10;

function PostFeedSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-hidden>
			{Array.from({ length: 3 }, (_, index) => (
				<Skeleton key={index} className="h-48 w-full rounded-xl" />
			))}
		</div>
	);
}

type PostFeedProps = {
	/** When set, only posts by this member are shown. */
	authorUsername?: string;
	emptyTitle?: string;
	emptyDescription?: string;
	endMessage?: string;
};

export function PostFeed({
	authorUsername,
	emptyTitle = "No posts yet",
	emptyDescription = "When members share updates, they will appear here.",
	endMessage = "You have reached the end of the feed.",
}: PostFeedProps = {}) {
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
		orpc.post.getPostList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				limit: POST_FEED_LIMIT,
				sortBy: "createdAt",
				sortDirection: "desc",
				...(authorUsername ? { authorUsername } : {}),
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const posts = data?.pages.flatMap((page) => page.items) ?? [];

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
			isEmpty={posts.length === 0}
			emptyTitle={emptyTitle}
			emptyDescription={emptyDescription}
			loadingContent={<PostFeedSkeleton />}
			endMessage={endMessage}
		>
			<ul className="flex flex-col gap-4">
				{posts.map((post) => (
					<li key={post.slug}>
						<PostCard post={post} />
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
