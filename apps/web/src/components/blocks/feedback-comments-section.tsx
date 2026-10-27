"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CommentThreadList } from "@/components/blocks/comment-thread-list";
import { PostCommentForm } from "@/components/blocks/post-comment-form";
import { orpc } from "@/utils/orpc";

type FeedbackCommentsSectionProps = {
	feedbackSlug: string;
	bookSlug: string;
};

const COMMENT_PAGE_SIZE = 100;

export function FeedbackCommentsSection({
	feedbackSlug,
	bookSlug,
}: FeedbackCommentsSectionProps) {
	const t = useTranslations("books");
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
	};

	return (
		<section
			id="comments"
			aria-labelledby="feedback-comments-heading"
			className="flex flex-col gap-5"
		>
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 id="feedback-comments-heading" className="font-semibold text-lg">
					{t("feedback.discussion")}
				</h2>
				{comments.length > 0 && !loadingThread ? (
					<p className="text-muted-foreground text-sm tabular-nums">
						{t("feedback.commentCount", { count: comments.length })}
					</p>
				) : null}
			</div>

			<div className="border border-border bg-muted/20 px-4 py-4">
				<PostCommentForm
					feedbackSlug={feedbackSlug}
					onCommentCreated={refreshComments}
				/>
			</div>

			{loadingThread && comments.length === 0 ? (
				<Skeleton className="h-28 w-full" aria-hidden />
			) : query.isError ? (
				<p className="text-destructive text-sm">{query.error.message}</p>
			) : comments.length === 0 ? (
				<p className="border border-border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
					{t("feedback.noComments")}
				</p>
			) : (
				<div className="border border-border px-3 pt-4 pb-1 sm:px-4">
					<CommentThreadList
						comments={comments}
						bookSlug={bookSlug}
						feedbackContextSlug={feedbackSlug}
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
