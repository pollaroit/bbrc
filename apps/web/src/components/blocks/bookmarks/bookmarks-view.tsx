"use client";

import type { ListSavedBookmarksOutput } from "@bbrc/api/modules/bookmark/bookmark.schema";
import {
	BOOKMARK_LIST_TYPES,
	BOOKMARK_SORT_FIELDS,
	type BookmarkListType,
	type ViewSourceName,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import type { Route } from "next";
import { CommentListItemView } from "@/components/blocks/comment-list-item";
import { PostCard } from "@/components/blocks/post-card";
import { RelativeTime } from "@/components/blocks/relative-time";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	type BookmarksListingState,
	bookmarkSortByLabels,
	bookmarksListInput,
	bookmarkTypeLabels,
	useBookmarksListingSearchParams,
} from "@/lib/listing/bookmarks-listing";
import { useViewCounts } from "@/lib/views/use-view-counts";
import { orpc } from "@/utils/orpc";

type BookmarksViewProps = {
	username: string;
	title?: string;
	description?: string;
	impressionSource?: ViewSourceName;
};

type SavedBookmarkItem = ListSavedBookmarksOutput["items"][number];

function BookmarksSkeleton() {
	return (
		<ul className="flex flex-col gap-4" aria-hidden>
			{Array.from({ length: 3 }, (_, index) => (
				<li key={index} className="flex flex-col gap-2">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-48 w-full" />
				</li>
			))}
		</ul>
	);
}

function SavedMetaBar({ item }: { item: SavedBookmarkItem }) {
	return (
		<div className="flex flex-wrap items-center gap-x-2 gap-y-1 border border-border border-b-0 bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
			<Bookmark className="size-3.5 shrink-0" aria-hidden />
			<span>
				Saved <RelativeTime date={item.bookmarkedAt} className="inline" />
			</span>
		</div>
	);
}

function commentThreadHref(
	comment: NonNullable<SavedBookmarkItem["comment"]>,
): Route | undefined {
	if (comment.postSlug) {
		return `/posts/${comment.postSlug}/comments/${comment.slug}` as Route;
	}
	if (comment.bookSlug && comment.feedbackSlug) {
		return `/books/${comment.bookSlug}/feedbacks/${comment.feedbackSlug}/comments/${comment.slug}` as Route;
	}
	return undefined;
}

function SavedBookmarkRow({
	item,
	impressionSource,
	viewCount,
}: {
	item: SavedBookmarkItem;
	impressionSource: ViewSourceName;
	viewCount?: number;
}) {
	if (item.unavailable) {
		return (
			<li className="flex flex-col">
				<SavedMetaBar item={item} />
				<div className="border border-border bg-muted/20 px-4 py-8">
					<p className="font-medium text-sm">No longer available</p>
					<p className="mt-1 text-muted-foreground text-sm">
						This {item.kind === "post" ? "post" : "comment"} was removed or you
						can no longer open it.
					</p>
				</div>
			</li>
		);
	}

	if (item.kind === "post" && item.post) {
		return (
			<li className="flex flex-col">
				<SavedMetaBar item={item} />
				<PostCard
					post={item.post}
					impressionSource={impressionSource}
					viewCount={viewCount}
					className="border-t-0"
				/>
			</li>
		);
	}

	if (item.kind === "comment" && item.comment) {
		const threadHref = commentThreadHref(item.comment);
		return (
			<li className="flex flex-col">
				<SavedMetaBar item={item} />
				<CommentListItemView
					comment={item.comment}
					variant="full"
					layout="card"
					threadHref={threadHref}
					showThreadLink={Boolean(threadHref)}
					postSlug={item.comment.postSlug ?? undefined}
					postAllowBookmarks={item.comment.postAllowBookmarks}
					bookSlug={item.comment.bookSlug ?? undefined}
					feedbackContextSlug={item.comment.feedbackSlug ?? undefined}
					canReply={false}
					className="border-t-0"
				/>
			</li>
		);
	}

	return null;
}

export function BookmarksView({
	username,
	title = "Bookmarks",
	description = "Posts and comments you saved for later.",
	impressionSource = "feed",
}: BookmarksViewProps) {
	const [params, setParams] = useBookmarksListingSearchParams();
	const listingState = params as BookmarksListingState;

	const query = useInfiniteQuery(
		orpc.bookmark.list.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (cursor) => bookmarksListInput(username, listingState, cursor),
		}),
	);

	const items = query.data?.pages.flatMap((page) => page.items) ?? [];
	const postSlugs = items.flatMap((item) =>
		item.post?.slug ? [item.post.slug] : [],
	);
	const viewCounts = useViewCounts("post", postSlugs);

	return (
		<div className="flex w-full flex-col gap-6">
			<header className="flex flex-col gap-2">
				<div className="flex items-center gap-2 text-muted-foreground">
					<Bookmark className="size-5" aria-hidden />
					<h1 className="font-heading font-semibold text-2xl text-foreground tracking-tight">
						{title}
					</h1>
				</div>
				<p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
					{description}
				</p>
			</header>

			<div className="flex flex-col gap-3 border border-border bg-card p-3">
				<Input
					value={params.search ?? ""}
					onChange={(event) => {
						void setParams({ search: event.target.value || null });
					}}
					placeholder="Search saved items"
					aria-label="Search bookmarks"
				/>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<SegmentedControl<BookmarkListType>
						label="Type"
						value={params.type}
						onChange={(type) => {
							void setParams({ type });
						}}
						options={BOOKMARK_LIST_TYPES.map((id) => ({
							id,
							label: bookmarkTypeLabels[id],
						}))}
					/>
					<ListingSort
						sortBy={params.sortBy}
						sortDirection={params.sortDirection}
						sortByOptions={BOOKMARK_SORT_FIELDS}
						sortByLabels={bookmarkSortByLabels}
						onSortByChange={(sortBy) => {
							void setParams({ sortBy });
						}}
						onSortDirectionChange={(sortDirection) => {
							void setParams({ sortDirection });
						}}
					/>
				</div>
			</div>

			<InfiniteScroll
				className="flex flex-col gap-4"
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
				isEmpty={items.length === 0}
				emptyTitle="Nothing saved yet"
				emptyDescription="Tap the bookmark icon on a post or comment to save it here."
				loadingContent={<BookmarksSkeleton />}
				endMessage="End of your bookmarks."
			>
				<ul className="flex flex-col gap-4">
					{items.map((item) => (
						<SavedBookmarkRow
							key={item.id}
							item={item}
							impressionSource={impressionSource}
							viewCount={
								item.post?.slug ? viewCounts[item.post.slug] : undefined
							}
						/>
					))}
				</ul>
			</InfiniteScroll>

			{query.isError ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => {
						void query.refetch();
					}}
				>
					Try again
				</Button>
			) : null}
		</div>
	);
}
