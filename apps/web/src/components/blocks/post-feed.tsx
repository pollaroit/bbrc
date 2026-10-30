"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FeedTabs } from "@/components/blocks/feed-tabs";
import { PostCard } from "@/components/blocks/post-card";
import { PostFeedToolbar } from "@/components/blocks/post-feed-toolbar";
import { authClient } from "@/lib/auth-client";
import {
	toPostFeedListInput,
	usePostFeedSearchParams,
} from "@/lib/listing/post-feed-listing";
import { useViewCounts } from "@/lib/views/use-view-counts";
import { orpc } from "@/utils/orpc";

const POST_FEED_LIMIT = 10;

function PostFeedSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-hidden>
			{Array.from({ length: 3 }, (_, index) => (
				<Skeleton key={index} className="h-48 w-full" />
			))}
		</div>
	);
}

type PostFeedProps = {
	/** When set, only posts by this member are shown. */
	authorUsername?: string;
	/** Club home feed: Hot / Top / Newest controls. */
	showFeedControls?: boolean;
	emptyTitle?: string;
	emptyDescription?: string;
	endMessage?: string;
};

export function PostFeed({
	authorUsername,
	showFeedControls = false,
	emptyTitle = "No posts yet",
	emptyDescription = "When members share updates, they will appear here.",
	endMessage = "You have reached the end of the feed.",
}: PostFeedProps = {}) {
	const [feedParams] = usePostFeedSearchParams();
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);
	// Signed-out visitors only ever get the "For You" feed.
	const friendsTab =
		showFeedControls && signedIn && feedParams.feed === "friends";
	const friendList = useQuery({
		...orpc.friend.list.queryOptions({ input: { limit: 1 } }),
		enabled: friendsTab,
	});
	const hasNoFriends = friendsTab && friendList.data?.count === 0;

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
				...(showFeedControls
					? toPostFeedListInput(
							{ ...feedParams, feed: friendsTab ? "friends" : "for-you" },
							pageCursor,
						)
					: {
							limit: POST_FEED_LIMIT,
							feedSort: "recent" as const,
							feedRange: "all" as const,
							...(pageCursor != null ? { cursor: pageCursor } : {}),
						}),
				...(authorUsername ? { authorUsername } : {}),
			}),
		}),
	);

	const posts = data?.pages.flatMap((page) => page.items) ?? [];
	const viewCounts = useViewCounts(
		"post",
		posts.map((post) => post.slug),
	);

	return (
		<div className="flex flex-col gap-4">
			{showFeedControls && signedIn ? <FeedTabs /> : null}
			{showFeedControls ? <PostFeedToolbar /> : null}

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
				emptyContent={
					friendsTab ? (
						<div className="border border-border border-dashed p-8 text-center">
							<p className="font-medium text-sm">No posts from friends yet</p>
							<p className="mt-1 text-muted-foreground text-sm">
								{hasNoFriends
									? "You have no friends here yet. Add some to see what they share."
									: "When your friends post, it will show up here."}
							</p>
							<Link
								href="/friends"
								className="mt-3 inline-block text-primary text-sm underline-offset-4 hover:underline"
							>
								Find friends
							</Link>
						</div>
					) : undefined
				}
				loadingContent={<PostFeedSkeleton />}
				endMessage={endMessage}
			>
				<ul className="flex flex-col gap-4">
					{posts.map((post) => (
						<li key={post.slug}>
							<PostCard
								post={post}
								impressionSource={authorUsername ? "profile" : "feed"}
								viewCount={viewCounts[post.slug]}
							/>
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
