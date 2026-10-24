"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CommentThreadList } from "@/components/blocks/comment-thread-list";
import { PostCommentForm } from "@/components/blocks/post-comment-form";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { orpc } from "@/utils/orpc";

type PostCommentsSectionProps = {
	postSlug: string;
	/** False when the author turned comments off: the thread stays readable, the form goes. */
	allowComments?: boolean;
};

const SORTS = [
	{ id: "createdAt", label: "Newest" },
	{ id: "likes._count", label: "Top" },
] as const;
type CommentSort = (typeof SORTS)[number]["id"];

/** Max allowed by `CursorPaginationInputSchema` — fetch additional pages for full thread. */
const COMMENT_PAGE_SIZE = 100;

function CommentsListSkeleton() {
	return (
		<div className="flex flex-col gap-3" aria-hidden>
			{Array.from({ length: 3 }, (_, index) => (
				<Skeleton key={index} className="h-28 w-full" />
			))}
		</div>
	);
}

export function PostCommentsSection({
	postSlug,
	allowComments = true,
}: PostCommentsSectionProps) {
	const [replyingToSlug, setReplyingToSlug] = useState<string | null>(null);
	const [sort, setSort] = useState<CommentSort>("createdAt");

	const query = useInfiniteQuery(
		orpc.comment.getCommentList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				postSlug,
				limit: COMMENT_PAGE_SIZE,
				sortBy: sort,
				sortDirection: "desc",
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	useEffect(() => {
		if (query.hasNextPage && !query.isFetchingNextPage && !query.isPending) {
			void query.fetchNextPage();
		}
	}, [
		query.data,
		query.fetchNextPage,
		query.hasNextPage,
		query.isFetchingNextPage,
		query.isPending,
	]);

	const comments = query.data?.pages.flatMap((page) => page.items) ?? [];
	const commentCount = comments.length;
	const loadingThread =
		query.isPending || query.isFetchingNextPage || query.hasNextPage;

	const refreshComments = () => {
		void query.refetch();
	};

	return (
		<section
			id="comments"
			aria-labelledby="post-comments-heading"
			className="flex scroll-mt-20 flex-col gap-5"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2
					id="post-comments-heading"
					className="flex items-baseline gap-2 font-semibold text-lg"
				>
					Comments
					{commentCount > 0 && !loadingThread ? (
						<span className="font-normal text-muted-foreground text-sm tabular-nums">
							{commentCount}
						</span>
					) : null}
				</h2>
				{commentCount > 1 ? (
					<SegmentedControl<CommentSort>
						label="Sort comments"
						value={sort}
						onChange={setSort}
						options={SORTS}
					/>
				) : null}
			</div>

			{allowComments ? (
				<div className="border border-border bg-muted/20 px-4 py-4">
					<PostCommentForm
						postSlug={postSlug}
						onCommentCreated={() => {
							setReplyingToSlug(null);
							refreshComments();
						}}
					/>
				</div>
			) : (
				<p className="border border-border border-dashed px-4 py-3 text-muted-foreground text-sm">
					The author turned comments off for this post.
				</p>
			)}

			{loadingThread && comments.length === 0 ? (
				<CommentsListSkeleton />
			) : query.isError ? (
				<p className="text-destructive text-sm">{query.error.message}</p>
			) : comments.length === 0 ? (
				<p className="border border-border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
					{allowComments
						? "No comments yet. Be the first to reply above."
						: "No comments."}
				</p>
			) : (
				<div className="border border-border px-3 pt-4 pb-1 sm:px-4">
					<CommentThreadList
						comments={comments}
						postSlug={postSlug}
						replyingToSlug={replyingToSlug}
						onReply={setReplyingToSlug}
						onCancelReply={() => setReplyingToSlug(null)}
						onCommentCreated={refreshComments}
						allowReplies={allowComments}
					/>
					{loadingThread ? (
						<p className="border-border border-t py-3 text-center text-muted-foreground text-xs">
							Loading more comments…
						</p>
					) : null}
				</div>
			)}
		</section>
	);
}
