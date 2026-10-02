"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommentThreadList } from "@/components/blocks/comment-thread-list";
import { extractCommentSubtree } from "@/lib/build-comment-tree";
import { orpc } from "@/utils/orpc";

type FeedbackCommentFocusSectionProps = {
	feedbackSlug: string;
	bookSlug: string;
	focusCommentSlug: string;
};

const COMMENT_PAGE_SIZE = 100;

export function FeedbackCommentFocusSection({
	feedbackSlug,
	bookSlug,
	focusCommentSlug,
}: FeedbackCommentFocusSectionProps) {
	const router = useRouter();
	const [replyingToSlug, setReplyingToSlug] = useState<string | null>(null);

	const query = useInfiniteQuery(
		orpc.comment.getCommentList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				feedbackSlug,
				limit: COMMENT_PAGE_SIZE,
				sortBy: "createdAt",
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
	const loadingThread =
		query.isPending || query.isFetchingNextPage || query.hasNextPage;

	const refreshComments = () => {
		void query.refetch();
		router.refresh();
	};

	const focused =
		!loadingThread && comments.length > 0
			? extractCommentSubtree(comments, focusCommentSlug)
			: null;

	return (
		<section
			id="comments"
			aria-labelledby="feedback-comment-focus-heading"
			className="flex flex-col gap-4"
		>
			<h2 id="feedback-comment-focus-heading" className="font-semibold text-lg">
				Comment
			</h2>

			{loadingThread && comments.length === 0 ? (
				<Skeleton className="h-28 w-full" aria-hidden />
			) : query.isError ? (
				<p className="text-destructive text-sm">{query.error.message}</p>
			) : !focused ? (
				<p className="border border-border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
					This comment could not be found on this review.
				</p>
			) : (
				<div className="border border-border px-3 pt-4 pb-1 sm:px-4">
					<CommentThreadList
						comments={comments}
						bookSlug={bookSlug}
						feedbackContextSlug={feedbackSlug}
						focusRootSlug={focusCommentSlug}
						expandAllReplies
						replyingToSlug={replyingToSlug}
						onReply={setReplyingToSlug}
						onCancelReply={() => setReplyingToSlug(null)}
						onCommentCreated={refreshComments}
					/>
				</div>
			)}
		</section>
	);
}
